import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthScopedAnalysis } from "./monthScopedAnalysis.js";
import { getSolarGenerationForMonth } from "./solarGeneration.js";

test("builds selected and previous available month evidence with deterministic deltas", () => {
  const bills = [
    { id: "jul", month: "July 2026", importedUnits: 100, exportedUnits: 10, amount: 500 },
    { id: "sep", month: "September 2026", importedUnits: 150, exportedUnits: 15, amount: 650 }
  ];
  const result = buildMonthScopedAnalysis(bills, "2026-09");
  assert.equal(result.selectedPeriod.label, "September 2026");
  assert.equal(result.comparisonPeriod.label, "July 2026");
  assert.equal(result.current.importedEnergy.value, 150);
  assert.equal(result.previous.importedEnergy.value, 100);
  assert.deepEqual(result.comparisons.importedEnergy, {
    difference: 50, percent: 50, provenance: "deterministically-calculated"
  });
});

test("uses latest-upload-wins for both selected and comparison months", () => {
  const result = buildMonthScopedAnalysis([
    { id: "sep-old", month: "September 2026", uploadedAt: "2026-09-01T10:00:00Z", units: 90 },
    { id: "sep-new", month: "September 2026", uploadedAt: "2026-09-02T10:00:00Z", units: 120 },
    { id: "oct", month: "October 2026", units: 140 }
  ], "2026-10");
  assert.equal(result.previous.importedEnergy.value, 120);
  assert.equal(result.coverage.savedBillCountForSelectedMonth, 1);
});

test("keeps missing values unavailable and true zero as zero", () => {
  const result = buildMonthScopedAnalysis([
    { id: "sep", month: "September 2026", importedUnits: 0, amount: 0 },
    { id: "oct", month: "October 2026", importedUnits: null, amount: 0 }
  ], "2026-10");
  assert.equal(result.current.importedEnergy.value, null);
  assert.equal(result.current.billAmount.value, 0);
  assert.equal(result.comparisons.importedEnergy.difference, null);
  assert.equal(result.comparisons.billAmount.difference, 0);
  assert.equal(result.comparisons.billAmount.percent, null);
});

test("zero previous value has no percentage change", () => {
  const result = buildMonthScopedAnalysis([
    { id: "sep", month: "September 2026", importedUnits: 0 },
    { id: "oct", month: "October 2026", importedUnits: 50 }
  ], "2026-10");
  assert.equal(result.comparisons.importedEnergy.difference, 50);
  assert.equal(result.comparisons.importedEnergy.percent, null);
});

test("solar generation is matched only to net-metered bill months", () => {
  const generation = [getSolarGenerationForMonth("October 2026")];
  const result = buildMonthScopedAnalysis([
    { id: "sep", month: "September 2026", billType: "net-metered" },
    { id: "oct", month: "October 2026", billType: "net-metered" }
  ], "2026-10", generation);
  assert.equal(result.current.solarGeneration.value, 908);
  assert.equal(result.previous.solarGeneration.value, null);
});

test("returns null for a month that has no saved bill", () => {
  assert.equal(buildMonthScopedAnalysis([{ month: "October 2026" }], "2026-09"), null);
});
