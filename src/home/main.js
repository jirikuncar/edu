import "../styles/app.css";
import "./home.css";

import { mountShell, bindTitle, SITE, SECTIONS } from "../lib/shell.js";
import { t, onLang } from "../lib/i18n.js";
import {
  hapticsSupported,
  hapticsAreFlat,
  hapticsEnabled,
  setHaptics,
  tap,
} from "../lib/haptics.js";
import { load, remove } from "../lib/store.js";

const UI = {
  tagline: { en: "Two voyages, one little ship", es: "Dos viajes, un solo barco" },
  lead: {
    en: "Maths puzzles and the whole world map, built for children who are learning to think out loud. Everything works without a connection once the page has loaded.",
    es: "Enigmas de matemáticas y el mapa del mundo entero, para niños que aprenden a pensar en voz alta. Todo funciona sin conexión una vez cargada la página.",
  },
  compassBlurb: {
    en: "Fifteen stops across the Amber Sea. Counting, patterns, balances, cuts and the two classic traps — one guardian and one puzzle at a time.",
    es: "Quince paradas por el Mar de Ámbar. Contar, series, balanzas, cortes y las dos trampas clásicas: un guardián y un enigma cada vez.",
  },
  atlasBlurb: {
    en: "195 countries. Flags, capitals and outlines, drilled with questions that come back to whatever you keep getting wrong.",
    es: "195 países. Banderas, capitales y siluetas, con preguntas que vuelven a lo que se te resiste.",
  },
  compassAges: { en: "Ages 6–10 · 15 puzzles", es: "6–10 años · 15 enigmas" },
  atlasAges: { en: "Ages 8+ · 12 per round", es: "8+ años · 12 por ronda" },
  open: { en: "Open", es: "Abrir" },
  bestRun: {
    en: (n) => `Best run so far: ${n} of 15 with no hint`,
    es: (n) => `Mejor intento: ${n} de 15 sin pistas`,
  },
  mastered: {
    en: (n) => `${n} ${n === 1 ? "country" : "countries"} mastered`,
    es: (n) => `${n} ${n === 1 ? "país dominado" : "países dominados"}`,
  },
  notStarted: { en: "Not started yet", es: "Sin empezar" },

  installTitle: { en: "Put it on the home screen", es: "Ponlo en la pantalla de inicio" },
  installBtn: { en: "Install app", es: "Instalar la app" },
  installReady: {
    en: "This browser can add Amber Sea to the home screen right now.",
    es: "Este navegador puede añadir Mar de Ámbar a la pantalla de inicio ahora mismo.",
  },
  installed: {
    en: "Installed. It opens like any other app and works offline.",
    es: "Instalada. Se abre como cualquier app y funciona sin conexión.",
  },
  installIOS: {
    en: "In Safari, tap the Share button, then <b>Add to Home Screen</b>. It then opens full screen and works offline.",
    es: "En Safari, toca Compartir y luego <b>Añadir a pantalla de inicio</b>. Se abrirá a pantalla completa y funcionará sin conexión.",
  },
  installOther: {
    en: "In Chrome, open the browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.",
    es: "En Chrome, abre el menú del navegador y elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.",
  },
  offlineReady: { en: "Saved for offline use", es: "Guardado para usar sin conexión" },
  offlineWait: { en: "Saving for offline use…", es: "Guardando para usar sin conexión…" },

  grown: { en: "Settings and notes for a grown-up", es: "Ajustes y notas para un adulto" },
  haptics: { en: "Vibration on answers", es: "Vibración al responder" },
  hapticsNone: {
    en: "This browser does not let a web page vibrate the device, so there is nothing to turn on.",
    es: "Este navegador no permite que una página web haga vibrar el dispositivo, así que no hay nada que activar.",
  },
  hapticsFlat: {
    en: "On iPhone and iPad every cue feels the same: Safari gives web pages one short tap and no patterns.",
    es: "En iPhone y iPad todos los avisos se sienten igual: Safari solo permite un toque corto, sin patrones.",
  },
  privacy: {
    en: "Nothing leaves the device. Progress, names and high scores live in this browser's own storage, and there are no accounts, adverts or trackers.",
    es: "Nada sale del dispositivo. El progreso, los nombres y las puntuaciones se guardan en este navegador: sin cuentas, sin anuncios y sin rastreadores.",
  },
  reset: { en: "Erase all progress", es: "Borrar todo el progreso" },
  resetAsk: {
    en: "Erase all saved progress and high scores on this device?",
    es: "¿Borrar todo el progreso y las puntuaciones guardadas en este dispositivo?",
  },
  resetDone: { en: "Progress erased.", es: "Progreso borrado." },
};

const ART = {
  compass: `<svg viewBox="0 0 72 72" class="tile-art" aria-hidden="true" focusable="false">
    <circle cx="36" cy="36" r="30" fill="rgba(242,180,65,.1)" stroke="#F2B441" stroke-width="2"/>
    <path d="M36 6 L43 29 L66 36 L43 43 L36 66 L29 43 L6 36 L29 29 Z" fill="#F2B441"/>
    <circle cx="36" cy="36" r="5" fill="#061626"/>
    <circle cx="36" cy="36" r="2" fill="#79E3C0"/>
  </svg>`,
  atlas: `<svg viewBox="0 0 72 72" class="tile-art" aria-hidden="true" focusable="false">
    <circle cx="36" cy="36" r="30" fill="rgba(121,227,192,.1)" stroke="#F2B441" stroke-width="2"/>
    <ellipse cx="36" cy="36" rx="13" ry="30" fill="none" stroke="#F2B441" stroke-width="1.6"/>
    <path d="M6 36h60M11 22h50M11 50h50" stroke="#F2B441" stroke-width="1.6" opacity=".65"/>
    <path d="M22 27c5-3 9 2 14 0s7-5 11-2-2 8 1 12-6 9-11 7-4-6-9-7-9-7-6-10Z" fill="#79E3C0"/>
  </svg>`,
};

const main = document.getElementById("main");
mountShell(document.getElementById("shell"), "home");
bindTitle({ en: "Maths and the world, for kids", es: "Matemáticas y el mundo, para niños" });

/* ---------- install state ---------- */

let installEvent = null;
const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installEvent = event;
  updateInstall();
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  updateInstall();
});

let flash = "";
let offlineReady = false;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then(() => {
    offlineReady = true;
    updateOffline();
  });
}

/* ---------- progress summaries ---------- */

const compassSummary = () => {
  const best = load("compass:best", null);
  return best === null ? t(UI.notStarted) : t(UI.bestRun, best);
};

const atlasSummary = () => {
  const stats = load("atlas:stats", null);
  if (!stats) return t(UI.notStarted);
  let mastered = 0;
  for (const per of Object.values(stats)) {
    const cells = Object.values(per);
    const seen = cells.reduce((sum, cell) => sum + cell.seen, 0);
    const right = cells.reduce((sum, cell) => sum + cell.right, 0);
    if (seen >= 3 && right / seen >= 0.8) mastered += 1;
  }
  return mastered ? t(UI.mastered, mastered) : t(UI.notStarted);
};

/* ---------- render ---------- */

const tile = (section, art, blurb, ages, progress) => `
  <li>
    <a class="card tile" href="${section.href}">
      ${art}
      <div class="tile-body">
        <h2>${t(section.title)}</h2>
        <p class="mono dim tile-ages">${ages}</p>
        <p class="tile-blurb">${blurb}</p>
        <p class="mono tile-progress">${progress}</p>
      </div>
      <span class="tile-go" aria-hidden="true">${t(UI.open)}</span>
    </a>
  </li>`;

function installBlock() {
  if (isStandalone()) return `<p class="story">${t(UI.installed)}</p>`;
  if (installEvent)
    return `<p class="story">${t(UI.installReady)}</p>
      <button class="btn" id="install" type="button">${t(UI.installBtn)}</button>`;
  return `<p class="story">${isIOS() ? t(UI.installIOS) : t(UI.installOther)}</p>`;
}

/** Repaint just the offline line — a full repaint would replay the fade. */
function updateOffline() {
  const line = document.getElementById("offline-state");
  if (!line) return;
  line.innerHTML = `<span class="dot ${offlineReady ? "on" : ""}" aria-hidden="true"></span>
    ${offlineReady ? t(UI.offlineReady) : t(UI.offlineWait)}`;
}

/** Same for the install block, which appears when the browser offers it. */
function updateInstall() {
  const slot = document.getElementById("install-slot");
  if (!slot) return;
  slot.innerHTML = installBlock();
  wireInstall();
}

function wireInstall() {
  const install = document.getElementById("install");
  if (!install) return;
  install.addEventListener("click", async () => {
    tap();
    const event = installEvent;
    installEvent = null;
    await event?.prompt();
    updateInstall();
  });
}

let firstPaint = true;

function paint() {
  main.innerHTML = `
    <div class="${firstPaint ? "fade " : ""}stack">
      <div>
        <h1><span class="sub">${t(UI.tagline)}</span>${t(SITE)}</h1>
        <p class="story lead">${t(UI.lead)}</p>
      </div>

      <nav aria-label="${t({ en: "Activities", es: "Actividades" })}">
        <ul class="tiles">
          ${tile(SECTIONS[0], ART.compass, t(UI.compassBlurb), t(UI.compassAges), compassSummary())}
          ${tile(SECTIONS[1], ART.atlas, t(UI.atlasBlurb), t(UI.atlasAges), atlasSummary())}
        </ul>
      </nav>

      <section class="card card--flow" aria-labelledby="install-h">
        <h2 id="install-h">${t(UI.installTitle)}</h2>
        <div id="install-slot">${installBlock()}</div>
        <p class="mono dim offline-state" id="offline-state">
          <span class="dot ${offlineReady ? "on" : ""}" aria-hidden="true"></span>
          ${offlineReady ? t(UI.offlineReady) : t(UI.offlineWait)}
        </p>
      </section>

      <section class="card card--flow" aria-labelledby="grown-h">
        <h2 id="grown-h" class="eyebrow">${t(UI.grown)}</h2>
        <div class="grown-body">
          <button class="switch" id="haptics" type="button" role="switch"
            aria-checked="${hapticsEnabled() && hapticsSupported()}"
            ${hapticsSupported() ? "" : "disabled"}>
            <span class="track" aria-hidden="true"></span>
            <span>${t(UI.haptics)}</span>
          </button>
          ${
            hapticsSupported()
              ? hapticsAreFlat()
                ? `<p class="mono dim">${t(UI.hapticsFlat)}</p>`
                : ""
              : `<p class="mono dim">${t(UI.hapticsNone)}</p>`
          }
          <p class="story">${t(UI.privacy)}</p>
          <button class="btn btn--ghost" id="reset" type="button">${t(UI.reset)}</button>
          <p class="mono dim" id="reset-note" role="status">${flash}</p>
        </div>
      </section>
    </div>`;

  firstPaint = false;
  wireInstall();

  const haptics = document.getElementById("haptics");
  haptics.addEventListener("click", () => {
    const next = haptics.getAttribute("aria-checked") !== "true";
    setHaptics(next);
    haptics.setAttribute("aria-checked", String(next));
  });

  document.getElementById("reset").addEventListener("click", () => {
    if (!confirm(t(UI.resetAsk))) return;
    for (const key of ["compass:best", "atlas:stats", "atlas:board", "atlas:player"])
      remove(key);
    flash = t(UI.resetDone);
    paint();
    // role="status" only announces content that arrives after the node exists
    document.getElementById("reset").focus();
  });
}

paint();
onLang(paint);
