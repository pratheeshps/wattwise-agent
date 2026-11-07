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


function monthSortValue(bill) {
  const monthDate = Date.parse(`1 ${bill.month || ""}`);
  if (Number.isFinite(monthDate)) return monthDate;
  const billDate = Date.parse(bill.billDate || "");
  return Number.isFinite(billDate) ? billDate : 0;
}

function chartLabel(month) {
  return String(month || "").replace(/\s+20\d{2}$/, "").slice(0, 3);
}

function renderEnergyBars(bills) {
  const values = bills.map(bill => ({
    month: chartLabel(bill.month),
    imported: (bill.importedUnits ?? bill.units) == null ? null : Number(bill.importedUnits ?? bill.units),
    exported: bill.exportedUnits == null ? null : Number(bill.exportedUnits)
  }));
  const width = 520, height = 190, left = 38, right = 12, top = 12, bottom = 34;
  const max = Math.max(1, ...values.flatMap(item => [item.imported, item.exported]).filter(value => value != null));
  const plotHeight = height - top - bottom;
  const groupWidth = (width - left - right) / values.length;
  const barWidth = Math.min(18, groupWidth * .25);
  const ticks = [0, .5, 1];
  const grid = ticks.map(fraction => {
    const y = top + plotHeight * (1 - fraction);
    return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e9eee7" stroke-dasharray="3 4"/><text x="${left-7}" y="${y+4}" text-anchor="end" fill="#89958b" font-size="10">${formatNumber(max*fraction)}</text>`;
  }).join("");
  const bars = values.map((item, index) => {
    const center = left + groupWidth * (index + .5);
    const makeBar = (value, x, fill) => value == null ? "" : (() => {
      const barHeight = Math.max(1, value / max * plotHeight);
      return `<rect x="${x}" y="${top+plotHeight-barHeight}" width="${barWidth}" height="${barHeight}" rx="4" fill="${fill}"><title>${item.month}: ${formatNumber(value)} kWh</title></rect>`;
    })();
    return makeBar(item.imported, center - barWidth - 2, "#73914b") + makeBar(item.exported, center + 2, "#c3d99b") +
      `<text x="${center}" y="${height-10}" text-anchor="middle" fill="#718075" font-size="10">${escapeHtml(item.month)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly imported and exported energy in kilowatt-hours">${grid}${bars}</svg>`;
}

function renderBankLine(bills) {
  const records = bills.filter(bill => bill.bankOpening != null || bill.bankClosing != null);
  if (!records.length) return '<p class="chart-empty">Bank balance data is not available in the saved solar bills.</p>';
  const width = 520, height = 190, left = 38, right = 16, top = 16, bottom = 34;
  const values = records.flatMap(bill => [bill.bankOpening, bill.bankClosing]).filter(value => value != null).map(Number);
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const range = max - min || 1, plotHeight = height - top - bottom;
  const points = records.map((bill, index) => {
    const x = records.length === 1 ? (width + left - right) / 2 : left + index * (width-left-right) / (records.length-1);
    const value = bill.bankClosing ?? bill.bankOpening;
    const y = top + (max - Number(value)) / range * plotHeight;
    return {x,y,value,month:chartLabel(bill.month)};
  });
  const polyline = points.map(point => `${point.x},${point.y}`).join(" ");
  const dots = points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#73914b"><title>${point.month}: ${formatNumber(point.value)} units</title></circle><text x="${point.x}" y="${height-10}" text-anchor="middle" fill="#718075" font-size="10">${escapeHtml(point.month)}</text><text x="${point.x}" y="${Math.max(11,point.y-10)}" text-anchor="middle" fill="#52664c" font-size="10">${formatNumber(point.value)}</text>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Recorded solar bank closing balance by month"><line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" stroke="#e9eee7"/><polyline points="${polyline}" fill="none" stroke="#73914b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}

function renderSolarDashboard(allBills) {
  const dashboard = document.querySelector("#solar-dashboard");
  const bills = allBills.filter(bill => bill.billType === "net-metered").sort((a,b) => monthSortValue(a)-monthSortValue(b));
  if (!bills.length) {
    dashboard.classList.add("hidden");
    return;
  }
  dashboard.classList.remove("hidden");
  const latest = bills[bills.length - 1];
  document.querySelector("#solar-period").textContent = `${bills.length} solar ${bills.length === 1 ? "bill" : "bills"} saved`;
  document.querySelector("#solar-import").textContent = latest.importedUnits == null && latest.units == null ? "—" : `${formatNumber(latest.importedUnits ?? latest.units)} kWh`;
  document.querySelector("#solar-export").textContent = latest.exportedUnits == null ? "—" : `${formatNumber(latest.exportedUnits)} kWh`;
  document.querySelector("#solar-bank").textContent = latest.bankClosing == null ? "—" : `${formatNumber(latest.bankClosing)} units`;
  document.querySelector("#solar-payable").textContent = latest.netPayable == null ? "—" : formatCurrency(latest.netPayable);
  document.querySelector("#energy-chart").innerHTML = renderEnergyBars(bills);
  document.querySelector("#bank-chart").innerHTML = renderBankLine(bills);
  const rows = document.querySelector("#solar-rows");
  rows.replaceChildren();
  for (const bill of [...bills].reverse()) {
    const row = rows.insertRow();
    const values = [
      bill.month, bill.importedUnits ?? bill.units ?? null, bill.exportedUnits,
      bill.billedConsumption, bill.bankOpening, bill.bankClosing, bill.amount, bill.netPayable
    ];
    values.forEach((value, index) => {
      const cell = row.insertCell();
      if (index === 0) cell.textContent = value || "—";
      else if (value == null) cell.textContent = "—";
      else if (index === 6 || index === 7) cell.textContent = formatCurrency(value);
      else cell.textContent = formatNumber(value) + (index < 4 ? " kWh" : " units");
    });
  }
  document.querySelector("#solar-data-note").textContent =
    "Data note: These charts show grid imports, grid exports and the bank balances recorded on your bills. Actual solar generation and total household consumption are not available in these bill records, so Wattwise does not estimate or infer them.";
}

async function loadBills() {
  const response = await fetch("/api/bills");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load bills.");
  const bills = result.bills || [];
  renderSolarDashboard(bills);
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
