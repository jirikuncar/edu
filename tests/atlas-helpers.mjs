/* Answering an Atlas question the way a player would: using only what the
   screen shows. */

import assert from "node:assert/strict";
import { COUNTRIES } from "../src/atlas/countries.js";

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

export const answerCorrectly = async (page, lang = "en") => {
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

  const country = COUNTRIES.find((c) => c.name[lang] === shape.askText);
  assert.ok(country, `unknown country on screen: ${shape.askText}`);
  await clickOptionLabelled(page, country.cap[lang]);
  return country.name[lang];
};

export const playRound = async (page, count, lang = "en") => {
  for (let asked = 1; asked <= count; asked++) {
    await answerCorrectly(page, lang);
    await page.waitForSelector(".reveal");
    assert.equal(
      await page.locator(".note--win").count(),
      1,
      `question ${asked} should have been answered correctly`,
    );
    if (asked < count) await page.locator(".actions .btn").click();
  }
};
