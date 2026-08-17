// The toll puzzle is easier to think about with your hands: tap a coin to
// drop it in the basket, watch the total, and count how many it took.

import { t } from "../lib/i18n.js";
import * as haptic from "../lib/haptics.js";

const UI = {
  purse: { en: "Your purse", es: "Tu bolsa" },
  tap: {
    en: "Tap a coin to drop it in the basket.",
    es: "Toca una moneda para echarla a la cesta.",
  },
  basket: {
    en: (sum, target, count) =>
      `Basket: ${sum} of ${target} · ${count} ${count === 1 ? "coin" : "coins"}`,
    es: (sum, target, count) =>
      `Cesta: ${sum} de ${target} · ${count} ${count === 1 ? "moneda" : "monedas"}`,
  },
  exact: {
    en: (count) => `Exactly ${count === 1 ? "one coin" : `${count} coins`} — that pays the toll.`,
    es: (count) => `Justo con ${count === 1 ? "una moneda" : `${count} monedas`}: el peaje está pagado.`,
  },
  over: {
    en: "That is more than the toll, and Grum gives no change.",
    es: "Eso pasa del peaje, y Grum no da cambio.",
  },
  reset: { en: "Empty the basket", es: "Vaciar la cesta" },
  coinIn: { en: (v) => `${v} copper, in the basket`, es: (v) => `${v} cobres, en la cesta` },
  coinOut: { en: (v) => `${v} copper, in the purse`, es: (v) => `${v} cobres, en la bolsa` },
};

/** Renders the tray. `basket` is a live Set of coin indexes, kept by the caller
 *  so the state survives a re-render (a language switch, say). */
export function coinTray({ coins, target }, basket) {
  const sum = [...basket].reduce((total, index) => total + coins[index], 0);
  const count = basket.size;

  const status =
    sum === target
      ? `<span class="tray-good">${t(UI.exact, count)}</span>`
      : sum > target
        ? `<span class="tray-over">${t(UI.over)}</span>`
        : "";

  return `
    <div class="tray">
      <p class="label" id="tray-label">${t(UI.purse)}</p>
      <div class="coins" role="group" aria-labelledby="tray-label">
        ${coins
          .map(
            (value, index) => `
          <button type="button" class="coin${basket.has(index) ? " in" : ""}"
            data-coin="${index}" aria-pressed="${basket.has(index)}"
            aria-label="${basket.has(index) ? t(UI.coinIn, value) : t(UI.coinOut, value)}">
            <span aria-hidden="true">${value}</span>
          </button>`,
          )
          .join("")}
      </div>
      <p class="tray-sum" role="status">
        <b>${t(UI.basket, sum, target, count)}</b>
        ${status ? `<span class="tray-verdict">${status}</span>` : ""}
      </p>
      <p class="tray-help mono dim">${t(UI.tap)}</p>
      ${
        count
          ? `<button type="button" class="btn btn--ghost tray-reset">${t(UI.reset)}</button>`
          : ""
      }
    </div>`;
}

/** Wire the tray inside `root`; `repaint` redraws it after every change. */
export function wireCoinTray(root, { coins, target }, basket, repaint) {
  for (const button of root.querySelectorAll(".coin")) {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.coin);
      if (basket.has(index)) basket.delete(index);
      else basket.add(index);

      const sum = [...basket].reduce((total, i) => total + coins[i], 0);
      if (sum === target) haptic.win();
      else haptic.tap();

      repaint();
    });
  }

  root.querySelector(".tray-reset")?.addEventListener("click", () => {
    basket.clear();
    haptic.tap();
    repaint();
  });
}
