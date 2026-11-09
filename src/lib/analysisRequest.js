import { normalizeBillingMonth } from "./monthlyAnalytics.js";

export const DEFAULT_ANALYSIS_GOAL = "Analyse the selected billing month, compare it with the previous available billing month, explain supported changes and identify data limitations.";

export function validateAnalysisRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Send a valid JSON request." };
  if (body.goal != null && typeof body.goal !== "string") return { error: "Analysis instructions must be text." };
  if (typeof body.selectedMonth !== "string" || !body.selectedMonth.trim()) {
    return { error: "Select a saved billing month before running analysis." };
  }

  const selectedMonth = normalizeBillingMonth(body.selectedMonth);
  if (!selectedMonth || selectedMonth !== body.selectedMonth.trim()) {
    return { error: "Billing month must use the YYYY-MM format." };
  }

  const goal = typeof body.goal === "string" && body.goal.trim() ? body.goal.trim() : DEFAULT_ANALYSIS_GOAL;
  if (goal.length > 1000) return { error: "Analysis instructions must be 1,000 characters or fewer." };
  return { goal, selectedMonth };
}
