"use client";

import { useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { billSortTimestamp } from "../../lib/billDates";
import { Tag } from "primereact/tag";

const number = value => value == null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const money = value => value == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

export default function BillHistory({ bills, loading, onDelete }) {
  const [selected, setSelected] = useState(null);
  const rows = useMemo(() => [...bills].sort((a, b) => billSortTimestamp(b) - billSortTimestamp(a)), [bills]);
  const energyBody = row => <span>{number(row.importedUnits ?? row.units)} / {number(row.exportedUnits)} kWh</span>;
  const amountBody = row => <div className="table-amount"><strong>{money(row.amount)}</strong><small>Payable: {money(row.netPayable)}</small></div>;
  const typeBody = row => <Tag value={row.billType === "net-metered" ? "Solar" : "Standard"} severity={row.billType === "net-metered" ? "success" : "info"} />;
  const dateBody = row => row.uploadedAt ? new Date(row.uploadedAt).toLocaleDateString("en-IN") : "—";
  const actionBody = row => <Button label="Delete" icon="pi pi-trash" severity="danger" text size="small" onClick={() => setSelected(row)} aria-label={`Delete ${row.month} bill`} />;

  return (
    <section className="history-section" aria-labelledby="history-heading">
      <div className="panel-heading history-heading">
        <div><p className="eyebrow">03 / YOUR HISTORY</p><h2 id="history-heading">Monthly bill history</h2></div>
        <span className="panel-meta">{bills.length} {bills.length === 1 ? "bill" : "bills"} saved</span>
      </div>
      <div className="history-table dashboard-panel">
        <DataTable value={rows} dataKey="id" loading={loading} paginator rows={8} rowsPerPageOptions={[8, 15, 25]} emptyMessage="No bills uploaded yet. Add your first PDF above." responsiveLayout="scroll" stripedRows>
          <Column field="month" header="Billing month" sortable />
          <Column header="Bill type" body={typeBody} />
          <Column header="Import / Export" body={energyBody} />
          <Column header="Bill / Payable" body={amountBody} />
          <Column header="Uploaded" body={dateBody} />
          <Column header="Action" body={actionBody} />
        </DataTable>
      </div>
      <Dialog
        header="Delete electricity bill?"
        visible={Boolean(selected)}
        onHide={() => setSelected(null)}
        modal
        draggable={false}
        footer={<div className="dialog-actions"><Button label="Cancel" severity="secondary" text onClick={() => setSelected(null)} /><Button label="Delete bill" icon="pi pi-trash" severity="danger" onClick={() => { const row = selected; setSelected(null); onDelete(row); }} /></div>}
      >
        <p className="dialog-copy">Delete the <strong>{selected?.month}</strong> bill and its stored PDF? This action cannot be undone. Dashboard totals and history will refresh.</p>
      </Dialog>
    </section>
  );
}
