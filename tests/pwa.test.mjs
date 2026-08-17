import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

let site;
before(async () => (site = await startSite()));
after(() => site?.close());

describe("offline and install", { concurrency: true }, () => {
  test("every page still works with the network cut", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.home);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 20_000,
    });
    await page.goto(site.compass);
    await page.goto(site.atlas);
    await page.getByRole("button", { name: "Start round" }).waitFor({ timeout: 20_000 });

    await context.setOffline(true);

    await page.goto(site.home);
    assert.equal(await page.locator(".tile").count(), 2);

    await page.goto(site.compass);
    await page.waitForSelector("#start");

    await page.goto(site.atlas);
    const start = page.getByRole("button", { name: "Start round" });
    await start.waitFor({ timeout: 20_000 });
    assert.equal(await start.isDisabled(), false, "the world atlas must come from the cache");
    await start.click();
    await page.waitForSelector(".chart-card svg .land");

    await context.setOffline(false);
    await context.close();
  });

  test("the manifest describes an installable app", async () => {
    const { context, page } = await site.newPage();
    await page.goto(site.home);
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await page.evaluate(async (url) => (await fetch(url)).json(), href);

    assert.equal(manifest.start_url, "/edu/");
    assert.equal(manifest.scope, "/edu/");
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
    assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
    assert.equal(manifest.screenshots.length, 2);
    assert.equal(
      await page.locator('link[rel="apple-touch-icon"]').count(),
      1,
      "Safari needs an apple-touch-icon to install",
    );
    await context.close();
  });
});
