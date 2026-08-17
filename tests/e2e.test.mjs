/* End-to-end checks against the built site.
   Run: pnpm build && pnpm test  (pnpm test starts its own preview server) */

import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, devices } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { COUNTRIES } from "../src/atlas/countries.js";

const PORT = 4173;
const BASE = `http://localhost:${PORT}/edu/`;
const HOME = BASE;
const COMPASS = `${BASE}compass/`;
const ATLAS = `${BASE}atlas/`;

let browser;
let server;

const waitForServer = async () => {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(BASE);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("preview server did not start");
};

before(async () => {
  server = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], {
    stdio: "ignore",
  });
  await waitForServer();
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.kill();
});

const newPage = async (options = {}) => {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return { context, page, problems };
};

/** Let entry animations finish so colours are sampled at their final value. */
const settle = async (page) => {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) =>
        animation.finished.catch(() => {}),
      ),
    ),
  );
};

const axeCheck = async (page, label) => {
  await settle(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();
  const report = violations.flatMap((v) =>
    v.nodes.map(
      (node) =>
        `${v.id} (${v.impact}) ${node.target.join(" ")} :: ${node.failureSummary?.split("\n").filter(Boolean).slice(-1)[0] ?? v.help}`,
    ),
  );
  assert.deepEqual(report, [], `axe violations on ${label}:\n${report.join("\n")}`);
};

/* ------------------------------------------------------------------ */

describe("hub", () => {
  test("loads, links to both games and stays quiet in the console", async () => {
    const { context, page, problems } = await newPage();
    await page.goto(HOME);
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
    const { context, page } = await newPage();
    for (const width of [320, 430, 900]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(HOME);
      await page.waitForSelector(".tile-go");
      const clashes = await page.evaluate(() =>
        [...document.querySelectorAll(".tile")].flatMap((tile) => {
          const parts = [...tile.querySelectorAll("h2, p, .tile-go")].map((el) => ({
            text: el.textContent.trim().slice(0, 20),
            box: el.getBoundingClientRect(),
          }));
          const bad = [];
          for (let i = 0; i < parts.length - 1; i++) {
            const a = parts[i];
            const b = parts[i + 1];
            if (a.box.bottom > b.box.top + 1) bad.push(`"${a.text}" overlaps "${b.text}"`);
          }
          return bad;
        }),
      );
      assert.deepEqual(clashes, [], `overlap at ${width}px`);
    }
    await context.close();
  });

  test("language choice persists into a game page", async () => {
    const { context, page } = await newPage();
    await page.goto(HOME);
    await page.getByRole("button", { name: "Spanish" }).click();
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.match(await page.locator("h1").innerText(), /Mar de Ámbar/);

    await page.goto(COMPASS);
    await page.waitForSelector("#start");
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.equal(await page.locator("#start").innerText(), "Zarpar");
    assert.equal(await page.locator(".lang").count(), 0, "no language switch inside a game");
    await context.close();
  });

  test("haptics switch toggles and persists", async () => {
    const { context, page } = await newPage();
    await page.goto(HOME);
    const toggle = page.locator("#haptics");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-checked"), "false");
    await page.reload();
    assert.equal(await page.locator("#haptics").getAttribute("aria-checked"), "false");
    await context.close();
  });
});

/* ------------------------------------------------------------------ */

describe("the golden compass", () => {
  test("plays all fifteen stops and records a clean run", async () => {
    const { context, page, problems } = await newPage();
    await page.goto(COMPASS);
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
      assert.equal(
        await page.locator("#shell-count").innerText(),
        `${stop - 1}/15`,
      );

      const answer = ANSWERS[stop - 1];
      await page.locator(`.opt[data-value="${answer}"]`).click();
      await page.waitForSelector(".note--win");

      await page.click("#next");
    }

    await page.waitForSelector(".pieces");
    assert.match(await page.locator("h1").innerText(), /Compass restored/i);
    assert.match(await page.locator(".score").innerText(), /15 of 15/);
    assert.equal(await page.locator("#shell-count").innerText(), "15/15");
    assert.equal(
      (await page.locator("#shell-track").getAttribute("aria-label")).toLowerCase(),
      "voyage complete",
    );

    const best = await page.evaluate(() => localStorage.getItem("edu:compass:best"));
    assert.equal(best, "15");

    await axeCheck(page, "compass end screen");
    assert.deepEqual(problems, []);
    await context.close();
  });

  test("a wrong answer can be retried, and a hint marks the run", async () => {
    const { context, page } = await newPage();
    await page.goto(COMPASS);
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
    const { context, page } = await newPage();
    await page.goto(COMPASS);
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
    const { context, page } = await newPage();
    await page.goto(COMPASS);
    await page.evaluate(() =>
      localStorage.setItem(
        "edu:compass:save",
        JSON.stringify({ stop: 8, solved: 8, clean: 8 }),
      ),
    );
    await page.reload();
    await page.click("#start");
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

    // tapping a coin again takes it back out
    await page.locator('.coin[data-coin="7"]').click();
    assert.match(await sum(), /11 of 11 · 4 coins/);

    await page.locator(".tray-reset").click();
    assert.match(await sum(), /0 of 11 · 0 coins/);
    assert.equal(await page.locator('.coin[aria-pressed="true"]').count(), 0);

    await axeCheck(page, "coin tray");
    await context.close();
  });

  test("the handshake ring draws every pair once, in its own colour", async () => {
    const { context, page } = await newPage();
    await page.goto(COMPASS);
    await page.evaluate(() =>
      localStorage.setItem(
        "edu:compass:save",
        JSON.stringify({ stop: 9, solved: 9, clean: 9 }),
      ),
    );
    await page.reload();
    await page.click("#start");
    await page.waitForSelector(".ring");

    const shake = async (a, b) => {
      await page.locator(`.person[data-person="${a}"]`).click();
      await page.locator(`.person[data-person="${b}"]`).click();
    };

    await shake(0, 1);
    assert.match(await page.locator(".ring-count").innerText(), /Handshakes so far: 1/);

    // the same pair cannot shake twice, in either order
    await shake(1, 0);
    assert.equal(await page.locator(".tray-over").count(), 1);
    assert.match(await page.locator(".ring-count").innerText(), /Handshakes so far: 1/);

    for (let a = 0; a < 5; a++)
      for (let b = a + 1; b < 5; b++) if (!(a === 0 && b === 1)) await shake(a, b);

    assert.match(await page.locator(".ring-count").innerText(), /Handshakes so far: 10/);
    assert.equal(await page.locator(".ring svg line").count(), 10);
    const colours = await page.evaluate(
      () =>
        new Set(
          [...document.querySelectorAll(".ring svg line")].map((line) =>
            line.getAttribute("stroke"),
          ),
        ).size,
    );
    assert.equal(colours, 10, "each handshake needs its own colour");

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
    const { context, page } = await newPage();
    await page.goto(COMPASS);
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

/* Correct answers, stop 1 → 15. */
const ANSWERS = [7, 12, 10, 5, 55, 16, 6, 6, 4, 10, 7, 5, 10, 3, 8];

/* ------------------------------------------------------------------ */

/** Answer the question on screen correctly, using only what is rendered. */
const answerCorrectly = async (page, lang = "en") => {
  await page.waitForSelector(".opt:not([disabled])");
  const shape = await page.evaluate(() => {
    const ask = document.getElementById("ask");
    return {
      flags: document.querySelector(".opts").classList.contains("opts--flags"),
      askLabel: ask.getAttribute("aria-label"),
      askText: ask.textContent.trim(),
    };
  });

  if (shape.flags) {
    // "Which flag belongs to X" — options are flags labelled with their country
    await page.locator(`.opt[aria-label="${shape.askText}"]`).click();
    return shape.askText;
  }

  if (shape.askLabel) {
    // "Which country has this flag" — the flag is labelled with the answer
    const name = shape.askLabel.split(": ").pop();
    await clickOptionLabelled(page, name);
    return name;
  }

  // "What is the capital of X"
  const country = COUNTRIES.find((c) => c.name[lang] === shape.askText);
  assert.ok(country, `unknown country on screen: ${shape.askText}`);
  await clickOptionLabelled(page, country.cap[lang]);
  return country.name[lang];
};

const clickOptionLabelled = async (page, text) => {
  const index = await page.evaluate(
    (wanted) =>
      [...document.querySelectorAll(".opt")].findIndex(
        (button) => button.querySelector(".opt-text")?.textContent.trim() === wanted,
      ),
    text,
  );
  assert.ok(index >= 0, `no answer button reads "${text}"`);
  await page.locator(".opt").nth(index).click();
};

const playAtlasRound = async (page, count, lang = "en") => {
  for (let asked = 1; asked <= count; asked++) {
    await answerCorrectly(page, lang);
    await page.waitForSelector(".reveal");
    const correct = await page.locator(".note--win").count();
    assert.equal(correct, 1, `question ${asked} should have been answered correctly`);
    if (asked < count) await page.locator(".reveal .btn").click();
  }
};

describe("atlas drill", () => {
  test("loads the local map, plays a round and stores progress", async () => {
    const { context, page, problems } = await newPage();
    await page.goto(ATLAS);

    const start = page.getByRole("button", { name: "Start round" });
    await start.waitFor({ timeout: 20_000 });
    assert.equal(await start.isDisabled(), false, "map data must load from the local copy");

    await start.click();
    await page.waitForSelector(".chart-card svg .land");
    assert.match(
      await page.locator("#shell-track").getAttribute("aria-label"),
      /question 1 of 12/i,
    );
    assert.equal(await page.locator(".tabs").count(), 0, "no view tabs mid-round");

    await playAtlasRound(page, 12);
    assert.equal(await page.locator("#shell-count").innerText(), "12/12");
    await page.locator(".reveal .btn").click();

    await page.waitForSelector(".final-score");
    assert.equal(await page.locator(".log li").count(), 12);
    const score = Number(await page.locator(".final-score").innerText());
    assert.ok(score > 0, "a perfect round should score");

    const stats = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("edu:atlas:stats") ?? "{}"),
    );
    assert.equal(Object.keys(stats).length, 12);
    const board = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("edu:atlas:board") ?? "{}"),
    );
    assert.ok(Object.values(board)[0]?.length === 1, "the round should reach the board");

    await axeCheck(page, "atlas summary");
    assert.deepEqual(problems, []);
    await context.close();
  });

  test("home, progress and board screens pass axe in both languages", async () => {
    const { context, page } = await newPage();
    for (const lang of ["en", "es"]) {
      await page.goto(ATLAS);
      await page.evaluate((value) => localStorage.setItem("edu:lang", JSON.stringify(value)), lang);
      await page.reload();
      await page.getByRole("button", { name: lang === "en" ? "Start round" : "Empezar ronda" }).waitFor();
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

  test("spanish round shows spanish country and capital names", async () => {
    const { context, page } = await newPage();
    await page.goto(ATLAS);
    await page.evaluate(() => {
      localStorage.setItem("edu:lang", JSON.stringify("es"));
      localStorage.setItem("edu:atlas:prefs", JSON.stringify({ scope: "Europe", mode: "capital" }));
    });
    await page.reload();
    await page.getByRole("button", { name: "Empezar ronda" }).click();
    await page.waitForSelector(".opt");
    const asked = await page.locator("#ask").innerText();
    assert.ok(asked.length > 0);
    const names = await page.evaluate(() =>
      [...document.querySelectorAll(".opt-text")].map((n) => n.textContent),
    );
    assert.equal(names.length, 4);
    await context.close();
  });
});

/* ------------------------------------------------------------------ */

describe("offline and install", () => {
  test("every page still works with the network cut", async () => {
    const { context, page } = await newPage();
    await page.goto(HOME);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 20_000,
    });
    await page.goto(COMPASS);
    await page.goto(ATLAS);
    await page.getByRole("button", { name: "Start round" }).waitFor({ timeout: 20_000 });

    await context.setOffline(true);

    await page.goto(HOME);
    await page.waitForSelector(".tile");
    assert.equal(await page.locator(".tile").count(), 2);

    await page.goto(COMPASS);
    await page.waitForSelector("#start");

    await page.goto(ATLAS);
    const start = page.getByRole("button", { name: "Start round" });
    await start.waitFor({ timeout: 20_000 });
    assert.equal(await start.isDisabled(), false, "the world atlas must come from the cache");
    await start.click();
    await page.waitForSelector(".chart-card svg .land");

    await context.setOffline(false);
    await context.close();
  });

  test("the manifest describes an installable app", async () => {
    const { context, page } = await newPage();
    await page.goto(HOME);
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await page.evaluate(
      async (url) => (await fetch(url)).json(),
      href,
    );
    assert.equal(manifest.start_url, "/edu/");
    assert.equal(manifest.scope, "/edu/");
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
    assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
    assert.equal(
      await page.locator('link[rel="apple-touch-icon"]').count(),
      1,
      "Safari needs an apple-touch-icon to install",
    );
    await context.close();
  });
});

/* ------------------------------------------------------------------ */

describe("answer buttons", () => {
  test("both games show the same number hints, and only where a keyboard is likely", async () => {
    for (const [width, expected] of [
      [430, false],
      [1100, true],
    ]) {
      const { context, page } = await newPage({ viewport: { width, height: 900 } });

      await page.goto(COMPASS);
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

      await page.goto(ATLAS);
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
});

/* ------------------------------------------------------------------ */

describe("phone layout", () => {
  const phone = devices["iPhone 13"];

  test("nothing scrolls sideways, down to a 280px screen", async () => {
    for (const width of [280, 320, 390, 768]) {
      const { context, page } = await newPage({
        ...phone,
        viewport: { width, height: 720 },
      });
      for (const url of [HOME, COMPASS, ATLAS]) {
        await page.goto(url);
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const widest = [...document.querySelectorAll("body *")]
            .map((el) => el.getBoundingClientRect().right)
            .reduce((a, b) => Math.max(a, b), 0);
          return {
            scroll: doc.scrollWidth - doc.clientWidth,
            past: Math.round(widest - doc.clientWidth),
          };
        });
        assert.ok(
          overflow.scroll <= 0,
          `${url} at ${width}px scrolls sideways by ${overflow.scroll}px`,
        );
        assert.ok(
          overflow.past <= 1,
          `${url} at ${width}px has content ${overflow.past}px past the edge`,
        );
      }
      await context.close();
    }
  });

  test("tap targets are big enough for a child's finger", async () => {
    const { context, page } = await newPage(phone);
    await page.goto(COMPASS);
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
    const { context, page } = await newPage({
      ...phone,
      viewport: { width: 390, height: 340 },
    });
    await page.goto(ATLAS);
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
