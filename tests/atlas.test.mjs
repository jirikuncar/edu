import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startSite, axeCheck } from "./harness.mjs";
import { playRound } from "./atlas-helpers.mjs";

let site;
before(async () => (site = await startSite()));
after(() => site?.close());

const ready = (page) => page.getByRole("button", { name: "Start round" });

describe("atlas drill", { concurrency: true }, () => {
  test("loads the local map, plays a round and stores progress", async () => {
    const { context, page, problems } = await site.newPage();
    await page.goto(site.atlas);

    await ready(page).waitFor({ timeout: 20_000 });
    assert.equal(await ready(page).isDisabled(), false, "map data must load from the local copy");

    await ready(page).click();
    await page.waitForSelector(".chart-card svg .land");
    assert.match(await page.locator("#shell-track").getAttribute("aria-label"), /question 1 of 12/i);
    assert.equal(await page.locator(".tabs").count(), 0, "no view tabs mid-round");

    await playRound(page, 12);
    assert.equal(await page.locator("#shell-count").innerText(), "12/12");
    await page.locator(".actions .btn").click();

    await page.waitForSelector(".final-score");
    assert.equal(await page.locator(".log li").count(), 12);
    assert.ok(Number(await page.locator(".final-score").innerText()) > 0, "a perfect round should score");

    const stats = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("edu:atlas:stats") ?? "{}"),
    );
    assert.equal(Object.keys(stats).length, 12, "twelve different countries in a round");
    const board = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("edu:atlas:board") ?? "{}"),
    );
    assert.equal(Object.values(board)[0]?.length, 1, "the round should reach the board");

    await axeCheck(page, "atlas summary");
    assert.deepEqual(problems, []);
    await context.close();
  });

  test("one answer counts once", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.atlas);
    await ready(page).waitFor({ timeout: 20_000 });
    await ready(page).click();
    await page.waitForSelector(".opt");

    await page.locator(".opt").first().click();
    await page.waitForSelector(".actions .btn");
    assert.equal(await page.locator("#shell-count").innerText(), "1/12");
    assert.equal(await page.locator(".log li").count(), 0);
    await context.close();
  });

  test("home, progress and board screens pass axe in both languages", async () => {
    const { context, page } = await site.newPage();
    for (const lang of ["en", "es"]) {
      await page.goto(site.atlas);
      await page.evaluate((value) => localStorage.setItem("edu:lang", JSON.stringify(value)), lang);
      await page.reload();
      await page
        .getByRole("button", { name: lang === "en" ? "Start round" : "Empezar ronda" })
        .waitFor({ timeout: 20_000 });
      await axeCheck(page, `atlas home (${lang})`);

      await page.locator(".tabs button").nth(1).click();
      await page.waitForSelector(".progress-card");
      await axeCheck(page, `atlas progress (${lang})`);

      await page.locator(".tabs button").nth(2).click();
      await page.waitForSelector(".board, .note");
      await axeCheck(page, `atlas board (${lang})`);
    }
    await context.close();
  });

  test("a spanish round asks in spanish", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.atlas);
    await page.evaluate(() => {
      localStorage.setItem("edu:lang", JSON.stringify("es"));
      localStorage.setItem(
        "edu:atlas:prefs",
        JSON.stringify({ scope: "Europe", mode: "capital" }),
      );
    });
    await page.reload();
    await page.getByRole("button", { name: "Empezar ronda" }).click();
    await page.waitForSelector(".opt");

    assert.match(await page.locator(".eyebrow").first().innerText(), /cuál es la capital de/i);
    const names = await page.evaluate(() =>
      [...document.querySelectorAll(".opt-text")].map((n) => n.textContent),
    );
    assert.equal(names.length, 4);
    await context.close();
  });
});
