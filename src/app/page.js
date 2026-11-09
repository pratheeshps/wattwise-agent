"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import BillUpload from "../components/dashboard/BillUpload";
import BillHistory from "../components/dashboard/BillHistory";
import AnalysisPanel from "../components/dashboard/AnalysisPanel";
import EnergyPerformance from "../components/dashboard/EnergyPerformance";
import {
  buildMonthlyAnalytics,
  getAdjacentAvailableMonth,
  formatBillingMonth,
  getAvailableBillingMonths,
  getLatestAvailableMonth
} from "../lib/monthlyAnalytics";
import { getSolarGenerationForMonth, getSolarGenerationForBills } from "../lib/solarGeneration";
import { buildEnergyPerformance } from "../lib/energyPerformance";

const number = value => value == null
  ? "—"
  : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const currency = value => value == null
  ? "—"
  : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

function MetricCard({ label, metric, formatter = number, emptyLabel = "Not recorded for this month", hint }) {
  const unavailable = metric?.value == null;
  return (
    <article className="monthly-metric-card">
      <span>{label}</span>
      <strong>{unavailable ? "—" : formatter(metric.value)}{!unavailable && metric.unit === "kWh" && <small> kWh</small>}</strong>
      <small>{unavailable ? emptyLabel : hint || (metric.provenance === "source-recorded" ? "Source-recorded" : "Calculated")}</small>
    </article>
  );
}

export default function DashboardPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/bills", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load bills.");
      setBills(result.bills || []);
    } catch (err) {
      setError(err.message || "Could not load bills.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBills(); }, [loadBills]);

  const monthOptions = useMemo(() => getAvailableBillingMonths(bills), [bills]);
  const latestMonth = useMemo(() => getLatestAvailableMonth(bills), [bills]);
  const previousAvailableMonth = useMemo(
    () => getAdjacentAvailableMonth(bills, selectedMonth, -1),
    [bills, selectedMonth]
  );
  const nextAvailableMonth = useMemo(
    () => getAdjacentAvailableMonth(bills, selectedMonth, 1),
    [bills, selectedMonth]
  );

  useEffect(() => {
    if (!monthOptions.length) {
      setSelectedMonth(null);
      return;
    }
    if (!selectedMonth || !monthOptions.some(period => period.key === selectedMonth)) {
      setSelectedMonth(latestMonth);
    }
  }, [monthOptions, latestMonth, selectedMonth]);

  const performanceMonths = useMemo(() => {
    const generationRecords = getSolarGenerationForBills(bills);
    return buildEnergyPerformance(bills, generationRecords);
  }, [bills]);

  const monthly = useMemo(() => {
    if (!selectedMonth) return null;
    const generation = getSolarGenerationForMonth(selectedMonth);
    return buildMonthlyAnalytics(bills, selectedMonth, generation ? [generation] : []);
  }, [bills, selectedMonth]);

  const activeBill = useMemo(() => {
    if (!monthly) return null;
    return bills.find(bill => bill.id === monthly.activeBillId) || null;
  }, [bills, monthly]);

  async function deleteBill(bill) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/bills/${encodeURIComponent(bill.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete this bill.");
      setNotice(`${result.month} bill deleted.`);
      await loadBills();
    } catch (err) {
      setError(err.message || "Could not delete this bill.");
    }
  }

  const hasBills = bills.length > 0;

  return (
    <main className="page-content dashboard-page">
      <section className="dashboard-intro dashboard-intro-compact">
        <div>
          <p className="eyebrow">ENERGY, MADE CLEAR</p>
          <h1>Your electricity,<br /><em>in perspective.</em></h1>
          <p className="subhead">Understand each billing month, follow the energy recorded in your bills and see what changed over time.</p>
        </div>
        <div className="dashboard-header-actions">
          <Button
            label={uploadOpen ? "Close upload" : "Upload bill"}
            icon={uploadOpen ? "pi pi-times" : "pi pi-cloud-upload"}
            onClick={() => setUploadOpen(open => !open)}
            aria-expanded={uploadOpen}
            aria-controls="bill-upload-panel"
          />
          <div className="intro-mark" aria-hidden="true"><i className="pi pi-bolt" /></div>
        </div>
      </section>

      {error && <Message severity="error" text={error} className="w-full mb-3" />}
      {notice && <Message severity="success" text={notice} className="w-full mb-3" />}

      {uploadOpen && (
        <div id="bill-upload-panel" className="dashboard-upload-drawer">
          <BillUpload onSaved={async () => {
            setNotice("Bill saved to your local history.");
            setUploadOpen(false);
            await loadBills();
          }} />
        </div>
      )}

      <section className="monthly-overview-section" aria-labelledby="monthly-overview-heading">
        <div className="monthly-overview-heading">
          <div>
            <p className="eyebrow">01 / UNDERSTAND</p>
            <h2 id="monthly-overview-heading">Monthly overview</h2>
            <p>Review the latest saved billing month or choose a previous month.</p>
          </div>
          <div className="month-control">
            <label htmlFor="billing-month">Billing month</label>
            <select
              id="billing-month"
              value={selectedMonth || ""}
              onChange={event => setSelectedMonth(event.target.value || null)}
              disabled={loading || !monthOptions.length}
            >
              {!monthOptions.length && <option value="">No saved months</option>}
              {monthOptions.map(period => (
                <option key={period.key} value={period.key}>{period.label}</option>
              ))}
            </select>
            <nav className="month-stepper" aria-label="Billing month navigation">
              <Button
                label="Older"
                icon="pi pi-chevron-left"
                text
                size="small"
                disabled={!previousAvailableMonth || loading}
                onClick={() => setSelectedMonth(previousAvailableMonth)}
                aria-label={previousAvailableMonth ? `View ${formatBillingMonth(previousAvailableMonth)}` : "No older saved month"}
              />
              <Button
                label="Newer"
                icon="pi pi-chevron-right"
                iconPos="right"
                text
                size="small"
                disabled={!nextAvailableMonth || loading}
                onClick={() => setSelectedMonth(nextAvailableMonth)}
                aria-label={nextAvailableMonth ? `View ${formatBillingMonth(nextAvailableMonth)}` : "No newer saved month"}
              />
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="monthly-empty-state" role="status">Loading your saved billing months…</div>
        ) : !hasBills ? (
          <div className="monthly-empty-state">
            <span className="monthly-empty-icon"><i className="pi pi-chart-line" /></span>
            <h3>Your energy overview starts with a bill</h3>
            <p>Upload a PDF electricity bill to create your first monthly overview. You can review and correct extracted values before saving.</p>
            <Button label="Upload your first bill" icon="pi pi-cloud-upload" onClick={() => setUploadOpen(true)} />
          </div>
        ) : !monthly ? (
          <div className="monthly-empty-state">
            <h3>No usable billing data for this month</h3>
            <p>The selected month does not have a valid saved billing record. Choose another available month or review your bill history.</p>
          </div>
        ) : (
          <>
            <div className="monthly-period-context">
              <span><i className="pi pi-calendar" /> {monthly.period.label}</span>
              <small>{monthly.recordCount} saved {monthly.recordCount === 1 ? "record" : "records"} · Latest uploaded bill used for monthly metrics</small>
            </div>
            <div className="monthly-metrics-grid">
              <MetricCard label="Imported from grid" metric={monthly.metrics.importedEnergy} />
              <MetricCard label="Exported to grid" metric={monthly.metrics.exportedEnergy} />
              <MetricCard
                label="Solar generation"
                metric={activeBill?.billType === "net-metered" ? monthly.metrics.solarGeneration : null}
                emptyLabel={activeBill?.billType === "net-metered" ? "No source reading for this month" : "No net-metered bill for this month"}
                hint="Source generation reading"
              />
              <MetricCard label="Billed consumption" metric={monthly.metrics.billedConsumption} />
              <MetricCard label="Bill amount" metric={monthly.metrics.billAmount} formatter={currency} />
              <MetricCard label="Net payable" metric={monthly.metrics.netPayable} formatter={currency} />
            </div>
            <p className="monthly-data-footnote">
              Values are taken from the latest uploaded bill for this billing month. A dash means the value is not available in the selected source record; it does not mean zero.
            </p>
          </>
        )}
      </section>

      <EnergyPerformance months={performanceMonths} selectedMonth={selectedMonth} />

      <section className="intelligence-context" aria-label="Intelligent analysis">
        <div className="intelligence-intro">
          <p className="eyebrow">03 / ANALYZE</p>
          <h2>Go beyond the numbers</h2>
          <p>Explore patterns and observations from your saved electricity bills.</p>
        </div>
        <AnalysisPanel billCount={bills.length} selectedMonth={selectedMonth} monthLabel={selectedMonth ? formatBillingMonth(selectedMonth) : null} />
      </section>


      <section className="monthly-history-context" aria-labelledby="history-heading">
        <div className="panel-heading">
          <div><p className="eyebrow">04 / REVIEW</p><h2 id="history-heading">Bill history</h2></div>
          <span className="panel-meta">{bills.length} saved {bills.length === 1 ? "bill" : "bills"}</span>
        </div>
        <BillHistory
          bills={bills}
          loading={loading}
          selectedMonth={selectedMonth}
          onSelectMonth={month => {
            setSelectedMonth(month);
            document.getElementById("monthly-overview-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onDelete={deleteBill}
        />
      </section>

    </main>
  );
}
