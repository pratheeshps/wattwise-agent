const fileInput = document.querySelector("#bill-file");
const uploadForm = document.querySelector("#upload-form");
const reviewForm = document.querySelector("#review-form");
const uploadMessage = document.querySelector("#upload-message");
let selectedFile = null;
let previewHash = "";

const formatNumber = value => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const formatCurrency = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0] || null;
  document.querySelector("#file-label").textContent = selectedFile?.name || "Choose a PDF or drop it here";
});

document.querySelector(".dropzone").addEventListener("dragover", event => {
  event.preventDefault();
  event.currentTarget.classList.add("dragging");
});
document.querySelector(".dropzone").addEventListener("dragleave", event => event.currentTarget.classList.remove("dragging"));
document.querySelector(".dropzone").addEventListener("drop", event => {
  event.preventDefault();
  event.currentTarget.classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("change"));
  }
});

uploadForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!selectedFile) return;
  setMessage("Reading your PDF…");
  const data = new FormData();
  data.append("bill", selectedFile);
  try {
    const response = await fetch("/api/bills/preview", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not read this PDF.");
    previewHash = result.sha256;
    const fields = result.fields;
    reviewForm.elements.month.value = fields.month || "";
    reviewForm.elements.billDate.value = fields.billDate || "";
    reviewForm.elements.units.value = fields.units ?? "";
    reviewForm.elements.amount.value = fields.amount ?? "";
    reviewForm.elements.consumerNumber.value = fields.consumerNumber || "";
    document.querySelector("#review-note").textContent = result.textExtracted
      ? fields.extractionNote
      : "No selectable text was found. This may be a scanned PDF; enter the values manually.";
    reviewForm.classList.remove("hidden");
    setMessage("PDF read. Check the details below before saving.", "success");
    reviewForm.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setMessage(error.message, "error");
  }
});

reviewForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!selectedFile) return setMessage("Please choose the PDF again.", "error");
  const data = new FormData();
  data.append("bill", selectedFile);
  for (const name of ["month", "billDate", "units", "amount", "consumerNumber"]) {
    data.append(name, reviewForm.elements[name].value);
  }
  data.append("sha256", previewHash);
  try {
    const response = await fetch("/api/bills", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save the bill.");
    setMessage("Bill saved to your monthly history.", "success");
    reviewForm.classList.add("hidden");
    uploadForm.reset();
    selectedFile = null;
    previewHash = "";
    document.querySelector("#file-label").textContent = "Choose a PDF or drop it here";
    await loadBills();
  } catch (error) {
    setMessage(error.message, "error");
  }
});

function setMessage(message, type = "") {
  uploadMessage.textContent = message;
  uploadMessage.className = `message ${type}`;
}

async function loadBills() {
  const response = await fetch("/api/bills");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load bills.");
  const bills = result.bills || [];
  document.querySelector("#bill-count").textContent = bills.length;
  document.querySelector("#total-units").textContent = bills.length ? `${formatNumber(bills.reduce((sum, bill) => sum + bill.units, 0))} kWh` : "—";
  document.querySelector("#total-amount").textContent = bills.length ? formatCurrency(bills.reduce((sum, bill) => sum + bill.amount, 0)) : "—";
  const rows = document.querySelector("#bill-rows");
  rows.replaceChildren();
  if (!bills.length) {
    const row = rows.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.className = "empty";
    cell.textContent = "No bills uploaded yet.";
    return;
  }
  for (const bill of bills) {
    const row = rows.insertRow();
    for (const value of [
      bill.month,
      `${formatNumber(bill.units)} kWh`,
      formatCurrency(bill.amount),
      new Date(bill.uploadedAt).toLocaleDateString("en-IN")
    ]) row.insertCell().textContent = value;
  }
}

document.querySelector("#refresh").addEventListener("click", () => loadBills().catch(error => setMessage(error.message, "error")));
document.querySelector("#analyze").addEventListener("click", async event => {
  const button = event.currentTarget;
  const output = document.querySelector("#analysis-result");
  button.disabled = true;
  button.textContent = "Analysing…";
  output.classList.remove("hidden");
  output.textContent = "Wattwise is reviewing your saved bills…";
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "Analyse all uploaded electricity bills. Compare month-on-month units and cost, identify trends, and explain any missing information. Use only saved bill records." })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Analysis failed.");
    output.textContent = result.report;
  } catch (error) {
    output.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Analyse my bills <span>↗</span>';
  }
});

loadBills().catch(error => setMessage(error.message, "error"));
