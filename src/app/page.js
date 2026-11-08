"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import BillUpload from "../components/dashboard/BillUpload";
import BillHistory from "../components/dashboard/BillHistory";
import AnalysisPanel from "../components/dashboard/AnalysisPanel";

const count = value => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const currency = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

export default function DashboardPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/bills", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load bills.");
      setBills(result.bills || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBills(); }, [loadBills]);

  const summary = useMemo(() => ({
    total: bills.length,
    imported: bills.reduce((sum, bill) => sum + Number(bill.importedUnits ?? bill.units ?? 0), 0),
    amount: bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0)
  }), [bills]);

  async function deleteBill(bill) {
    try {
      const response = await fetch(`/api/bills/${encodeURIComponent(bill.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete this bill.");
      setNotice(`${result.month} bill deleted.`);
      await loadBills();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page-content dashboard-page">
      <section className="dashboard-intro">
        <div><p className="eyebrow">ENERGY, MADE CLEAR</p><h1>Your electricity,<br /><em>in perspective.</em></h1><p className="subhead">Bring your electricity bills together. Review the details, follow monthly usage and understand what you pay.</p></div>
        <div className="intro-mark" aria-hidden="true"><i className="pi pi-bolt" /></div>
      </section>
      {error && <Message severity="error" text={error} className="w-full mb-3" />}
      {notice && <Message severity="success" text={notice} className="w-full mb-3" />}
      <BillUpload onSaved={async () => { setNotice("Bill saved to your local history."); await loadBills(); }} />
      <section className="overview-section" aria-labelledby="overview-heading">
        <div className="panel-heading"><div><p className="eyebrow">03 / YOUR OVERVIEW</p><h2 id="overview-heading">Monthly overview</h2></div><Button label="Refresh" icon="pi pi-refresh" severity="secondary" text onClick={loadBills} disabled={loading} /></div>
        <div className="summary-grid">
          <article className="summary-card"><span>Uploaded bills</span><strong>{summary.total}</strong><small>Saved in local project storage</small></article>
          <article className="summary-card"><span>Total imported energy</span><strong>{count(summary.imported)} <small>kWh</small></strong><small>Sum of imported energy, not household generation</small></article>
          <article className="summary-card"><span>Total bill amount</span><strong>{currency(summary.amount)}</strong><small>Bill amounts before adjustments</small></article>
        </div>
      </section>
      <BillHistory bills={bills} loading={loading} onDelete={deleteBill} />
      <AnalysisPanel billCount={bills.length} />
    </main>
  );
}
