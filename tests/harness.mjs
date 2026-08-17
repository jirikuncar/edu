/* Shared test harness: serve dist/ from this process and drive Chromium.
   No spawned preview server, so every test file starts in milliseconds and
   the files can run in parallel on their own ports. */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/** Serve the built site the way GitHub Pages does: under /edu/, with
 *  directory URLs resolving to index.html. */
const serve = () =>
  createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    let path = decodeURIComponent(url.pathname);

    if (!path.startsWith("/edu/")) {
      response.writeHead(404).end("outside the site");
      return;
    }
    path = path.slice("/edu/".length);
    if (path === "" || path.endsWith("/")) path += "index.html";

    const file = join(DIST, normalize(path));
    if (!file.startsWith(DIST)) {
      response.writeHead(403).end("nope");
      return;
    }

    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("not built");
    }
  });

/**
 * Boot a site + browser for one test file. Returns the urls, a page factory
 * and a close function; call it from `before`.
 */
export async function startSite() {
  const server = serve();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://localhost:${server.address().port}/edu/`;
  const browser = await chromium.launch();

  return {
    base,
    home: base,
    compass: `${base}compass/`,
    atlas: `${base}atlas/`,

    /** A fresh, isolated context. Motion is off by default: the app honours
     *  prefers-reduced-motion, so screens settle at once and the suite is
     *  not waiting on 450ms fades. Pass `{ reducedMotion: "no-preference" }`
     *  to exercise the animated path. */
    async newPage(options = {}) {
      const context = await browser.newContext({ reducedMotion: "reduce", ...options });
      const page = await context.newPage();
      const problems = [];
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(message.text());
      });
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      return { context, page, problems };
    },

    async close() {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Let any entry animation finish, so colours are sampled at final value. */
export const settle = (page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
  );

export const axeCheck = async (page, label) => {
  await settle(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();
  const report = violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} (${violation.impact}) ${node.target.join(" ")} :: ` +
        `${node.failureSummary?.split("\n").filter(Boolean).slice(-1)[0] ?? violation.help}`,
    ),
  );
  assert.deepEqual(report, [], `axe violations on ${label}:\n${report.join("\n")}`);
};

/* Correct answers for The Golden Compass, stop 1 → 15. */
export const COMPASS_ANSWERS = [7, 12, 10, 5, 55, 16, 6, 6, 4, 10, 7, 5, 10, 3, 8];

/** Jump straight to a stop, so a test does not have to play the ones before. */
export const openStopAt = async (page, url, stop) => {
  await page.goto(url);
  await page.evaluate(
    (index) =>
      localStorage.setItem(
        "edu:compass:save",
        JSON.stringify({ stop: index, solved: index, clean: index }),
      ),
    stop,
  );
  await page.reload();
  await page.click("#start");
};
