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
    document.querySelector("#bill-type-tag").textContent =
      fields.billType === "net-metered" ? "Solar net-metered bill" : "Standard electricity bill";
    reviewForm.elements.billType.value = fields.billType || "standard";
    document.querySelector("#review-warnings").textContent =
      (fields.extractionWarnings || []).join(" ");
    reviewForm.elements.month.value = fields.month || "";
    reviewForm.elements.billDate.value = fields.billDate || "";
    reviewForm.elements.units.value = fields.importedUnits ?? fields.units ?? "";
    reviewForm.elements.exportedUnits.value = fields.exportedUnits ?? "";
    reviewForm.elements.billedConsumption.value = fields.billedConsumption ?? "";
    reviewForm.elements.amount.value = fields.amount ?? "";
    reviewForm.elements.netPayable.value = fields.netPayable ?? "";
    reviewForm.elements.bankOpening.value = fields.bankOpening ?? "";
    reviewForm.elements.bankClosing.value = fields.bankClosing ?? "";
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
  for (const name of ["billType", "month", "billDate", "units", "exportedUnits", "billedConsumption", "amount", "netPayable", "bankOpening", "bankClosing", "consumerNumber"]) {
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/\$\\rightarrow\$/g, "→").replace(/\\rightarrow/g, "→");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return html;
}

function renderAnalysisMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || line === "***" || line === "---") { index++; continue; }

    if (/^#{1,4}\s+/.test(line)) {
      const level = Math.min(line.match(/^#+/)[0].length, 3);
      const title = line.replace(/^#+\s+/, "").replace(/📊|📈|📉|🧭|🔍/g, "").trim();
      blocks.push("<h" + level + ' class="report-h' + level + '">' + renderInlineMarkdown(title) + "</h" + level + ">");
      index++;
      continue;
    }

    if (line.startsWith("|") && index + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[index + 1].trim())) {
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const cells = lines[index].trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{2,}:?$/.test(cell))) rows.push(cells);
        index++;
      }
      if (rows.length) {
        const header = rows[0];
        const body = rows.slice(1);
        const headHtml = header.map(cell => "<th>" + renderInlineMarkdown(cell) + "</th>").join("");
        const bodyHtml = body.map(row => "<tr>" + header.map((_, cellIndex) => "<td>" + renderInlineMarkdown(row[cellIndex] || "—") + "</td>").join("") + "</tr>").join("");
        blocks.push('<div class="report-table-wrap"><table class="report-table"><thead><tr>' + headHtml + "</tr></thead><tbody>" + bodyHtml + "</tbody></table></div>");
      }
      continue;
    }

    if (/^\d+\.\s+/.test(line) || /^[-*]\s+/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const tag = ordered ? "ol" : "ul";
      const items = [];
      while (index < lines.length && (/^\d+\.\s+/.test(lines[index].trim()) || /^[-*]\s+/.test(lines[index].trim()))) {
        const item = lines[index].trim().replace(/^(?:\d+\.|[-*])\s+/, "");
        items.push("<li>" + renderInlineMarkdown(item) + "</li>");
        index++;
      }
      blocks.push('<' + tag + ' class="report-list">' + items.join("") + "</" + tag + ">");
      continue;
    }

    const paragraph = [line];
    index++;
    while (index < lines.length && lines[index].trim() &&
      !/^#{1,4}\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith("|") &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !["***", "---"].includes(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index++;
    }
    blocks.push('<p class="report-paragraph">' + renderInlineMarkdown(paragraph.join(" ")) + "</p>");
  }

  return blocks.join("");
}

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
  document.querySelector("#total-units").textContent = bills.length ? `${formatNumber(bills.reduce((sum, bill) => sum + (bill.importedUnits ?? bill.units ?? 0), 0))} kWh` : "—";
  document.querySelector("#total-amount").textContent = bills.length ? formatCurrency(bills.reduce((sum, bill) => sum + bill.amount, 0)) : "—";
  const rows = document.querySelector("#bill-rows");
  rows.replaceChildren();
  if (!bills.length) {
    const row = rows.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = "No bills uploaded yet.";
    return;
  }
  for (const bill of bills) {
    const row = rows.insertRow();
    for (const value of [
      bill.month,
      bill.billType === "net-metered" ? "Solar net-metered" : "Standard",
      `${formatNumber(bill.importedUnits ?? bill.units ?? 0)} / ${bill.exportedUnits == null ? "—" : formatNumber(bill.exportedUnits)} kWh`,
      `${formatCurrency(bill.amount)} / ${bill.netPayable == null ? "—" : formatCurrency(bill.netPayable)}`,
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
  output.innerHTML = '<div class="report-loading"><span class="loading-orb"></span><div><strong>Preparing your energy report</strong><p>Comparing saved bills and checking monthly changes…</p></div></div>';
  output.classList.remove("is-rendered");
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "Analyse all saved electricity bills chronologically. Call get_monthly_analysis and produce a detailed Markdown report with month-on-month comparison tables for imported kWh, exported kWh and bill amount, percentage changes, factual summaries, identified trends, and missing information/limitations. Distinguish bill amount from net payable. Use only saved records." })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Analysis failed.");
    output.innerHTML = renderAnalysisMarkdown(result.report);
    output.classList.add("is-rendered");
  } catch (error) {
    output.textContent = error.message;
    output.classList.remove("is-rendered");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Analyse my bills <span>↗</span>';
  }
});

loadBills().catch(error => setMessage(error.message, "error"));
