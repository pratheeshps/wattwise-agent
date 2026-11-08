"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import AnalysisReport from "./AnalysisReport";

const DEFAULT_GOAL = "Analyse my saved electricity bills. Compare consecutive months, explain changes in imported energy, exported energy and bill amount, and identify factual trends and limitations.";

export default function AnalysisPanel({ billCount }) {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setCopied(false);
    setReport("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not run the analysis.");
      setReport(result.report || "The analysis returned an empty report.");
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
        <div><p className="eyebrow">04 / INTELLIGENT ANALYSIS</p><h2 id="analysis-heading">Understand your energy story</h2></div>
        <span className="analysis-provider-note"><i className="pi pi-sparkles" /> AI-powered</span>
      </div>
      <p className="analysis-description">Ask Wattwise to analyse your saved bills. Comparisons and percentage changes are calculated by deterministic tools; the AI explains the returned figures and their limitations.</p>
      <label className="analysis-prompt-label" htmlFor="analysis-goal">What would you like to understand?</label>
      <textarea id="analysis-goal" value={goal} onChange={event => setGoal(event.target.value)} maxLength={1000} rows={3} disabled={loading} />
      {error && <Message severity="error" text={error} className="w-full mt-3" />}
      <div className="analysis-actions">
        <Button label={loading ? "Analysing bills..." : "Generate analysis"} icon={loading ? "pi pi-spin pi-spinner" : "pi pi-sparkles"} onClick={runAnalysis} disabled={loading || billCount === 0 || !goal.trim()} />
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
          <AnalysisReport report={report} />
        </section>
      )}
      {!billCount && <p className="analysis-empty-note">Upload and save at least one bill to enable AI analysis.</p>}
      <p className="analysis-footnote">Analysis uses saved bill records only. It does not establish causes, appliance usage, weather conditions or tariff changes unless those details are present in your records.</p>
    </section>
  );
}
