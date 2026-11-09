import { NextResponse } from 'next/server';
import { runAgent } from '../../../agent.js';
import { getRequiredSession } from '../../../lib/requireSession.js';
import { getBillsForUser } from '../../../services/postgresBillStore.js';
import { validateAnalysisRequest } from '../../../lib/analysisRequest.js';
import { buildMonthScopedAnalysis } from '../../../lib/monthScopedAnalysis.js';
import { getSolarGenerationForBills } from '../../../lib/solarGeneration.js';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    const { user } = await getRequiredSession();
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }
    const v = validateAnalysisRequest(body);
    if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
    const bills = await getBillsForUser(user.id);
    if (!bills.length) return NextResponse.json({ error: 'Upload a bill first.' }, { status: 400 });
    const evidence = buildMonthScopedAnalysis(
      bills,
      v.selectedMonth,
      getSolarGenerationForBills(bills),
    );
    if (!evidence)
      return NextResponse.json({ error: 'Selected month not found.' }, { status: 400 });
    const report = await runAgent(v.goal, v.selectedMonth, bills);
    return NextResponse.json({
      report,
      context: {
        selectedPeriod: evidence.selectedPeriod,
        comparisonPeriod: evidence.comparisonPeriod,
        coverage: evidence.coverage,
      },
    });
  } catch (e) {
    if (e.status === 401)
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    console.error(e);
    if (e.message?.includes('Configure ANTHROPIC_AUTH_TOKEN'))
      return NextResponse.json({ error: 'AI analysis is not configured.' }, { status: 503 });
    return NextResponse.json({ error: 'Analysis failed.' }, { status: 502 });
  }
}
