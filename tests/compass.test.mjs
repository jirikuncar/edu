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

    const layout = await page.evaluate(() => {
      const ring = document.querySelector(".ring").getBoundingClientRect();
      const people = [...document.querySelectorAll(".person")].map((person) =>
        person.getBoundingClientRect(),
      );
      const inside = people.every(
        (box) =>
          box.left >= ring.left - 1 &&
          box.right <= ring.right + 1 &&
          box.top >= ring.top - 1 &&
          box.bottom <= ring.bottom + 1,
      );
      let closest = Infinity;
      for (let i = 0; i < people.length; i++)
        for (let j = i + 1; j < people.length; j++) {
          const a = people[i];
          const b = people[j];
          const gap = Math.hypot(
            a.left + a.width / 2 - (b.left + b.width / 2),
            a.top + a.height / 2 - (b.top + b.height / 2),
          ) - a.width;
          closest = Math.min(closest, gap);
        }
      return { inside, closest: Math.round(closest) };
    });
    assert.ok(layout.inside, "every apprentice must sit inside the ring box");
    assert.ok(
      layout.closest >= 8,
      `apprentices are ${layout.closest}px apart — they need room to stand`,
    );

    await axeCheck(page, "handshake ring");
    await context.close();
  });

  test("the pancake recounts its pieces as the cuts move", async () => {
    const { context, page } = await site.newPage();
    await openStopAt(page, site.compass, 10);
    await page.waitForSelector(".pan");

    const pieces = () => page.locator(".ring-count b").innerText();
    assert.match(await pieces(), /Pieces: 6/, "three cuts through the middle make six");
    assert.equal(await page.locator(".handle").count(), 6, "two handles per cut");

    // Drag one end away from the middle; the cuts stop being concurrent.
    const seats = await page.locator(".pan-seats").boundingBox();
    const handle = await page.locator('.handle[data-cut="1"][data-end="0"]').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(seats.x + seats.width, seats.y + seats.height / 2, { steps: 10 });
    await page.mouse.up();
    assert.match(await pieces(), /Pieces: 7/, "spread cuts make seven");
    assert.match(await page.locator(".pan-best").innerText(), /Best so far: 7/);

    // Arrow keys move a handle too, for anyone not dragging.
    const before = await page.evaluate(() =>
      document.querySelector('.handle[data-cut="0"][data-end="0"]').style.left,
    );
    await page.locator('.handle[data-cut="0"][data-end="0"]').focus();
    await page.keyboard.press("ArrowRight");
    const after = await page.evaluate(() =>
      document.querySelector('.handle[data-cut="0"][data-end="0"]').style.left,
    );
    assert.notEqual(before, after, "an arrow key should move the handle");

    // Reset puts the cuts back, and keeps the record.
    await page.locator(".pan-reset").click();
    assert.match(await pieces(), /Pieces: 6/);
    assert.match(await page.locator(".pan-best").innerText(), /Best so far: 7/);

    await axeCheck(page, "pancake");
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
