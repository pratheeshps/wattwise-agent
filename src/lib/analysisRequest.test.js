import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ANALYSIS_GOAL, validateAnalysisRequest } from "./analysisRequest.js";

test("analysis request supplies a safe default goal", () => {
  assert.equal(validateAnalysisRequest({}).goal, DEFAULT_ANALYSIS_GOAL);
  assert.equal(validateAnalysisRequest({ goal: "  Compare last two bills  " }).goal, "Compare last two bills");
});

test("analysis request rejects malformed bodies and non-text goals", () => {
  assert.match(validateAnalysisRequest(null).error, /valid JSON/);
  assert.match(validateAnalysisRequest([]).error, /valid JSON/);
  assert.match(validateAnalysisRequest({ goal: 42 }).error, /must be text/);
});

test("analysis request enforces the 1,000-character prompt limit", () => {
  assert.match(validateAnalysisRequest({ goal: "x".repeat(1001) }).error, /1,000 characters/);
  assert.equal(validateAnalysisRequest({ goal: "x".repeat(1000) }).goal.length, 1000);
});
