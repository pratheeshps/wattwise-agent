import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_SOLAR_GENERATION,
  getSolarGenerationForBills,
  getSolarGenerationForMonth
} from "./solarGeneration.js";

test("source generation records preserve transcribed readings and provenance", () => {
  assert.deepEqual(
    SOURCE_SOLAR_GENERATION.map(({ monthKey, total, normal, offPeak, peak }) => ({
      monthKey, total, normal, offPeak, peak
    })),
    [
      { monthKey: "2026-09", total: 625, normal: 624, offPeak: 0, peak: 1 },
      { monthKey: "2026-10", total: 908, normal: 906, offPeak: 0, peak: 2 },
      { monthKey: "2026-11", total: 451, normal: 451, offPeak: 0, peak: 0 }
    ]
  );
  assert.equal(SOURCE_SOLAR_GENERATION[0].provenance, "source-recorded");
  assert.equal(SOURCE_SOLAR_GENERATION[0].unit, "kWh");
});

test("matches source generation using canonical month keys", () => {
  assert.equal(getSolarGenerationForMonth("September 2026").total, 625);
  assert.equal(getSolarGenerationForMonth("Sep 2026").total, 625);
  assert.equal(getSolarGenerationForMonth("09/2026").total, 625);
  assert.equal(getSolarGenerationForMonth("2026-09").total, 625);
});

test("returns unavailable for months without an explicit source reading", () => {
  assert.equal(getSolarGenerationForMonth("July 2026"), null);
  assert.equal(getSolarGenerationForMonth("December 2026"), null);
  assert.equal(getSolarGenerationForMonth("invalid"), null);
});

test("only exposes readings for saved net-metered bill months", () => {
  const readings = getSolarGenerationForBills([
    { billType: "net-metered", month: "Oct 2026" },
    { billType: "net-metered", month: "October 2026" },
    { billType: "standard", month: "September 2026" },
    { billType: "net-metered", month: "July 2026" }
  ]);
  assert.deepEqual(readings.map(record => record.monthKey), ["2026-10"]);
  assert.equal(readings[0].total, 908);
});

test("returns matched generation once per month in chronological order", () => {
  const readings = getSolarGenerationForBills([
    { billType: "net-metered", month: "November 2026" },
    { billType: "net-metered", month: "September 2026" },
    { billType: "net-metered", month: "October 2026" }
  ]);
  assert.deepEqual(readings.map(record => record.monthKey), [
    "2026-09", "2026-10", "2026-11"
  ]);
});

test("does not mutate source records or the supplied bill collection", () => {
  const bills = [{ billType: "net-metered", month: "October 2026" }];
  const before = JSON.stringify(bills);
  getSolarGenerationForBills(bills);
  assert.equal(JSON.stringify(bills), before);
  assert.equal(Object.isFrozen(SOURCE_SOLAR_GENERATION[0]), true);
});
