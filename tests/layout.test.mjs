import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { devices } from "playwright";
import { startSite } from "./harness.mjs";

let site;
before(async () => (site = await startSite()));
after(() => site?.close());

const phone = devices["iPhone 13"];

describe("layout", { concurrency: true }, () => {
  test("both games show the same number hints, only where a keyboard is likely", async () => {
    for (const [width, expected] of [
      [430, false],
      [1100, true],
    ]) {
      const { context, page } = await site.newPage({ viewport: { width, height: 900 } });

      await page.goto(site.compass);
      await page.click("#start");
      await page.waitForSelector(".opt");
      assert.equal(
        await page.locator(".opt .key").first().isVisible(),
        expected,
        `compass key hints at ${width}px`,
      );
      assert.deepEqual(
        await page.locator(".opt .key").allInnerTexts(),
        ["1", "2", "3"],
        "the badge must name the key that answers",
      );

      await page.goto(site.atlas);
      await page.getByRole("button", { name: "Start round" }).waitFor({ timeout: 20_000 });
      await page.getByRole("button", { name: "Start round" }).click();
      await page.waitForSelector(".opt");
      assert.equal(
        await page.locator(".opt .key").first().isVisible(),
        expected,
        `atlas key hints at ${width}px`,
      );
      await context.close();
    }
  });

  test("nothing scrolls sideways, down to a 280px screen", async () => {
    for (const width of [280, 320, 390, 768]) {
      const { context, page } = await site.newPage({
        ...phone,
        viewport: { width, height: 720 },
      });
      for (const url of [site.home, site.compass, site.atlas]) {
        await page.goto(url);
        await page.waitForSelector("main");
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          // Content inside a sideways scroller (the settings chip rows) is
          // allowed past the edge; the scroller itself is not.
          const inScroller = (el) => {
            for (let node = el.parentElement; node; node = node.parentElement) {
              const overflowX = getComputedStyle(node).overflowX;
              if (overflowX === "auto" || overflowX === "scroll") return true;
            }
            return false;
          };
          const widest = [...document.querySelectorAll("body *")]
            .filter((el) => !inScroller(el))
            .map((el) => el.getBoundingClientRect().right)
            .reduce((a, b) => Math.max(a, b), 0);
          return { scroll: doc.scrollWidth - doc.clientWidth, past: Math.round(widest - doc.clientWidth) };
        });
        assert.ok(overflow.scroll <= 0, `${url} at ${width}px scrolls sideways by ${overflow.scroll}px`);
        assert.ok(overflow.past <= 1, `${url} at ${width}px has content ${overflow.past}px past the edge`);
      }
      await context.close();
    }
  });

  test("tap targets are big enough for a child's finger", async () => {
    const { context, page } = await site.newPage(phone);
    await page.goto(site.compass);
    await page.click("#start");
    await page.waitForSelector(".opt");
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("button, a")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ label: el.textContent.trim().slice(0, 24), box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.height < 40 || box.width < 40)
        .map(({ label, box }) => `${label} ${Math.round(box.width)}x${Math.round(box.height)}`),
    );
    assert.deepEqual(small, []);
    await context.close();
  });

  test("the name field stays usable with a virtual keyboard open", async () => {
    // A software keyboard shrinks the visual viewport; emulate it by
    // shrinking the window to what is left above the keyboard.
    const { context, page } = await site.newPage({
      ...phone,
      viewport: { width: 390, height: 340 },
    });
    await page.goto(site.atlas);
    await page.waitForSelector("#player");
    await page.locator("#player").scrollIntoViewIfNeeded();
    await page.locator("#player").click();
    await page.keyboard.type("Nina");

    const state = await page.evaluate(() => {
      const input = document.getElementById("player");
      const box = input.getBoundingClientRect();
      const header = document.querySelector(".shell").getBoundingClientRect();
      return {
        value: input.value,
        fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
        visible: box.top >= header.bottom - 1 && box.bottom <= innerHeight,
        overlapped: document.elementFromPoint(box.left + 8, box.top + box.height / 2)?.id,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    assert.equal(state.value, "Nina");
    assert.ok(state.fontSize >= 16, "inputs under 16px make iOS zoom the page");
    assert.ok(state.visible, "the field must sit in view, clear of the sticky header");
    assert.equal(state.overlapped, "player", "nothing may cover the field");
    assert.ok(state.overflow <= 0);
    await context.close();
  });
});
