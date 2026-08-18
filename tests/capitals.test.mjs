/* The capital marker: right city, right place, only after the answer. */

import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { geoBounds } from "d3-geo";
import { startSite } from "./harness.mjs";
import { answerCorrectly } from "./atlas-helpers.mjs";
import { COUNTRIES, BY_A2 } from "../src/atlas/countries.js";
import { CAPITALS } from "../src/atlas/capitals.js";
import { decodeTopology, toFeature, dms } from "../src/atlas/geo.js";

let site;
before(async () => (site = await startSite()));
after(() => site?.close());

describe("capitals", { concurrency: true }, () => {
  test("every country has one, and it lands inside the country's own bounds", async () => {
    const topo = JSON.parse(
      await readFile(new URL("../public/data/countries-50m.json", import.meta.url), "utf8"),
    );
    const shapes = decodeTopology(topo);

    const missing = COUNTRIES.filter((c) => !CAPITALS[c.a2]).map((c) => c.a2);
    assert.deepEqual(missing, [], "countries with no capital coordinates");

    const strays = [];
    for (const country of COUNTRIES) {
      const polygons = shapes.get(country.n3);
      if (!polygons) continue; // a few microstates have no outline at 50m
      const [[west, south], [east, north]] = geoBounds(toFeature(polygons, country.a2));
      const [lon, lat] = CAPITALS[country.a2];
      const wraps = west > east; // crosses the antimeridian
      const inLon = wraps ? lon >= west - 1 || lon <= east + 1 : lon >= west - 1 && lon <= east + 1;
      if (!inLon || lat < south - 1 || lat > north + 1)
        strays.push(`${country.a2} ${country.cap.en} [${lon}, ${lat}] outside ${[west, south, east, north].map(Math.round)}`);
    }
    assert.deepEqual(strays, [], "capitals that do not sit in their country");
  });

  test("the marker shows the answer's capital, and only once answered", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.atlas);
    await page.getByRole("button", { name: "Start round" }).waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Start round" }).click();

    for (let question = 0; question < 4; question++) {
      await page.waitForSelector(".opt:not([disabled])");
      assert.equal(await page.locator(".capital").count(), 0, "no capital before the answer");

      await answerCorrectly(page, "en");
      await page.waitForSelector(".actions .btn");

      const marked = await page.evaluate(() => ({
        label: document.querySelector(".capital-name").textContent,
        code: document.querySelectorAll(".readout span")[1].textContent.trim(),
        readout: document.querySelector(".readout span").textContent.trim(),
        dot: {
          x: Number(document.querySelector(".capital-dot").getAttribute("cx")),
          y: Number(document.querySelector(".capital-dot").getAttribute("cy")),
        },
        chart: {
          width: document.querySelector(".chart-card svg").viewBox.baseVal.width,
          height: document.querySelector(".chart-card svg").viewBox.baseVal.height,
        },
      }));

      const country = BY_A2.get(marked.code);
      assert.ok(country, `unknown country code on the chart: ${marked.code}`);
      assert.equal(marked.label, country.cap.en, "the marker names the capital");
      assert.equal(
        marked.readout,
        dms(CAPITALS[country.a2]),
        "the readout gives the capital's own position",
      );
      assert.ok(
        marked.dot.x > 0 &&
          marked.dot.x < marked.chart.width &&
          marked.dot.y > 0 &&
          marked.dot.y < marked.chart.height,
        "the marker must be inside the chart",
      );

      await page.locator(".actions .btn").click();
    }
    await context.close();
  });
});
