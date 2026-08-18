// Three straight cuts across a pancake. Drag either end of a cut and the
// pieces are recounted: put all three through the middle and you get six,
// spread them out and a seventh appears. That discovery is the whole point
// of the stop, so the child has to be able to move the knife.

import { t } from "../lib/i18n.js";
import * as haptic from "../lib/haptics.js";

const UI = {
  pancake: { en: "The pancake", es: "La tortita" },
  drag: {
    en: "Drag the ends of a cut, or use the arrow keys.",
    es: "Arrastra los extremos de un corte, o usa las flechas.",
  },
  pieces: { en: (n) => `Pieces: ${n}`, es: (n) => `Trozos: ${n}` },
  best: { en: (n) => `Best so far: ${n}`, es: (n) => `Tu récord: ${n}` },
  reset: { en: "Straighten the cuts", es: "Enderezar los cortes" },
  resetShort: { en: "Reset", es: "Reiniciar" },
  handle: {
    en: (cut, end) => `Cut ${cut}, ${end === 0 ? "first" : "second"} end`,
    es: (cut, end) => `Corte ${cut}, ${end === 0 ? "primer" : "segundo"} extremo`,
  },
};

/* Three cuts through the middle: six pieces, and room to do better. */
export const createPancakeState = () => ({
  cuts: [
    [90, 270],
    [30, 210],
    [150, 330],
  ],
  best: 6,
});

const TAU = Math.PI * 2;
const rad = (degrees) => (degrees * Math.PI) / 180;

/** A point on the rim, in percentages of the seat box. */
export const seat = (degrees) => ({
  x: 50 + 50 * Math.cos(rad(degrees)),
  y: 50 + 50 * Math.sin(rad(degrees)),
});

const intersect = (p1, p2, p3, p4) => {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null; // parallel
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  const inside = (v) => v > 0.002 && v < 0.998; // strictly inside both cuts
  if (!inside(t) || !inside(u)) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
};

/**
 * How many pieces the cuts make, by Euler's formula on the planar graph
 * (V - E + F = 2). Counting this way is right even when three cuts meet at
 * one point, which is exactly the case the puzzle turns on.
 */
export function countPieces(cuts) {
  const ends = cuts.flatMap(([a, b]) => [a, b]);
  const rims = [];
  for (const angle of ends) {
    const normalised = ((angle % 360) + 360) % 360;
    if (!rims.some((other) => Math.abs(other - normalised) < 0.5)) rims.push(normalised);
  }

  const points = cuts.map(([a, b]) => [seat(a), seat(b)]);
  const crossings = [];
  const onCut = cuts.map(() => 0);

  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const hit = intersect(points[i][0], points[i][1], points[j][0], points[j][1]);
      if (!hit) continue;
      const seen = crossings.find(
        (other) => Math.hypot(other.x - hit.x, other.y - hit.y) < 0.6,
      );
      const target = seen ?? hit;
      if (!seen) crossings.push(hit);
      for (const cut of [i, j]) if (!target[`c${cut}`]) ((target[`c${cut}`] = true), onCut[cut]++);
    }

  const vertices = rims.length + crossings.length;
  const edges = rims.length + cuts.reduce((total, _, i) => total + 1 + onCut[i], 0);
  return edges - vertices + 1;
}

const line = (cut, index) => {
  const from = seat(cut[0]);
  const to = seat(cut[1]);
  return `<line class="cut" data-cut="${index}" x1="${from.x}" y1="${from.y}"
    x2="${to.x}" y2="${to.y}" vector-effect="non-scaling-stroke"/>`;
};

export function pancakeWidget(widget, state, answered = false) {
  const pieces = countPieces(state.cuts);

  if (answered)
    return `
    <p class="ring-count ring-count--done">
      <b>${t(UI.pieces, pieces)}</b>
      <span class="tray-good">${t(UI.best, state.best)}</span>
    </p>`;

  return `
    <div class="ring-widget">
      <p class="sr-only" id="pan-label">${t(UI.pancake)}</p>
      <div class="pan" role="group" aria-labelledby="pan-label">
        <div class="pan-seats">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <ellipse class="pan-body" cx="50" cy="50" rx="50" ry="50"/>
            ${state.cuts.map(line).join("")}
          </svg>
          ${state.cuts
            .flatMap((cut, index) =>
              cut.map((angle, end) => {
                const at = seat(angle);
                return `<button type="button" class="handle" data-cut="${index}" data-end="${end}"
                  style="left:${at.x}%;top:${at.y}%"
                  aria-label="${t(UI.handle, index + 1, end)}"><span aria-hidden="true"></span></button>`;
              }),
            )
            .join("")}
        </div>
      </div>
      <div class="tray-foot">
        <p class="ring-count" role="status">
          <b>${t(UI.pieces, pieces)}</b>
          <span class="pan-best">${t(UI.best, state.best)}</span>
        </p>
        <button type="button" class="chip pan-reset" aria-label="${t(UI.reset)}">${t(UI.resetShort)}</button>
      </div>
      <p class="tray-help mono dim">${t(UI.drag)}</p>
    </div>`;
}

export function wirePancakeWidget(root, widget, state, repaint) {
  const box = root.querySelector(".pan-seats");
  const svg = root.querySelector(".pan svg");
  const readout = root.querySelector(".ring-count b");
  const bestOut = root.querySelector(".pan-best");

  /* Move one end and redraw in place: rebuilding the markup mid-drag would
     drop the pointer capture and the drag with it. */
  const move = (index, end, angle) => {
    const cut = state.cuts[index];
    const other = cut[end === 0 ? 1 : 0];
    const apart = ((((angle - other) % 360) + 360) % 360);
    // Stop a cut collapsing onto itself; a cut through the middle (180
    // degrees apart) is a perfectly good place to be.
    if (apart < 8 || apart > 352) return;
    cut[end] = ((angle % 360) + 360) % 360;

    const at = seat(cut[end]);
    const handle = box.querySelector(`.handle[data-cut="${index}"][data-end="${end}"]`);
    handle.style.left = `${at.x}%`;
    handle.style.top = `${at.y}%`;
    const drawn = svg.querySelector(`.cut[data-cut="${index}"]`);
    drawn.setAttribute(end === 0 ? "x1" : "x2", at.x);
    drawn.setAttribute(end === 0 ? "y1" : "y2", at.y);

    const pieces = countPieces(state.cuts);
    readout.textContent = t(UI.pieces, pieces);
    if (pieces > state.best) {
      state.best = pieces;
      bestOut.textContent = t(UI.best, pieces);
      haptic.win();
    }
  };

  const angleFrom = (event) => {
    const rect = box.getBoundingClientRect();
    return (
      (Math.atan2(
        event.clientY - (rect.top + rect.height / 2),
        event.clientX - (rect.left + rect.width / 2),
      ) *
        180) /
      Math.PI
    );
  };

  for (const handle of root.querySelectorAll(".handle")) {
    const index = Number(handle.dataset.cut);
    const end = Number(handle.dataset.end);

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      handle.classList.add("held");
      haptic.tap();
    });

    handle.addEventListener("pointermove", (event) => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      move(index, end, angleFrom(event));
    });

    for (const done of ["pointerup", "pointercancel"])
      handle.addEventListener(done, () => handle.classList.remove("held"));

    // Arrow keys do the same job without a pointer.
    handle.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 4, ArrowUp: 4, ArrowLeft: -4, ArrowDown: -4 }[event.key];
      if (step === undefined) return;
      event.preventDefault();
      move(index, end, state.cuts[index][end] + step);
    });
  }

  root.querySelector(".pan-reset")?.addEventListener("click", () => {
    const fresh = createPancakeState();
    state.cuts = fresh.cuts;
    haptic.tap();
    repaint();
  });
}

export { TAU };
