import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startSite, axeCheck } from "./harness.mjs";

let site;
before(async () => (site = await startSite()));
after(() => site?.close());

describe("hub", { concurrency: true }, () => {
  test("loads, links to both games and stays quiet in the console", async () => {
    // animated, as a real first visit is: axe still has to pass afterwards
    const { context, page, problems } = await site.newPage({
      reducedMotion: "no-preference",
    });
    await page.goto(site.home);
    await page.waitForSelector(".tile");

    assert.match(await page.locator("h1").innerText(), /Amber Sea/i);
    assert.match(await page.locator("h1").innerText(), /two voyages/i);
    assert.equal(await page.locator(".tile").count(), 2);
    assert.equal(await page.locator(".shell-nav a").count(), 2);
    assert.equal(await page.locator(".lang").count(), 1, "language switch lives on the hub");

    await axeCheck(page, "hub");
    assert.deepEqual(problems, []);
    await context.close();
  });

  test("nothing inside a tile overlaps anything else", async () => {
    const { context, page } = await site.newPage();
    for (const width of [320, 430, 900]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(site.home);
      await page.waitForSelector(".tile-go");
      const clashes = await page.evaluate(() =>
        [...document.querySelectorAll(".tile")].flatMap((tile) => {
          const parts = [...tile.querySelectorAll("h2, p, .tile-go")].map((el) => ({
            text: el.textContent.trim().slice(0, 20),
            box: el.getBoundingClientRect(),
          }));
          const bad = [];
          for (let i = 0; i < parts.length - 1; i++)
            if (parts[i].box.bottom > parts[i + 1].box.top + 1)
              bad.push(`"${parts[i].text}" overlaps "${parts[i + 1].text}"`);
          return bad;
        }),
      );
      assert.deepEqual(clashes, [], `overlap at ${width}px`);
    }
    await context.close();
  });

  test("language choice persists into a game page", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.home);
    await page.getByRole("button", { name: "Spanish" }).click();
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.match(await page.locator("h1").innerText(), /Mar de Ámbar/);

    await page.goto(site.compass);
    await page.waitForSelector("#start");
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.equal(await page.locator("#start").innerText(), "Zarpar");
    assert.equal(await page.locator(".lang").count(), 0, "no language switch inside a game");
    await context.close();
  });

  test("haptics switch toggles and persists", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.home);
    const toggle = page.locator("#haptics");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-checked"), "false");
    await page.reload();
    assert.equal(await page.locator("#haptics").getAttribute("aria-checked"), "false");
    await context.close();
  });
});
