"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import AnalysisReport from "./AnalysisReport";

const DEFAULT_GOAL = "Explain the selected month's electricity readings, compare them with the previous available billing month, and identify evidence-based observations and limitations.";

export default function AnalysisPanel({ billCount, selectedMonth, monthLabel }) {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [report, setReport] = useState("");
  const [context, setContext] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setReport("");
    setContext(null);
    setError("");
    setCopied(false);
  }, [selectedMonth]);

  async function runAnalysis() {
    if (!selectedMonth) return;
    setLoading(true);
    setError("");
    setCopied(false);
    setReport("");
    setContext(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, selectedMonth })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not run the analysis.");
      setReport(result.report || "The analysis returned an empty report.");
      setContext(result.context || null);
    } catch (err) {
      setError(err.message || "Could not run the analysis.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setError("Could not copy the report. Check your browser clipboard permissions.");
    }
  }

  return (
    <section className="analysis-section dashboard-panel" aria-labelledby="analysis-heading">
      <div className="panel-heading">
        <div><p className="eyebrow">03 / INTELLIGENT ANALYSIS</p><h2 id="analysis-heading">Understand your energy story</h2></div>
        <span className="analysis-provider-note"><i className="pi pi-sparkles" /> AI-powered</span>
      </div>
      <p className="analysis-description">
        Analyse {monthLabel || "the selected billing month"} and compare it with the previous available saved billing month. Numeric changes are calculated deterministically; AI explains the evidence and its limitations.
      </p>
      <div className="analysis-selected-period" aria-live="polite">
        <i className="pi pi-calendar" />
        <span>Analysis period: <strong>{monthLabel || "Choose a billing month"}</strong></span>
      </div>
      <label className="analysis-prompt-label" htmlFor="analysis-goal">What would you like to understand?</label>
      <textarea id="analysis-goal" value={goal} onChange={event => setGoal(event.target.value)} maxLength={1000} rows={3} disabled={loading} />
      {error && <Message severity="error" text={error} className="w-full mt-3" />}
      <div className="analysis-actions">
        <Button label={loading ? "Analysing month..." : "Generate analysis"} icon={loading ? "pi pi-spin pi-spinner" : "pi pi-sparkles"} onClick={runAnalysis} disabled={loading || billCount === 0 || !selectedMonth || !goal.trim()} />
        <span>{billCount} saved {billCount === 1 ? "bill" : "bills"} available</span>
      </div>
      {report && (
        <section className="analysis-report" aria-live="polite" aria-label="Wattwise analysis report">
          <div className="analysis-report-heading">
            <div><p className="eyebrow">YOUR ENERGY, EXPLAINED</p><h3>Wattwise analysis report</h3></div>
            <div className="analysis-report-actions">
              <Button label={copied ? "Copied" : "Copy report"} icon={copied ? "pi pi-check" : "pi pi-copy"} text size="small" onClick={copyReport} disabled={loading} />
              <Button label="Run again" icon="pi pi-refresh" text size="small" onClick={runAnalysis} disabled={loading} />
            </div>
          </div>
          {context && (
            <div className="analysis-evidence-context">
              <span>Selected period <strong>{context.selectedPeriod?.label || monthLabel}</strong></span>
              <span>Compared with <strong>{context.comparisonPeriod?.label || "No previous available month"}</strong></span>
              <span>{context.coverage?.savedBillCountForSelectedMonth ?? 0} saved record(s) in selected month</span>
            </div>
          )}
          <AnalysisReport report={report} />
        </section>
      )}
      {!billCount && <p className="analysis-empty-note">Upload and save at least one bill to enable AI analysis.</p>}
      {billCount > 0 && !selectedMonth && <p className="analysis-empty-note">Select a saved billing month to enable month-scoped analysis.</p>}
      <p className="analysis-footnote">Analysis uses the latest uploaded bill for each period and compares with the previous available saved billing month. Missing fields remain unavailable. It does not establish causes, appliance usage, weather, tariff changes or savings without supporting evidence.</p>
    </section>
  );
}
