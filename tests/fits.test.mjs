/* The question a child is answering should be on screen in one piece.
   Measured on an iPhone 13 (390x664), in both languages, with the longest
   country and capital names in the data set. */

import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { devices } from "playwright";
import { startSite, COMPASS_ANSWERS } from "./harness.mjs";
import { answerCorrectly } from "./atlas-helpers.mjs";
import { COUNTRIES } from "../src/atlas/countries.js";

let site;
before(async () => (site = await startSite()));
after(() => site?.close());

const phone = devices["iPhone 13"];

const overflow = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollHeight - doc.clientHeight;
  });

const longest = (lang, key) =>
  COUNTRIES.map((c) => c[key][lang]).sort((a, b) => b.length - a.length)[0];

describe("fits on a phone screen", { concurrency: true }, () => {
  for (const lang of ["en", "es"]) {
    test(`both games are one screen deep in ${lang}`, async () => {
      const { context, page } = await site.newPage(phone);
      await page.goto(site.home);
      await page.evaluate((value) => localStorage.setItem("edu:lang", JSON.stringify(value)), lang);

      await page.goto(site.compass);
      await page.click("#start");
      for (let stop = 1; stop <= 15; stop++) {
        await page.waitForSelector(".opt:not([disabled])");
        assert.equal(await overflow(page), 0, `[${lang}] compass stop ${stop} question scrolls`);
        await page.locator(`.opt[data-value="${COMPASS_ANSWERS[stop - 1]}"]`).click();
        await page.waitForSelector(".note--win");
        assert.equal(await overflow(page), 0, `[${lang}] compass stop ${stop} answered scrolls`);
        await page.click("#next");
      }

      await page.goto(site.atlas);
      const start = page.getByRole("button", {
        name: lang === "en" ? "Start round" : "Empezar ronda",
      });
      await start.waitFor({ timeout: 20_000 });
      await start.click();

      const name = longest(lang, "name");
      const capital = longest(lang, "cap");
      const seen = new Set();
      for (let q = 1; q <= 6; q++) {
        await page.waitForSelector(".opt:not([disabled])");
        const mode = await page.evaluate(() =>
          document.querySelector(".opts").classList.contains("opts--flags")
            ? "flag"
            : document.getElementById("ask").getAttribute("aria-label")
              ? "country"
              : "capital",
        );
        seen.add(mode);
        assert.equal(await overflow(page), 0, `[${lang}] atlas ${mode} question scrolls`);

        // the same layout carrying the longest strings in the data set
        await page.evaluate(
          ([longName, longCap]) => {
            const ask = document.querySelector("#ask");
            if (ask.tagName === "STRONG") {
              ask.dataset.real = ask.textContent;
              ask.textContent = longName;
            }
            for (const option of document.querySelectorAll(".opt-text")) {
              option.dataset.real = option.textContent;
              option.textContent = longCap;
            }
          },
          [name, capital],
        );
        assert.equal(
          await overflow(page),
          0,
          `[${lang}] atlas ${mode} question scrolls with the longest names`,
        );
        await page.evaluate(() => {
          const ask = document.querySelector("#ask");
          if (ask.dataset.real) ask.textContent = ask.dataset.real;
          for (const option of document.querySelectorAll(".opt-text"))
            option.textContent = option.dataset.real;
        });

        await answerCorrectly(page, lang);
        await page.waitForSelector(".actions .btn");
        assert.equal(await overflow(page), 0, `[${lang}] atlas ${mode} answered scrolls`);
        await page.locator(".actions .btn").click();
      }
      assert.equal(seen.size, 3, "the mixed round should have shown all three question types");
      await context.close();
    });
  }

  test("answering does not move the answers", async () => {
    // The question holds a skeleton for whatever it is hiding, so the
    // reveal fills the blanks in rather than pushing the page around.
    const { context, page } = await site.newPage(phone);
    await page.goto(site.atlas);
    await page.getByRole("button", { name: "Start round" }).waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Start round" }).click();

    const seen = new Set();
    const top = () =>
      page.evaluate(() => Math.round(document.querySelector(".opts").getBoundingClientRect().top));

    for (let question = 0; question < 6 && seen.size < 3; question++) {
      await page.waitForSelector(".opt:not([disabled])");
      const mode = await page.evaluate(() =>
        document.querySelector(".opts").classList.contains("opts--flags")
          ? "flag"
          : document.getElementById("ask")?.getAttribute("aria-label")
            ? "country"
            : "capital",
      );
      seen.add(mode);
      const before = await top();
      await answerCorrectly(page, "en");
      await page.waitForSelector(".actions .btn");
      assert.equal(await top(), before, `answering a ${mode} question moved the answers`);
      await page.locator(".actions .btn").click();
    }
    assert.equal(seen.size, 3, "all three question types should have been checked");
    await context.close();
  });

  test("both games are reachable without scrolling the hub", async () => {
    const { context, page } = await site.newPage(phone);
    await page.goto(site.home);
    await page.waitForSelector(".tile-go");
    const belowFold = await page.evaluate(() =>
      [...document.querySelectorAll(".tile")]
        .filter((tile) => tile.getBoundingClientRect().bottom > innerHeight)
        .map((tile) => tile.querySelector("h2").textContent),
    );
    assert.deepEqual(belowFold, []);
    await context.close();
  });

  test("the action bar stays pinned when a screen does overflow", async () => {
    // Half-height viewport: the content cannot fit, so the bar has to stick.
    const { context, page } = await site.newPage({
      ...phone,
      viewport: { width: 390, height: 380 },
    });
    await page.goto(site.compass);
    await page.click("#start");
    await page.waitForSelector(".opt");

    const pinned = async () =>
      page.evaluate(() => {
        const bar = document.querySelector(".actions").getBoundingClientRect();
        return Math.round(innerHeight - bar.bottom);
      });

    assert.ok(Math.abs(await pinned()) <= 1, "the bar should sit on the bottom edge");
    await page.evaluate(() => scrollTo(0, 200));
    assert.ok(Math.abs(await pinned()) <= 1, "and stay there while the page scrolls");
    assert.ok(await page.locator("#hint").isVisible());
    await context.close();
  });
});
