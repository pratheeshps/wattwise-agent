export const DEFAULT_ANALYSIS_GOAL = "Analyse my saved electricity bills. Summarise month-on-month imported energy, exported energy and bill amount changes. Identify factual trends and explain limitations.";

export function validateAnalysisRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Send a valid JSON request." };
  if (body.goal != null && typeof body.goal !== "string") return { error: "Analysis instructions must be text." };
  const goal = typeof body.goal === "string" && body.goal.trim() ? body.goal.trim() : DEFAULT_ANALYSIS_GOAL;
  if (goal.length > 1000) return { error: "Analysis instructions must be 1,000 characters or fewer." };
  return { goal };
}
