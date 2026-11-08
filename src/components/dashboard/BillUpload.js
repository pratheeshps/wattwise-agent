"use client";

import { useRef, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";

const fieldDefinitions = [
  ["month", "Billing month", "text", true, "e.g. October 2026"],
  ["billDate", "Bill date", "text", false, "e.g. 05/10/2026"],
  ["units", "Imported energy (kWh)", "number", true],
  ["exportedUnits", "Exported solar energy (kWh)", "number", false],
  ["billedConsumption", "Billed consumption (kWh)", "number", false],
  ["amount", "Bill amount before adjustments (₹)", "number", true],
  ["netPayable", "Net payable after adjustments (₹)", "number", false],
  ["bankOpening", "Solar bank opening (units)", "number", false],
  ["bankClosing", "Solar bank closing (units)", "number", false],
  ["consumerNumber", "Consumer number", "text", false, "Optional"]
];

export default function BillUpload({ onSaved }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [values, setValues] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function chooseFile(nextFile) {
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setMessage({ severity: "error", text: "Please choose a PDF file." });
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setMessage({ severity: "error", text: "PDF files must be 10 MB or smaller." });
      return;
    }
    setFile(nextFile);
    setPreview(null);
    setMessage(null);
  }

  async function readBill(event) {
    event.preventDefault();
    if (!file) return setMessage({ severity: "warn", text: "Choose a PDF bill first." });
    setBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("bill", file);
      const response = await fetch("/api/bills/preview", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not read this PDF.");
      const fields = result.fields || {};
      setPreview(result);
      setValues({
        billType: fields.billType || "standard",
        month: fields.month || "",
        billDate: fields.billDate || "",
        units: fields.importedUnits ?? fields.units ?? "",
        importedUnits: fields.importedUnits ?? fields.units ?? "",
        exportedUnits: fields.exportedUnits ?? "",
        billedConsumption: fields.billedConsumption ?? "",
        amount: fields.amount ?? "",
        netPayable: fields.netPayable ?? "",
        bankOpening: fields.bankOpening ?? "",
        bankClosing: fields.bankClosing ?? "",
        consumerNumber: fields.consumerNumber || ""
      });
      setMessage({ severity: "success", text: "PDF read. Review every extracted value before saving." });
    } catch (error) {
      setMessage({ severity: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function update(key, value) {
    setValues(current => ({ ...current, [key]: value }));
  }

  async function saveBill(event) {
    event.preventDefault();
    if (!preview || !file) return;
    setBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("bill", file);
      Object.entries({ ...values, sha256: preview.sha256 }).forEach(([key, value]) => body.append(key, value ?? ""));
      const response = await fetch("/api/bills", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this bill.");
      setMessage({ severity: "success", text: `${result.bill.month} bill saved successfully.` });
      setFile(null);
      setPreview(null);
      setValues({});
      if (inputRef.current) inputRef.current.value = "";
      onSaved?.();
    } catch (error) {
      setMessage({ severity: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-panel upload-panel" aria-labelledby="upload-heading">
      <div className="panel-heading">
        <div><p className="eyebrow">01 / ADD A BILL</p><h2 id="upload-heading">Upload your electricity bill</h2></div>
        <span className="panel-meta">PDF · Max 10 MB</span>
      </div>
      <form onSubmit={readBill}>
        <div
          className={`bill-dropzone ${dragging ? "is-dragging" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={event => event.key === "Enter" && inputRef.current?.click()}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}
        >
          <span className="upload-symbol"><i className="pi pi-cloud-upload" /></span>
          <strong>{file?.name || "Choose a PDF or drop it here"}</strong>
          <span>We’ll extract the bill details. You can verify and edit every field before saving.</span>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={event => chooseFile(event.target.files?.[0])} />
        </div>
        <div className="upload-actions">
          <Button type="submit" label={busy ? "Reading PDF…" : "Read bill details"} icon="pi pi-arrow-right" iconPos="right" disabled={busy || !file} />
          {file && <Button type="button" label="Remove file" severity="secondary" text onClick={() => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }} />}
        </div>
      </form>

      {busy && <div className="busy-line"><ProgressSpinner style={{ width: 22, height: 22 }} strokeWidth="5" /><span>Processing your bill…</span></div>}
      {message && <Message severity={message.severity} text={message.text} className="w-full mt-3" />}

      {preview && (
        <form className="bill-review" onSubmit={saveBill}>
          <div className="review-heading">
            <div><p className="eyebrow">02 / VERIFY THE DETAILS</p><h3>Review extracted information</h3></div>
            <span className="bill-type-tag">{values.billType === "net-metered" ? "Solar net-metered" : "Standard bill"}</span>
          </div>
          {!preview.textExtracted && <Message severity="warn" text="No selectable text was found. This may be a scanned PDF; enter the values manually." className="w-full mb-3" />}
          {preview.fields?.extractionWarnings?.length > 0 && <Message severity="warn" text={preview.fields.extractionWarnings.join(" ")} className="w-full mb-3" />}
          {preview.textExtracted && <p className="review-note">{preview.fields?.extractionNote}</p>}
          <div className="bill-fields">
            {fieldDefinitions.map(([key, label, type, required, placeholder]) => (
              <label key={key} className={key === "consumerNumber" ? "field-wide" : ""}>
                <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
                <input
                  type={type}
                  required={required}
                  min={type === "number" ? "0" : undefined}
                  step={type === "number" ? "0.01" : undefined}
                  placeholder={placeholder || ""}
                  value={values[key] ?? ""}
                  onChange={event => update(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="review-actions">
            <Button type="submit" label={busy ? "Saving…" : "Save bill to history"} icon="pi pi-check" disabled={busy} />
            <Button type="button" label="Cancel review" severity="secondary" text onClick={() => { setPreview(null); setMessage(null); }} />
          </div>
        </form>
      )}
    </section>
  );
}
