/* Pure helpers: no browser needed. */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { dms, flagEmoji } from "../src/atlas/geo.js";
import { countPieces } from "../src/compass/pancake.js";

describe("chart readout", () => {
  test("prints degrees and minutes, carrying a rounded 60", () => {
    assert.equal(dms([-60.9963, 14.0101]), "14°01′N 61°00′W");
    assert.equal(dms([0, 0]), "0°00′N 0°00′E");
    assert.equal(dms([-3.7038, 40.4168]), "40°25′N 3°42′W");
    assert.equal(dms([139.6917, 35.6895]), "35°41′N 139°42′E");
    assert.equal(dms([166.921, -0.548]), "0°33′S 166°55′E");
  });

  test("builds flag emoji from the country code", () => {
    assert.equal(flagEmoji("es"), "🇪🇸");
    assert.equal(flagEmoji("JP"), "🇯🇵");
  });
});

describe("pancake cuts", () => {
  const through = [
    [90, 270],
    [30, 210],
    [150, 330],
  ];

  test("three cuts through the middle make six pieces", () => {
    assert.equal(countPieces(through), 6);
  });

  test("three cuts in general position make seven", () => {
    assert.equal(
      countPieces([
        [80, 250],
        [10, 170],
        [140, 320],
      ]),
      7,
    );
  });

  test("cuts that miss each other make fewer", () => {
    assert.equal(
      countPieces([
        [90, 270],
        [80, 280],
        [100, 260],
      ]),
      4,
    );
    assert.equal(
      countPieces([
        [90, 260],
        [0, 150],
        [200, 340],
      ]),
      6,
    );
  });

  test("one cut cuts in two", () => {
    assert.equal(countPieces([[0, 180]]), 2);
  });
});
