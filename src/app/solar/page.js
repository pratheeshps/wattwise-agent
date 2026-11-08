"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { billSortTimestamp } from "../../lib/billDates";
import { getSolarGenerationForBills } from "../../lib/solarGeneration";

const installation = [
  ["Plant capacity", "5 kW"],
  ["Grid connected on", "22 Jul 2026"],
  ["Generator SPIN", "451901662"],
  ["Meter type", "Net meter"]
];

const number = value => value == null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const money = value => value == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
const shortMonth = value => String(value || "").replace(/\s+20\d{2}$/, "").slice(0, 3);

function EmptyChart({ children }) {
  return <p className="solar-chart-empty">{children}</p>;
}

function EnergyChart({ bills }) {
  const values = bills.map(bill => ({
    month: shortMonth(bill.month),
    imported: bill.importedUnits ?? bill.units ?? null,
    exported: bill.exportedUnits ?? null
  }));
  if (!values.length || !values.some(item => item.imported != null || item.exported != null)) {
    return <EmptyChart>Import and export readings are not available in the saved solar bills.</EmptyChart>;
  }
  const width=560,height=220,left=48,right=14,top=16,bottom=38;
  const max=Math.max(1,...values.flatMap(v=>[v.imported,v.exported]).filter(v=>v!=null));
  const plotHeight=height-top-bottom,group=(width-left-right)/values.length,bar=Math.min(19,group*.24);
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Imported and exported grid energy by month">
    {[0,.5,1].map(f=>{const y=top+plotHeight*(1-f);return <g key={f}><line x1={left} y1={y} x2={width-right} y2={y} stroke="#e7ede5" strokeDasharray="4 4"/><text x={left-8} y={y+4} textAnchor="end" fill="#849087" fontSize="10">{number(max*f)}</text></g>;})}
    {values.map((v,i)=>{const x=left+group*(i+.5);return <g key={i}>
      {v.imported!=null&&<rect x={x-bar-2} y={top+plotHeight-(v.imported/max*plotHeight)} width={bar} height={Math.max(1,v.imported/max*plotHeight)} rx="4" fill="#73914b"><title>{v.month}: imported {number(v.imported)} kWh</title></rect>}
      {v.exported!=null&&<rect x={x+2} y={top+plotHeight-(v.exported/max*plotHeight)} width={bar} height={Math.max(1,v.exported/max*plotHeight)} rx="4" fill="#c3d99b"><title>{v.month}: exported {number(v.exported)} kWh</title></rect>}
      <text x={x} y={height-12} textAnchor="middle" fill="#718075" fontSize="11">{v.month}</text>
    </g>;})}
  </svg>;
}

function BankChart({ bills }) {
  const records=bills.filter(b=>b.bankOpening!=null||b.bankClosing!=null);
  if(!records.length) return <EmptyChart>Recorded bank balance data is not available in the saved solar bills.</EmptyChart>;
  const vals=records.flatMap(b=>[b.bankOpening,b.bankClosing]).filter(v=>v!=null).map(Number);
  const min=Math.min(0,...vals),max=Math.max(1,...vals),range=max-min||1;
  const width=560,height=220,left=42,right=18,top=24,bottom=38,plot=height-top-bottom;
  const points=records.map((b,i)=>({x:records.length===1?(width+left-right)/2:left+i*(width-left-right)/(records.length-1),value:b.bankClosing??b.bankOpening,month:shortMonth(b.month)}));
  const poly=points.map(p=>`${p.x},${top+(max-p.value)/range*plot}`).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recorded solar bank balance by month">
    <line x1={left} y1={height-bottom} x2={width-right} y2={height-bottom} stroke="#e7ede5"/>
    <polyline points={poly} fill="none" stroke="#73914b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {points.map((p,i)=>{const y=top+(max-p.value)/range*plot;return <g key={i}><circle cx={p.x} cy={y} r="5" fill="#73914b"><title>{p.month}: {number(p.value)} units</title></circle><text x={p.x} y={Math.max(13,y-12)} textAnchor="middle" fill="#52664c" fontSize="11">{number(p.value)}</text><text x={p.x} y={height-12} textAnchor="middle" fill="#718075" fontSize="11">{p.month}</text></g>;})}
  </svg>;
}

function GenerationChart({ records }) {
  if(!records.length) return <EmptyChart>No saved bill months match the source generation readings.</EmptyChart>;
  const width=560,height=205,left=45,right=15,top=20,bottom=35,max=Math.max(100,...records.map(r=>r.total)),plot=height-top-bottom,group=(width-left-right)/records.length;
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Source-recorded solar generation by month">
    {[0,.5,1].map(f=>{const y=top+plot*(1-f);return <g key={f}><line x1={left} y1={y} x2={width-right} y2={y} stroke="#e7ede5" strokeDasharray="4 4"/><text x={left-8} y={y+4} textAnchor="end" fill="#849087" fontSize="10">{Math.round(max*f)}</text></g>;})}
    {records.map((r,i)=>{const w=Math.min(54,group*.42),x=left+group*(i+.5)-w/2,h=r.total/max*plot;return <g key={r.month}><rect x={x} y={top+plot-h} width={w} height={h} rx="5" fill="#73914b"><title>{r.month}: {r.total} kWh</title></rect><text x={x+w/2} y={top+plot-h-7} textAnchor="middle" fill="#52664c" fontSize="11">{r.total}</text><text x={x+w/2} y={height-10} textAnchor="middle" fill="#718075" fontSize="11">{shortMonth(r.month)}</text></g>;})}
  </svg>;
}

export default function SolarPage() {
  const [allBills,setAllBills]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState(null);
  const [notice,setNotice]=useState("");

  const loadBills=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/bills",{cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Could not load solar bills.");
      setAllBills(result.bills||[]);
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{loadBills();},[loadBills]);

  const bills=useMemo(()=>allBills.filter(b=>b.billType==="net-metered").sort((a,b)=>billSortTimestamp(a)-billSortTimestamp(b)),[allBills]);
  const latest=bills.at(-1);
  const generation=useMemo(()=>getSolarGenerationForBills(bills),[bills]);
  const generationTotal=generation.reduce((sum,r)=>sum+r.total,0);

  async function confirmDelete(){
    if(!selected)return;
    const bill=selected;setSelected(null);setError("");setNotice("");
    try{
      const response=await fetch(`/api/bills/${encodeURIComponent(bill.id)}`,{method:"DELETE"});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Could not delete this solar bill.");
      setNotice(`${result.month} solar bill deleted. Charts and balances have been recalculated.`);
      await loadBills();
    }catch(err){setError(err.message);}
  }

  const amountBody=row=><div className="solar-table-amount"><strong>{money(row.amount)}</strong><small>Payable: {money(row.netPayable)}</small></div>;
  const numberBody=field=>row=>row[field]==null?"—":number(row[field]);
  const energyBody=field=>row=>row[field]==null?"—":`${number(row[field])} kWh`;
  const deleteBody=row=><Button label="Delete" icon="pi pi-trash" severity="danger" text size="small" onClick={()=>setSelected(row)} aria-label={`Delete ${row.month} solar bill`}/>;

  return <main className="page-content solar-page">
    <section className="dashboard-intro">
      <div><p className="eyebrow">SOLAR / NET METERING</p><h1>Your solar energy,<br/><em>at a glance.</em></h1><p className="subhead">Explore energy exchanged with the grid, recorded solar bank balances and the financial details from your net-metered bills.</p></div>
      <div className="solar-intro-mark" aria-hidden="true"><i className="pi pi-sun"/></div>
    </section>

    {error&&<Message severity="error" text={error} className="w-full mb-3"/>}
    {notice&&<Message severity="success" text={notice} className="w-full mb-3"/>}
    {loading&&<div className="solar-loading">Loading saved solar records…</div>}

    <section className="dashboard-panel solar-profile">
      <div className="panel-heading"><div><p className="eyebrow">YOUR SOLAR INSTALLATION</p><h2>System details</h2><p className="solar-subtitle">Installation information transcribed from the source KSEB generator statement.</p></div></div>
      {loading ? (
        <p className="solar-profile-empty">Loading installation details…</p>
      ) : bills.length > 0 ? (
        <div className="solar-profile-grid">{installation.map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      ) : (
        <p className="solar-profile-empty">No saved solar bills. Upload a net-metered bill from the Dashboard to display your installation details.</p>
      )}
    </section>

    <section className="dashboard-panel solar-generation">
      <div className="panel-heading"><div><p className="eyebrow">SOLAR GENERATION</p><h2>Recorded generation readings</h2><p className="solar-subtitle">Monthly totals from the separate Solar Generation section of the uploaded KSEB bills.</p></div></div>
      <div className="solar-generation-summary">
        <article><span>Latest recorded generation</span><strong>{generation.length?number(generation.at(-1).total)+" kWh":"—"}</strong><small>{generation.at(-1)?.month||"No matching saved bill"}</small></article>
        <article><span>September–November total</span><strong>{generation.length?number(generationTotal)+" kWh":"—"}</strong><small>{generation.length?generation.length+" source bill months":"No matching saved bill months"}</small></article>
      </div>
      <div className="solar-chart-container"><GenerationChart records={generation}/></div>
      <div className="solar-generation-table"><DataTable value={generation} emptyMessage="No source generation readings match the saved bill months." size="small" responsiveLayout="scroll">
        <Column field="month" header="Billing month"/><Column header="Normal zone" body={r=>number(r.normal)+" kWh"}/><Column header="Off-peak zone" body={r=>number(r.offPeak)+" kWh"}/><Column header="Peak zone" body={r=>number(r.peak)+" kWh"}/><Column header="Total generation" body={r=>number(r.total)+" kWh"}/>
      </DataTable></div>
      <p className="solar-data-note">These readings are transcribed from the bills’ Solar Generation section. July’s bill is the net-meter conversion/commissioning period and does not provide a comparable generator bank statement. No generation value is inferred for that month.</p>
    </section>

    <section className="solar-latest-heading"><div><p className="eyebrow">LATEST SOLAR BILL</p><h2>Your solar overview</h2><p className="solar-subtitle">Latest values from your most recently saved net-metered bill.</p></div><span className="panel-meta">{latest?latest.month:"No saved solar bills"}</span></section>
    <section className="solar-metric-grid">
      <article><span>Imported from grid</span><strong>{latest?(latest.importedUnits??latest.units)==null?"—":number(latest.importedUnits??latest.units)+" kWh":"—"}</strong><small>Latest solar bill</small></article>
      <article><span>Exported to grid</span><strong>{latest?.exportedUnits==null?"—":number(latest.exportedUnits)+" kWh"}</strong><small>Latest solar bill</small></article>
      <article><span>Recorded bank balance</span><strong>{latest?.bankClosing==null?"—":number(latest.bankClosing)+" units"}</strong><small>Latest closing balance</small></article>
      <article><span>Net payable</span><strong>{latest?.netPayable==null?"—":money(latest.netPayable)}</strong><small>Latest solar bill</small></article>
    </section>

    <section className="solar-chart-grid">
      <article className="dashboard-panel solar-chart-card"><div className="solar-chart-heading"><div><h3>Grid energy exchange</h3><p>Imported and exported units by billing month</p></div><div className="chart-legend"><span><i className="legend-import"/>Import</span><span><i className="legend-export"/>Export</span></div></div><EnergyChart bills={bills}/></article>
      <article className="dashboard-panel solar-chart-card"><div className="solar-chart-heading"><div><h3>Solar bank balance</h3><p>Recorded closing balance by billing month</p></div></div><BankChart bills={bills}/></article>
    </section>

    <section className="history-section solar-records">
      <div className="panel-heading"><div><p className="eyebrow">SOLAR RECORDS</p><h2>Solar bill history</h2><p className="solar-subtitle">Energy, bank balance and financial values from each saved net-metered bill.</p></div><span className="panel-meta">{bills.length} saved {bills.length===1?"bill":"bills"}</span></div>
      <div className="dashboard-panel history-table"><DataTable value={[...bills].reverse()} dataKey="id" loading={loading} paginator rows={8} rowsPerPageOptions={[8,15,25]} emptyMessage="No saved solar net-metered bills yet. Upload one from the dashboard." responsiveLayout="scroll" stripedRows>
        <Column field="month" header="Month" sortable/><Column header="Imported" body={energyBody("importedUnits")}/><Column header="Exported" body={energyBody("exportedUnits")}/><Column header="Billed" body={energyBody("billedConsumption")}/><Column header="Bank opening" body={numberBody("bankOpening")}/><Column header="Bank closing" body={numberBody("bankClosing")}/><Column header="Bill / payable" body={amountBody}/><Column header="Action" body={deleteBody}/>
      </DataTable></div>
    </section>
    <p className="solar-data-note solar-domain-note">Grid imports, grid exports, recorded solar generation and bank balances are separate bill measurements. Actual total household consumption is not provided by these records, so Wattwise does not infer it.</p>

    <Dialog header="Delete solar bill?" visible={Boolean(selected)} onHide={()=>setSelected(null)} modal draggable={false} footer={<div className="dialog-actions"><Button label="Cancel" severity="secondary" text onClick={()=>setSelected(null)}/><Button label="Delete bill" icon="pi pi-trash" severity="danger" onClick={confirmDelete}/></div>}>
      <p className="dialog-copy">Delete the <strong>{selected?.month}</strong> solar bill and its uploaded PDF? This cannot be undone. The solar metrics and charts will refresh from the remaining records.</p>
    </Dialog>
  </main>;
}
