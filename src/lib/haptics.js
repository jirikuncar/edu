// Short vibrations that confirm a tap without a sound.
//
// navigator.vibrate exists on Android (Chrome/Firefox) but not on iOS Safari,
// so this is a progressive enhancement: everything below is a no-op when the
// API is missing. Patterns stay under ~120ms total — a nudge, not a buzz.

import { load, save } from "./store.js";

export const HAPTICS_EVENT = "edu:haptics";

export const hapticsSupported = () =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

let enabled = load("haptics", true) !== false;

export const hapticsEnabled = () => enabled;

export function setHaptics(next) {
  enabled = !!next;
  save("haptics", enabled);
  window.dispatchEvent(new CustomEvent(HAPTICS_EVENT, { detail: enabled }));
  if (enabled) tap();
}

export function onHaptics(handler) {
  const wrapped = (event) => handler(event.detail);
  window.addEventListener(HAPTICS_EVENT, wrapped);
  return () => window.removeEventListener(HAPTICS_EVENT, wrapped);
}

const buzz = (pattern) => {
  if (!enabled || !hapticsSupported()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw when the page is not visible */
  }
};

/** A choice was registered. */
export const tap = () => buzz(10);
/** Correct answer. */
export const win = () => buzz([14, 45, 24]);
/** Wrong answer — longer and flatter, so it feels different from `win`. */
export const miss = () => buzz([28, 55, 28]);
/** End of a round or voyage. */
export const fanfare = () => buzz([16, 40, 16, 40, 70]);
/** Timer ran out. */
export const timeout = () => buzz([60, 60, 60]);
