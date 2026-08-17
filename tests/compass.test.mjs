import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startSite, axeCheck, COMPASS_ANSWERS, openStopAt } from "./harness.mjs";

let site;
before(async () => (site = await startSite()));
after(() => site?.close());

describe("the golden compass", { concurrency: true }, () => {
  test("plays all fifteen stops and records a clean run", async () => {
    const { context, page, problems } = await site.newPage();
    await page.goto(site.compass);
    await page.click("#start");

    for (let stop = 1; stop <= 15; stop++) {
      await page.waitForSelector(".opt:not([disabled])");
      assert.equal(
        (await page.locator("#shell-track").getAttribute("aria-label")).toLowerCase(),
        `stop ${stop} of 15`,
      );
      // one progress readout only: the ship on the header track
      assert.equal(await page.locator(".tally, .lantern, .chart").count(), 0);
      assert.equal(await page.locator(".shell-progress .ship").count(), 1);
      assert.equal(await page.locator("#shell-count").innerText(), `${stop - 1}/15`);

      await page.locator(`.opt[data-value="${COMPASS_ANSWERS[stop - 1]}"]`).click();
      await page.waitForSelector(".note--win");
      await page.click("#next");
    }

    await page.waitForSelector(".pieces");
    assert.match(await page.locator("h1").innerText(), /Compass restored/i);
    assert.match(await page.locator(".score").innerText(), /15 of 15/);
    assert.equal(await page.locator("#shell-count").innerText(), "15/15");

    assert.equal(await page.evaluate(() => localStorage.getItem("edu:compass:best")), "15");
    await axeCheck(page, "compass end screen");
    assert.deepEqual(problems, []);
    await context.close();
  });

  test("a wrong answer can be retried, and a hint marks the run", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.compass);
    await page.click("#start");
    await page.waitForSelector(".opt");

    await page.click("#hint");
    await page.waitForSelector(".note");
    assert.match(await page.locator(".note").innerText(), /Hint\./);

    await page.locator('.opt[data-value="6"]').click();
    await page.waitForSelector(".note--miss");
    assert.equal(await page.locator('.opt[data-value="6"]').isDisabled(), true);
    assert.equal(await page.locator('.opt[data-value="7"]').isDisabled(), false);

    await page.locator('.opt[data-value="7"]').click();
    await page.waitForSelector(".note--win");
    await axeCheck(page, "compass answered state");
    await context.close();
  });

  test("keyboard alone can answer and advance", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.compass);
    await page.click("#start");
    await page.waitForSelector(".opt");

    const position = await page.evaluate(() =>
      [...document.querySelectorAll(".opt")].findIndex((b) => b.dataset.value === "7"),
    );
    await page.keyboard.press(String(position + 1));
    await page.waitForSelector(".note--win");
    await page.keyboard.press("Enter");
    await page.waitForSelector("#shell-track");
    assert.equal(
      (await page.locator("#shell-track").getAttribute("aria-label")).toLowerCase(),
      "stop 2 of 15",
    );
    await context.close();
  });

  test("the toll tray adds up coins and spots an exact payment", async () => {
    const { context, page } = await site.newPage();
    await openStopAt(page, site.compass, 8);
    await page.waitForSelector(".tray");

    const sum = () => page.locator(".tray-sum").innerText();
    assert.match(await sum(), /0 of 11 · 0 coins/);

    for (const index of [0, 1, 6]) await page.locator(`.coin[data-coin="${index}"]`).click();
    assert.match(await sum(), /9 of 11 · 3 coins/);

    await page.locator('.coin[data-coin="2"]').click();
    assert.match(await sum(), /11 of 11 · 4 coins/);
    assert.equal(await page.locator(".tray-good").count(), 1);
    assert.equal(await page.locator('.coin[aria-pressed="true"]').count(), 4);

    await page.locator('.coin[data-coin="7"]').click();
    assert.equal(await page.locator(".tray-over").count(), 1, "overshooting must be called out");

    await page.locator('.coin[data-coin="7"]').click(); // take it back out
    assert.match(await sum(), /11 of 11 · 4 coins/);

    await page.locator(".tray-reset").click();
    assert.match(await sum(), /0 of 11 · 0 coins/);
    assert.equal(await page.locator('.coin[aria-pressed="true"]').count(), 0);

    await axeCheck(page, "coin tray");
    await context.close();
  });

  test("the handshake ring draws every pair once, in its own colour", async () => {
    const { context, page } = await site.newPage();
    await openStopAt(page, site.compass, 9);
    await page.waitForSelector(".ring");

    const shake = async (a, b) => {
      await page.locator(`.person[data-person="${a}"]`).click();
      await page.locator(`.person[data-person="${b}"]`).click();
    };

    await shake(0, 1);
    assert.match(await page.locator(".ring-count").innerText(), /Handshakes so far: 1/);

    await shake(1, 0); // the same pair, the other way round
    assert.equal(await page.locator(".tray-over").count(), 1);
    assert.match(await page.locator(".ring-count").innerText(), /Handshakes so far: 1/);

    for (let a = 0; a < 5; a++)
      for (let b = a + 1; b < 5; b++) if (!(a === 0 && b === 1)) await shake(a, b);

    assert.match(await page.locator(".ring-count").innerText(), /Handshakes so far: 10/);
    assert.equal(await page.locator(".ring svg line").count(), 10);
    assert.equal(
      await page.evaluate(
        () =>
          new Set(
            [...document.querySelectorAll(".ring svg line")].map((l) => l.getAttribute("stroke")),
          ).size,
      ),
      10,
      "each handshake needs its own colour",
    );

    const fits = await page.evaluate(() => {
      const ring = document.querySelector(".ring").getBoundingClientRect();
      return [...document.querySelectorAll(".person")].every((person) => {
        const box = person.getBoundingClientRect();
        return (
          box.left >= ring.left - 1 &&
          box.right <= ring.right + 1 &&
          box.top >= ring.top - 1 &&
          box.bottom <= ring.bottom + 1
        );
      });
    });
    assert.ok(fits, "every apprentice must sit inside the ring box");

    await axeCheck(page, "handshake ring");
    await context.close();
  });

  test("an interrupted voyage can be resumed", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.compass);
    await page.click("#start");
    await page.waitForSelector(".opt");
    await page.locator('.opt[data-value="7"]').click();
    await page.click("#next");
    await page.waitForSelector(".opt");

    await page.reload();
    await page.waitForSelector("#start");
    assert.match(await page.locator("#start").innerText(), /Continue from stop 2/);
    await page.click("#start");
    assert.equal(
      (await page.locator("#shell-track").getAttribute("aria-label")).toLowerCase(),
      "stop 2 of 15",
    );
    await context.close();
  });
});
