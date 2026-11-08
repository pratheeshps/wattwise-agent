import { NextResponse } from "next/server";
import { runAgent } from "../../../agent.js";
import { getBills } from "../../../services/billStore.js";

export const runtime = "nodejs";

const DEFAULT_GOAL = "Analyse my saved electricity bills. Summarise month-on-month imported energy, exported energy and bill amount changes. Identify factual trends and explain limitations.";

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
    }

    const goal = typeof body.goal === "string" && body.goal.trim()
      ? body.goal.trim()
      : DEFAULT_GOAL;

    if (goal.length > 1000) {
      return NextResponse.json({ error: "Analysis instructions must be 1,000 characters or fewer." }, { status: 400 });
    }

    if (!getBills().length) {
      return NextResponse.json({ error: "Upload at least one bill before running an analysis." }, { status: 400 });
    }

    const report = await runAgent(goal);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("POST /api/analyze:", error);
    if (error.message?.includes("Configure ANTHROPIC_AUTH_TOKEN")) {
      return NextResponse.json({
        error: "AI analysis is not configured. Set ANTHROPIC_AUTH_TOKEN and ANTHROPIC_MODEL in your local .env file, then restart the app."
      }, { status: 503 });
    }
    return NextResponse.json({
      error: "The AI analysis could not be completed. Check your provider configuration and server logs."
    }, { status: 502 });
  }
}
