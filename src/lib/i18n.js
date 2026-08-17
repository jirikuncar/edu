// One language choice for the whole site, kept in localStorage and broadcast
// so vanilla pages and the React app stay in sync.

import { load, save } from "./store.js";

export const LANGS = ["en", "es"];
export const LANG_EVENT = "edu:lang";

const detect = () => {
  const saved = load("lang");
  if (LANGS.includes(saved)) return saved;
  const tags = navigator.languages || [navigator.language || "en"];
  return tags.some((tag) => /^es\b/i.test(tag || "")) ? "es" : "en";
};

let current = detect();

export const getLang = () => current;

export function setLang(next) {
  if (!LANGS.includes(next) || next === current) return;
  current = next;
  save("lang", next);
  document.documentElement.lang = next;
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: next }));
}

/** Read a {en, es} bundle, or call a {en, es} pair of functions. */
export const t = (entry, ...args) => {
  const value = entry?.[current] ?? entry?.en;
  return typeof value === "function" ? value(...args) : value;
};

export function onLang(handler) {
  const wrapped = (event) => handler(event.detail);
  window.addEventListener(LANG_EVENT, wrapped);
  return () => window.removeEventListener(LANG_EVENT, wrapped);
}

/** Set <html lang> to the stored choice on first paint. */
export function applyLang() {
  document.documentElement.lang = current;
}
