// Minimal TopoJSON reader — the world-atlas file is quantised and
// delta-encoded, and decoding it here saves pulling in topojson-client.

import { MAINLAND } from "./countries.js";

export function decodeTopology(topo) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;

  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map((point) => {
      x += point[0];
      y += point[1];
      return [x * sx + tx, y * sy + ty];
    });
  });

  const stitch = (indexes) => {
    const out = [];
    for (const index of indexes) {
      const arc = index < 0 ? arcs[~index].slice().reverse() : arcs[index];
      out.push(...(out.length ? arc.slice(1) : arc));
    }
    return out;
  };

  const shapes = new Map();
  for (const geometry of topo.objects.countries.geometries) {
    if (geometry.id == null || !geometry.arcs) continue;
    const rings =
      geometry.type === "Polygon"
        ? [geometry.arcs.map(stitch)]
        : geometry.arcs.map((polygon) => polygon.map(stitch));
    shapes.set(String(geometry.id), rings);
  }
  return shapes;
}

const ringCentroid = (ring) => {
  let x = 0;
  let y = 0;
  for (const point of ring) {
    x += point[0];
    y += point[1];
  }
  return [x / ring.length, y / ring.length];
};

export function toFeature(polygons, a2) {
  const box = MAINLAND[a2];
  let keep = polygons;
  if (box) {
    const inside = polygons.filter((polygon) => {
      const [x, y] = ringCentroid(polygon[0]);
      return x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
    });
    if (inside.length) keep = inside;
  }
  return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: keep } };
}

/** Degrees and minutes, the way a chart margin would print them. */
export const dms = ([lon, lat]) => {
  const part = (value, positive, negative) => {
    const degrees = Math.floor(Math.abs(value));
    const minutes = Math.round((Math.abs(value) - degrees) * 60);
    return `${degrees}°${String(minutes).padStart(2, "0")}′${value >= 0 ? positive : negative}`;
  };
  return `${part(lat, "N", "S")} ${part(lon, "E", "W")}`;
};

/** 🇪🇸 from "ES" — regional indicator symbols. */
export const flagEmoji = (a2) =>
  String.fromCodePoint(
    ...[...a2.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
