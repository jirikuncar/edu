// The bar at the top of every page. Two shapes:
//
//   home  — brand, section links, language switch
//   game  — a way back, and this round's progress. Nothing else, so the
//           child sees how far along they are instead of a site title.

import { getLang, setLang, onLang, applyLang, t } from "./i18n.js";
import { tap } from "./haptics.js";

const BASE = import.meta.env.BASE_URL;

export const SITE = { en: "Amber Sea", es: "Mar de Ámbar" };

export const SECTIONS = [
  {
    id: "compass",
    href: `${BASE}compass/`,
    nav: { en: "Compass", es: "Brújula" },
    title: { en: "The Golden Compass", es: "La Brújula Dorada" },
  },
  {
    id: "atlas",
    href: `${BASE}atlas/`,
    nav: { en: "Atlas", es: "Atlas" },
    title: { en: "Atlas Drill", es: "El Atlas" },
  },
];

const UI = {
  skip: { en: "Skip to content", es: "Ir al contenido" },
  sections: { en: "Sections", es: "Secciones" },
  language: { en: "Language", es: "Idioma" },
  english: { en: "English", es: "Inglés" },
  spanish: { en: "Spanish", es: "Español" },
  back: { en: "Leave and go home", es: "Salir e ir al inicio" },
};

const MARK = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <circle cx="16" cy="16" r="13.5" fill="none" stroke="#F2B441" stroke-width="1.6"/>
  <path d="M16 3.5 L19 13 L28.5 16 L19 19 L16 28.5 L13 19 L3.5 16 L13 13 Z"
        fill="#F2B441"/>
  <circle cx="16" cy="16" r="2.4" fill="#061626"/>
</svg>`;

const CHEVRON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* The little ship rides the head of the progress track. */
const SHIP = `<svg class="ship" viewBox="-15 -19 30 32" aria-hidden="true" focusable="false">
  <path d="M-10 4 L10 4 L6 11 L-6 11 Z" fill="#FFF4DE"/>
  <path d="M0.6 3 L0.6 -16 L11 -3 Z" fill="#F2B441"/>
  <line x1="0" y1="4" x2="0" y2="-16" stroke="#FFF4DE" stroke-width="2"/>
</svg>`;

let progress = { label: "", value: null, max: null };

/**
 * Render the shell into `host`.
 * `active` is "home" for the hub, or a section id for a game page.
 */
export function mountShell(host, active = "home") {
  applyLang();
  const isHome = active === "home";

  const paint = () => {
    const lang = getLang();

    host.innerHTML = isHome
      ? `
      <a class="skip" href="#main">${t(UI.skip)}</a>
      <header class="shell">
        <a class="shell-brand" href="${BASE}" aria-current="page">
          ${MARK}<span>${t(SITE)}</span>
        </a>
        <nav class="shell-nav" aria-label="${t(UI.sections)}">
          ${SECTIONS.map((section) => `<a href="${section.href}">${t(section.nav)}</a>`).join("")}
        </nav>
        <div class="lang" role="group" aria-label="${t(UI.language)}">
          <button type="button" data-lang="en" lang="en"
            aria-pressed="${lang === "en"}" aria-label="${t(UI.english)}">EN</button>
          <button type="button" data-lang="es" lang="es"
            aria-pressed="${lang === "es"}" aria-label="${t(UI.spanish)}">ES</button>
        </div>
      </header>`
      : `
      <a class="skip" href="#main">${t(UI.skip)}</a>
      <header class="shell shell--game">
        <a class="shell-back" href="${BASE}" aria-label="${t(UI.back)}">${CHEVRON}</a>
        <div class="shell-progress" id="shell-progress">
          <p class="shell-progress-label" id="shell-progress-label"></p>
          <div class="track" id="shell-track" role="progressbar"><i></i>${SHIP}</div>
          <p class="shell-count" id="shell-count" aria-hidden="true"></p>
        </div>
      </header>`;

    for (const button of host.querySelectorAll(".lang button"))
      button.addEventListener("click", () => {
        tap();
        setLang(button.dataset.lang);
      });

    if (!isHome) applyProgress();
  };

  paint();
  onLang(paint);
}

function applyProgress() {
  const label = document.getElementById("shell-progress-label");
  const track = document.getElementById("shell-track");
  const count = document.getElementById("shell-count");
  if (!label || !track || !count) return;

  const measured = progress.max != null && progress.value != null;

  // Unmeasured screens (title, summary) just name themselves.
  label.textContent = measured ? "" : progress.label;
  label.hidden = measured;
  track.hidden = !measured;
  count.hidden = !measured;
  if (!measured) return;

  const ratio = progress.max ? Math.min(1, progress.value / progress.max) : 0;
  track.querySelector("i").style.width = `${ratio * 100}%`;
  track.style.setProperty("--at", `${ratio * 100}%`);
  track.setAttribute("aria-label", progress.label);
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", String(progress.max));
  track.setAttribute("aria-valuenow", String(progress.value));
  track.setAttribute("aria-valuetext", progress.label);
  count.textContent = `${progress.value}/${progress.max}`;
}

/**
 * Show where the player is. `value`/`max` may be omitted for screens that
 * have no position in a round (title, summary).
 */
export function setProgress({ label, value = null, max = null }) {
  progress = { label, value, max };
  applyProgress();
}

/** Keep <title> in step with the language. */
export function bindTitle(entry) {
  const set = () => {
    document.title = `${t(entry)} · ${t(SITE)}`;
  };
  set();
  onLang(set);
}
