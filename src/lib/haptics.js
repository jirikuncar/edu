// Short vibrations that confirm a tap without a sound.
//
// Two mechanisms, because there is no single web haptics API:
//
//   1. navigator.vibrate — Android (Chrome, Firefox, Samsung). Takes a
//      pattern, so a correct answer can feel different from a wrong one.
//   2. iOS: Safari has never shipped navigator.vibrate. What it does have,
//      since 17.4, is the switch control, which plays the system haptic
//      when it is toggled. Toggling a hidden one inside the tap handler is
//      the only way to make an iPhone buzz from a web page. It is a single
//      tick with no pattern, so every cue feels the same there.
//
// Both are progressive enhancements: on anything else this is a no-op.

import { load, save } from "./store.js";

export const HAPTICS_EVENT = "edu:haptics";

const canVibrate = () =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

const canSwitch = () =>
  typeof document !== "undefined" && "switch" in document.createElement("input");

export const hapticsSupported = () => canVibrate() || canSwitch();

/** True when the device can only manage one undifferentiated tick. */
export const hapticsAreFlat = () => !canVibrate() && canSwitch();

let pad = null;

/** Toggle an off-screen switch: iOS plays its own haptic for the gesture.
 *  Must run inside the user's tap, or the platform ignores it. */
function tick() {
  if (!canSwitch()) return;
  if (!pad) {
    pad = document.createElement("input");
    pad.type = "checkbox";
    pad.setAttribute("switch", "");
    pad.setAttribute("aria-hidden", "true");
    pad.tabIndex = -1;
    pad.style.cssText =
      "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.append(pad);
  }
  pad.click();
}

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
  if (!enabled) return;
  if (canVibrate()) {
    try {
      navigator.vibrate(pattern);
      return;
    } catch {
      /* some browsers throw when the page is not visible */
    }
  }
  tick();
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
