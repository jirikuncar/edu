// Five apprentices in a ring. Tap one, tap another, and they shake hands —
// every pair gets its own colour, and nobody shakes the same hand twice.
// Drawing all of them is the point: you end up counting 10 by hand.

import { t } from "../lib/i18n.js";
import * as haptic from "../lib/haptics.js";

const UI = {
  people: { en: "The apprentices", es: "Los aprendices" },
  tap: {
    en: "Tap one apprentice, then another, to shake hands.",
    es: "Toca a un aprendiz y luego a otro para darse la mano.",
  },
  count: {
    en: (n) => `Handshakes so far: ${n}`,
    es: (n) => `Apretones hasta ahora: ${n}`,
  },
  all: {
    en: "Everyone has now shaken everyone else's hand.",
    es: "Ya se han dado la mano todos con todos.",
  },
  already: {
    en: "Those two have already shaken hands.",
    es: "Esos dos ya se han dado la mano.",
  },
  reset: { en: "Start the greetings again", es: "Empezar los saludos de nuevo" },
  resetShort: { en: "Clear", es: "Borrar" },
  person: { en: (n) => `Apprentice ${n}`, es: (n) => `Aprendiz ${n}` },
  personState: {
    en: (n, shakes) =>
      `Apprentice ${n}, ${shakes} ${shakes === 1 ? "handshake" : "handshakes"}`,
    es: (n, shakes) =>
      `Aprendiz ${n}, ${shakes} ${shakes === 1 ? "apretón" : "apretones"}`,
  },
  shookHands: {
    en: (a, b, total) => `Apprentice ${a} and apprentice ${b} shook hands. ${total} so far.`,
    es: (a, b, total) => `El aprendiz ${a} y el aprendiz ${b} se dan la mano. ${total} en total.`,
  },
};

export const createRingState = () => ({ links: [], selected: null, note: null });

const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Evenly spaced around the ring, as percentages of the seat box.
 *  The box is already inset by one circle radius, so the seats use all of
 *  it: pulling them in would only crowd the apprentices together. */
const seats = (count) =>
  [...Array(count)].map((_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return {
      x: 50 + 50 * Math.cos(angle),
      y: 50 + 50 * Math.sin(angle),
    };
  });

const colour = (index) => `hsl(${(index * 47 + 42) % 360} 72% 66%)`;

export function ringWidget({ people }, state, answered = false) {
  const spots = seats(people);
  const shakes = (person) =>
    state.links.filter(([a, b]) => a === person || b === person).length;
  const total = state.links.length;
  const everyone = (people * (people - 1)) / 2;

  const lines = state.links
    .map(([a, b], index) => {
      const from = spots[a];
      const to = spots[b];
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"
        stroke="${colour(index)}" stroke-width="2.5" stroke-linecap="round"
        vector-effect="non-scaling-stroke"/>`;
    })
    .join("");

  if (answered)
    return `
    <p class="ring-count ring-count--done">
      <b>${t(UI.count, total)}</b>
      ${total === everyone ? `<span class="tray-good">${t(UI.all)}</span>` : ""}
    </p>`;

  return `
    <div class="ring-widget">
      <p class="sr-only" id="ring-label">${t(UI.people)}</p>
      <div class="ring" role="group" aria-labelledby="ring-label">
        <div class="ring-seats">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
        ${spots
          .map(
            (spot, index) => `
          <button type="button" class="person${state.selected === index ? " picked" : ""}"
            data-person="${index}" aria-pressed="${state.selected === index}"
            aria-label="${t(UI.personState, index + 1, shakes(index))}"
            style="left:${spot.x}%;top:${spot.y}%">
            <span aria-hidden="true">${index + 1}</span>
          </button>`,
          )
          .join("")}
        </div>
      </div>
      <div class="tray-foot">
      <p class="ring-count" role="status">
        <b>${t(UI.count, total)}</b>
        ${total === everyone ? `<span class="tray-good">${t(UI.all)}</span>` : ""}
        ${
          state.note === "already"
            ? `<span class="tray-over">${t(UI.already)}</span>`
            : state.note
              ? `<span class="sr-only">${state.note}</span>`
              : ""
        }
      </p>
      ${
        total || state.selected !== null
          ? `<button type="button" class="chip ring-reset" aria-label="${t(UI.reset)}">${t(UI.resetShort)}</button>`
          : ""
      }
      </div>
      ${total ? "" : `<p class="tray-help mono dim">${t(UI.tap)}</p>`}
    </div>`;
}

export function wireRingWidget(root, widget, state, repaint) {
  for (const button of root.querySelectorAll(".person")) {
    button.addEventListener("click", () => {
      const person = Number(button.dataset.person);
      state.note = null;

      if (state.selected === null) {
        state.selected = person;
        haptic.tap();
      } else if (state.selected === person) {
        state.selected = null;
        haptic.tap();
      } else {
        const pair = [state.selected, person];
        const exists = state.links.some(
          ([a, b]) => key(a, b) === key(pair[0], pair[1]),
        );
        if (exists) {
          state.note = "already";
          state.selected = null;
          haptic.miss();
        } else {
          state.links.push(pair);
          state.selected = null;
          state.note = t(UI.shookHands, pair[0] + 1, pair[1] + 1, state.links.length);
          haptic.win();
        }
      }
      repaint();
    });
  }

  root.querySelector(".ring-reset")?.addEventListener("click", () => {
    state.links = [];
    state.selected = null;
    state.note = null;
    haptic.tap();
    repaint();
  });
}
