import { NextResponse } from "next/server";
import { runAgent } from "../../../agent.js";
import { getBills } from "../../../services/billStore.js";
import { validateAnalysisRequest } from "../../../lib/analysisRequest.js";
import { buildMonthScopedAnalysis } from "../../../lib/monthScopedAnalysis.js";
import { getSolarGenerationForBills } from "../../../lib/solarGeneration.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 }); }

    const validation = validateAnalysisRequest(body);
    if (validation.error) return NextResponse.json({ error: validation.error }, { status: 400 });

    const bills = getBills();
    if (!bills.length) {
      return NextResponse.json({ error: "Upload at least one bill before running an analysis." }, { status: 400 });
    }

    const evidence = buildMonthScopedAnalysis(
      bills,
      validation.selectedMonth,
      getSolarGenerationForBills(bills)
    );
    if (!evidence) {
      return NextResponse.json({ error: "The selected billing month is not available in saved bills. Refresh the dashboard and try again." }, { status: 400 });
    }

    const report = await runAgent(validation.goal, validation.selectedMonth);
    return NextResponse.json({
      report,
      context: {
        selectedPeriod: evidence.selectedPeriod,
        comparisonPeriod: evidence.comparisonPeriod,
        coverage: evidence.coverage
      }
    });
  } catch (error) {
    console.error("POST /api/analyze:", error);
    if (error.message?.includes("Configure ANTHROPIC_AUTH_TOKEN")) {
      return NextResponse.json({ error: "AI analysis is not configured. Set ANTHROPIC_AUTH_TOKEN and ANTHROPIC_MODEL in your local .env file, then restart the app." }, { status: 503 });
    }
    return NextResponse.json({ error: "The AI analysis could not be completed. Check your provider configuration and server logs." }, { status: 502 });
  }
}
