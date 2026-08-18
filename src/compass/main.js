import "../styles/app.css";
import "./compass.css";

import { mountShell, bindTitle, setProgress, SECTIONS } from "../lib/shell.js";
import { t, onLang } from "../lib/i18n.js";
import { load, save } from "../lib/store.js";
import * as haptic from "../lib/haptics.js";
import { STOPS, LANDS, SKILLS } from "./data.js";
import { startSky } from "./sky.js";
import { createWidgetState, renderWidget, wireWidget } from "./widgets.js";

const UI = {
  orders: { en: "Your orders", es: "Tu misión" },
  intro1: {
    en: "The Golden Compass broke into five pieces and scattered across the Amber Sea. You are the new navigator of the little ship <em>Perihelion</em>. Fifteen stops lie ahead, and every one is guarded by someone with a puzzle.",
    es: "La Brújula Dorada se rompió en cinco piezas que se esparcieron por el Mar de Ámbar. Eres el nuevo navegante del pequeño barco <em>Perihelion</em>. Te esperan quince paradas, y cada una la guarda alguien con un enigma.",
  },
  intro2: {
    en: "Nobody expects you to be fast. Think, guess out loud, use a hint when you want one. Wrong answers cost nothing but a smile from the guard.",
    es: "Nadie espera que seas rápido. Piensa, adivina en voz alta y pide una pista cuando quieras. Fallar no cuesta nada, solo una sonrisa del guardián.",
  },
  start: { en: "Set sail", es: "Zarpar" },
  resume: { en: (n) => `Continue from stop ${n}`, es: (n) => `Seguir desde la parada ${n}` },
  restart: { en: "Start from the beginning", es: "Empezar desde el principio" },
  stopOf: { en: (n) => `Stop ${n} of 15`, es: (n) => `Parada ${n} de 15` },
  says: { en: "says", es: "dice" },
  hintBtn: { en: "Ask for a hint", es: "Pedir una pista" },
  hintLab: { en: "Hint.", es: "Pista." },
  miss: {
    en: "Not this one. Read the puzzle once more — you get another go.",
    es: "Esa no. Lee el enigma otra vez: tienes otro intento.",
  },
  correct: { en: "Correct.", es: "¡Correcto!" },
  next: { en: "Sail on", es: "Seguir navegando" },
  last: { en: "Open the compass", es: "Abrir la brújula" },
  endKick: { en: "All five pieces recovered", es: "Las cinco piezas recuperadas" },
  endTitle: { en: "Compass restored", es: "Brújula restaurada" },
  endText: {
    en: "Ember lowers her head and the Golden Compass spins once, then points home. Fifteen stops, fifteen puzzles, one navigator.",
    es: "Ember baja la cabeza y la Brújula Dorada gira una vez y señala hacia casa. Quince paradas, quince enigmas, un solo navegante.",
  },
  allSolved: {
    en: "Fifteen stops, all of them solved.",
    es: "Quince paradas, todas resueltas.",
  },
  score: {
    en: (n) => `Answered first time, with no hint: ${n} of 15.`,
    es: (n) => `Acertadas a la primera y sin pista: ${n} de 15.`,
  },
  blots: {
    en: (list) => `A hand was needed at ${list}.`,
    es: (list) => `Hizo falta ayuda en ${list}.`,
  },
  blotHint: { en: (n) => `stop ${n} (hint)`, es: (n) => `la parada ${n} (pista)` },
  blotRetry: {
    en: (n) => `stop ${n} (second try)`,
    es: (n) => `la parada ${n} (segundo intento)`,
  },
  andWord: { en: "and", es: "y" },
  best: { en: (n) => `Best so far: ${n} of 15.`, es: (n) => `Mejor marca: ${n} de 15.` },
  again: { en: "Sail it again", es: "Navegar otra vez" },
  grownup: { en: "Notes for a grown-up", es: "Notas para un adulto" },
  grownup1: {
    en: "Each stop trains one idea from primary olympiad papers (Kangaroo Pre-Ecolier and Ecolier level):",
    es: "Cada parada entrena una idea de las pruebas de olimpiada de primaria (nivel Canguro Pre-Ecolier y Ecolier):",
  },
  grownup2: {
    en: "Stops 13 and 15 are the two classic traps. If they are answered instantly and wrongly, that is the most useful conversation in the whole voyage.",
    es: "Las paradas 13 y 15 son las dos trampas clásicas. Si se responden al instante y mal, ahí está la conversación más útil de todo el viaje.",
  },
  voyage: { en: "Voyage complete", es: "Viaje completado" },
  pieces: {
    en: "All five compass pieces recovered",
    es: "Las cinco piezas de la brújula recuperadas",
  },
  answers: { en: "Answers", es: "Respuestas" },
  srCorrect: { en: "correct answer", es: "respuesta correcta" },
  srWrong: { en: "not correct", es: "incorrecta" },
  picture: { en: "Picture:", es: "Imagen:" },
};

/* ---------- state ---------- */

const saved = load("compass:save", null);
let view = "title";
let stop = 0;
let solved = 0;
let clean = 0; // answered first time, with no hint
let blots = []; // the stops that needed a hint or another try
let order = [];
let hintShown = false;
let wrongPicks = new Set();
let answered = false;
let widgetState = null; // hands-on prop state for the stops that have one

const main = document.getElementById("main");
mountShell(document.getElementById("shell"), "compass");
bindTitle(SECTIONS[0].title);
startSky(document.getElementById("stars"));

const shuffled = (values) => {
  const list = values.slice();
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

function enterStop(index) {
  stop = index;
  answered = false;
  hintShown = false;
  wrongPicks = new Set();
  widgetState = createWidgetState(STOPS[index].widget);
  order = shuffled(STOPS[index].options);
  save("compass:save", { stop, solved, clean, blots });
}

/* ---------- screens ---------- */

function titleScreen() {
  setProgress({ label: t(SECTIONS[0].title) });
  const canResume = saved && saved.stop > 0 && saved.stop < STOPS.length;
  main.innerHTML = `
    <div class="fade stack">
      <h1 tabindex="-1" id="head"><span class="sub">${t({ en: "A math voyage", es: "Un viaje matemático" })}</span>${t(SECTIONS[0].title)}</h1>
      <div class="card card--flow">
        <p class="eyebrow">${t(UI.orders)}</p>
        <p class="story">${t(UI.intro1)}</p>
        <p class="story">${t(UI.intro2)}</p>
        <div class="row">
          <button class="btn" id="start" type="button">${
            canResume ? t(UI.resume, saved.stop + 1) : t(UI.start)
          }</button>
          ${canResume ? `<button class="btn btn--ghost" id="restart" type="button">${t(UI.restart)}</button>` : ""}
        </div>
      </div>
    </div>`;

  document.getElementById("start").addEventListener("click", () => {
    haptic.tap();
    if (canResume) {
      solved = saved.solved ?? 0;
      clean = saved.clean ?? 0;
      blots = saved.blots ?? [];
      enterStop(saved.stop);
    } else {
      solved = 0;
      clean = 0;
      blots = [];
      enterStop(0);
    }
    view = "play";
    paint({ focus: true });
  });

  document.getElementById("restart")?.addEventListener("click", () => {
    haptic.tap();
    solved = 0;
    clean = 0;
    blots = [];
    enterStop(0);
    view = "play";
    paint({ focus: true });
  });
}

function playScreen() {
  setProgress({
    label: t(UI.stopOf, stop + 1),
    value: answered ? stop + 1 : stop,
    max: STOPS.length,
  });
  const s = STOPS[stop];
  const land = LANDS[s.land];

  main.innerHTML = `
    <div class="fade stack">
      <div class="card card--flow${answered ? " card--answered" : ""}">
        <h1 class="stop-line h-plain" id="head" tabindex="-1">
          <span class="sr-only">${t(UI.stopOf, stop + 1)} — </span>
          <span>${t(land.name)}</span>
          <span aria-hidden="true">·</span>
          <span class="speaker">${t(land.guide)} ${t(UI.says)}</span>
        </h1>
        <p class="story">${t(s.story)}</p>
        ${s.art ?? ""}
        ${s.alt ? `<p class="sr-only">${t(UI.picture)} ${t(s.alt)}</p>` : ""}
        <div id="widget">${s.widget ? renderWidget(s.widget, widgetState, answered) : ""}</div>
        <p class="prompt" id="prompt">${t(s.prompt)}</p>
        <div class="opts" role="group" aria-labelledby="prompt">
          ${order
            .map(
              (value, index) =>
                `<button class="opt" type="button" data-value="${value}"
                   data-index="${index}"><span class="key" aria-hidden="true">${index + 1}</span>${value}</button>`,
            )
            .join("")}
        </div>
        <div id="hint-slot"></div>
        <div id="feedback"></div>
      </div>
      <div class="actions" id="actions"></div>
    </div>`;

  if (s.widget) mountWidget(s.widget);
  mountActions();

  for (const button of main.querySelectorAll(".opt"))
    button.addEventListener("click", () => choose(button));

  // Restore the state of a stop that is being re-rendered (language switch).
  if (hintShown) showHint();
  for (const button of main.querySelectorAll(".opt"))
    if (wrongPicks.has(Number(button.dataset.value))) markWrong(button);
  if (answered) {
    const right = main.querySelector(`.opt[data-value="${s.options[s.answer]}"]`);
    settle(right, true);
  }
}

/* The bar at the bottom holds exactly one next step: ask for a hint while
   the puzzle is open, sail on once it is solved. */
function mountActions() {
  const bar = document.getElementById("actions");
  if (!bar) return;
  const last = stop === STOPS.length - 1;

  if (answered) {
    bar.innerHTML = `<button class="btn" id="next" type="button">${last ? t(UI.last) : t(UI.next)}</button>`;
    document.getElementById("next").addEventListener("click", () => {
      haptic.tap();
      if (last) {
        view = "end";
        save("compass:save", { stop: 0, solved: 0, clean: 0, blots: [] });
        if (clean > load("compass:best", 0)) save("compass:best", clean);
        haptic.fanfare();
      } else {
        enterStop(stop + 1);
      }
      paint({ focus: true });
    });
    return;
  }

  if (hintShown) {
    bar.innerHTML = "";
    return;
  }

  bar.innerHTML = `<button class="btn btn--ghost" id="hint" type="button">${t(UI.hintBtn)}</button>`;
  document.getElementById("hint").addEventListener("click", () => {
    haptic.tap();
    hintShown = true;
    showHint();
    mountActions();
  });
}

/** Redraw a prop in place, so the rest of the stop stays put. */
function mountWidget(widget) {
  const root = document.getElementById("widget");
  root.innerHTML = renderWidget(widget, widgetState, answered);
  if (!answered) wireWidget(root, widget, widgetState, () => mountWidget(widget));
}

function showHint() {
  document.getElementById("hint-slot").innerHTML =
    `<p class="note pop"><b>${t(UI.hintLab)}</b> ${t(STOPS[stop].hint)}</p>`;
}

/** "stop 3 (hint) and stop 7 (second try)" */
function blotList() {
  const parts = blots.map((blot) =>
    t(blot.why === "hint" ? UI.blotHint : UI.blotRetry, blot.stop),
  );
  if (parts.length < 2) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} ${t(UI.andWord)} ${parts.at(-1)}`;
}

function endScreen() {
  setProgress({ label: t(UI.voyage), value: STOPS.length, max: STOPS.length });
  const best = load("compass:best", 0);
  main.innerHTML = `
    <div class="fade stack">
      <h1 id="head" tabindex="-1"><span class="sub">${t(UI.endKick)}</span>${t(UI.endTitle)}</h1>
      <div class="card card--flow">
        <p class="story">${t(UI.endText)}</p>
        <div class="pieces" role="img" aria-label="${t(UI.pieces)}">
          ${[...Array(5)].map(() => `<span class="piece got"></span>`).join("")}
        </div>
        <p class="story score">
          <b>${t(UI.allSolved)}</b><br>${t(UI.score, clean)}
        </p>
        ${blots.length ? `<p class="mono dim">${t(UI.blots, blotList())}</p>` : ""}
        <p class="mono dim">${t(UI.best, best)}</p>
        <div class="row"><button class="btn" id="again" type="button">${t(UI.again)}</button></div>
      </div>
      <details class="grownup">
        <summary>${t(UI.grownup)}</summary>
        <p>${t(UI.grownup1)}</p>
        <ol>${SKILLS.map((skill) => `<li>${t(skill)}</li>`).join("")}</ol>
        <p>${t(UI.grownup2)}</p>
      </details>
    </div>`;

  document.getElementById("again").addEventListener("click", () => {
    haptic.tap();
    solved = 0;
    clean = 0;
    blots = [];
    enterStop(0);
    view = "play";
    paint({ focus: true });
  });
}

/* ---------- answering ---------- */

const markWrong = (button) => {
  button.classList.add("wrong");
  button.disabled = true;
  if (!button.querySelector(".sr-only"))
    button.insertAdjacentHTML("beforeend", `<span class="sr-only"> — ${t(UI.srWrong)}</span>`);
};

function settle(button, silent = false) {
  button.classList.add("right");
  if (!button.querySelector(".sr-only"))
    button.insertAdjacentHTML("beforeend", `<span class="sr-only"> — ${t(UI.srCorrect)}</span>`);
  for (const other of main.querySelectorAll(".opt")) other.disabled = true;

  document.getElementById("feedback").innerHTML =
    `<p class="note note--win pop" role="status"><b>${t(UI.correct)}</b> ${t(STOPS[stop].why)}</p>`;

  if (!silent) {
    solved += 1;
    if (!hintShown && wrongPicks.size === 0) clean += 1;
    else blots.push({ stop: stop + 1, why: wrongPicks.size ? "retry" : "hint" });
    answered = true;
    save("compass:save", { stop, solved, clean, blots });
    haptic.win();
    setProgress({ label: t(UI.stopOf, stop + 1), value: stop + 1, max: STOPS.length });
  }
  answered = true;
  main.querySelector(".card")?.classList.add("card--answered");
  mountActions();
  if (STOPS[stop].widget) mountWidget(STOPS[stop].widget);
}

function choose(button) {
  if (answered) return;
  const s = STOPS[stop];
  const value = Number(button.dataset.value);

  if (value !== s.options[s.answer]) {
    wrongPicks.add(value);
    markWrong(button);
    haptic.miss();
    document.getElementById("feedback").innerHTML =
      `<p class="note note--miss pop" role="alert">${t(UI.miss)}</p>`;
    return;
  }
  settle(button);
}

/* ---------- shell ---------- */

function paint({ focus = false } = {}) {
  if (view === "title") titleScreen();
  else if (view === "play") playScreen();
  else endScreen();
  if (focus) document.getElementById("head")?.focus();
}

// Number keys pick an answer; Enter sails on. Kept out of the way of typing.
addEventListener("keydown", (event) => {
  if (view !== "play" || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

  if (event.key === "Enter" && answered && !(target instanceof HTMLButtonElement)) {
    document.getElementById("next")?.click();
    return;
  }
  const n = Number.parseInt(event.key, 10);
  if (!answered && n >= 1 && n <= order.length) {
    event.preventDefault();
    main.querySelector(`.opt[data-index="${n - 1}"]:not(:disabled)`)?.click();
  }
});

paint();
onLang(() => paint());
