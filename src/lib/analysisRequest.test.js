import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ANALYSIS_GOAL, validateAnalysisRequest } from "./analysisRequest.js";

test("analysis request supplies a safe default goal for a valid selected month", () => {
  const result = validateAnalysisRequest({ selectedMonth: "2026-10" });
  assert.equal(result.goal, DEFAULT_ANALYSIS_GOAL);
  assert.equal(result.selectedMonth, "2026-10");
  assert.equal(validateAnalysisRequest({
    selectedMonth: "2026-10",
    goal: "  Explain October  "
  }).goal, "Explain October");
});

test("analysis request rejects malformed bodies, non-text goals and missing months", () => {
  assert.match(validateAnalysisRequest(null).error, /valid JSON/);
  assert.match(validateAnalysisRequest([]).error, /valid JSON/);
  assert.match(validateAnalysisRequest({ selectedMonth: "2026-10", goal: 42 }).error, /must be text/);
  assert.match(validateAnalysisRequest({}).error, /Select a saved billing month/);
});

test("analysis request accepts only canonical valid YYYY-MM month keys", () => {
  assert.match(validateAnalysisRequest({ selectedMonth: "2026-13" }).error, /YYYY-MM/);
  assert.match(validateAnalysisRequest({ selectedMonth: "October 2026" }).error, /YYYY-MM/);
  assert.equal(validateAnalysisRequest({ selectedMonth: "2026-10" }).selectedMonth, "2026-10");
});

test("analysis request enforces the 1,000-character prompt limit", () => {
  assert.match(validateAnalysisRequest({ selectedMonth: "2026-10", goal: "x".repeat(1001) }).error, /1,000 characters/);
  assert.equal(validateAnalysisRequest({ selectedMonth: "2026-10", goal: "x".repeat(1000) }).goal.length, 1000);
});
