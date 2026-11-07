const formatNumber = value => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const formatCurrency = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
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
  const grid = [0, .5, 1].map(fraction => {
    const y = top + plotHeight * (1 - fraction);
    return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e9eee7" stroke-dasharray="3 4"/><text x="${left-7}" y="${y+4}" text-anchor="end" fill="#89958b" font-size="10">${formatNumber(max*fraction)}</text>`;
  }).join("");
  const bars = values.map((item, index) => {
    const center = left + groupWidth * (index + .5);
    const makeBar = (value, x, fill) => {
      if (value == null) return "";
      const barHeight = Math.max(1, value / max * plotHeight);
      return `<rect x="${x}" y="${top+plotHeight-barHeight}" width="${barWidth}" height="${barHeight}" rx="4" fill="${fill}"><title>${item.month}: ${formatNumber(value)} kWh</title></rect>`;
    };
    return makeBar(item.imported, center - barWidth - 2, "#73914b") + makeBar(item.exported, center + 2, "#c3d99b") +
      `<text x="${center}" y="${height-10}" text-anchor="middle" fill="#718075" font-size="10">${escapeHtml(item.month)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly imported and exported energy in kilowatt-hours">${grid}${bars}</svg>`;
}

function renderGenerationChart() {
  const records = [
    { month: "Sep", value: 625 },
    { month: "Oct", value: 908 },
    { month: "Nov", value: 451 }
  ];
  const width = 520, height = 170, left = 38, right = 18, top = 12, bottom = 30;
  const max = 1000, plotHeight = height - top - bottom;
  const groupWidth = (width - left - right) / records.length;
  const bars = records.map((record, index) => {
    const barWidth = 48, x = left + groupWidth * (index + .5) - barWidth / 2;
    const barHeight = record.value / max * plotHeight;
    return `<rect x="${x}" y="${top+plotHeight-barHeight}" width="${barWidth}" height="${barHeight}" rx="5" fill="#73914b"><title>${record.month}: ${record.value} kWh</title></rect><text x="${x+barWidth/2}" y="${top+plotHeight-barHeight-7}" text-anchor="middle" fill="#52664c" font-size="11">${record.value}</text><text x="${x+barWidth/2}" y="${height-8}" text-anchor="middle" fill="#718075" font-size="11">${record.month} 2026</text>`;
  }).join("");
  const grid = [0, .5, 1].map(fraction => {
    const y = top + plotHeight * (1 - fraction);
    return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e9eee7" stroke-dasharray="3 4"/><text x="${left-7}" y="${y+4}" text-anchor="end" fill="#89958b" font-size="10">${Math.round(max*fraction)}</text>`;
  }).join("");
  document.querySelector("#generation-chart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Solar generation readings by month in kilowatt-hours">${grid}${bars}</svg>`;
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
  const bills = allBills.filter(bill => bill.billType === "net-metered")
    .sort((a, b) => monthSortValue(a) - monthSortValue(b));
  const loading = document.querySelector("#solar-loading");
  const content = document.querySelector("#solar-content");
  if (!bills.length) {
    loading.textContent = "No saved solar net-metered bill history found yet. Upload a solar bill from the main dashboard to populate the bill history and grid-exchange charts. Source-derived installation and generation details from the uploaded documents remain available below.";
    content.classList.remove("hidden");
    document.querySelector("#solar-period").textContent = "No saved bills";
    document.querySelector("#solar-import").textContent = "—";
    document.querySelector("#solar-export").textContent = "—";
    document.querySelector("#solar-bank").textContent = "—";
    document.querySelector("#solar-payable").textContent = "—";
    document.querySelector("#energy-chart").innerHTML = '<p class="chart-empty">Upload and save solar bills to chart grid imports and exports.</p>';
    document.querySelector("#bank-chart").innerHTML = '<p class="chart-empty">Upload and save solar bills to chart recorded bank balances.</p>';
    document.querySelector("#solar-data-note").textContent = "The installation profile and generation readings above are transcribed from the uploaded source PDFs. Saved bill history below is populated from this Wattwise installation’s local bill store.";
    return;
  }
  loading.classList.add("hidden");
  content.classList.remove("hidden");
  const latest = bills[bills.length - 1];
  document.querySelector("#solar-period").textContent = `${bills.length} saved solar ${bills.length === 1 ? "bill" : "bills"}`;
  document.querySelector("#solar-import").textContent = latest.importedUnits == null && latest.units == null ? "—" : `${formatNumber(latest.importedUnits ?? latest.units)} kWh`;
  document.querySelector("#solar-export").textContent = latest.exportedUnits == null ? "—" : `${formatNumber(latest.exportedUnits)} kWh`;
  document.querySelector("#solar-bank").textContent = latest.bankClosing == null ? "—" : `${formatNumber(latest.bankClosing)} units`;
  document.querySelector("#solar-payable").textContent = latest.netPayable == null ? "—" : formatCurrency(latest.netPayable);
  document.querySelector("#energy-chart").innerHTML = renderEnergyBars(bills);
  document.querySelector("#bank-chart").innerHTML = renderBankLine(bills);
  renderGenerationChart();
  const rows = document.querySelector("#solar-rows");
  rows.replaceChildren();
  for (const bill of [...bills].reverse()) {
    const row = rows.insertRow();
    const values = [bill.month, bill.importedUnits ?? bill.units ?? null, bill.exportedUnits, bill.billedConsumption, bill.bankOpening, bill.bankClosing, bill.amount, bill.netPayable];
    values.forEach((value, index) => {
      const cell = row.insertCell();
      if (index === 0) cell.textContent = value || "—";
      else if (value == null) cell.textContent = "—";
      else if (index === 6 || index === 7) cell.textContent = formatCurrency(value);
      else cell.textContent = formatNumber(value) + (index < 4 ? " kWh" : " units");
    });
  }
  document.querySelector("#solar-data-note").textContent =
    "Grid imports, grid exports, recorded solar generation and bank balances are separate bill measurements. Actual total household consumption is not provided by these records, so Wattwise does not infer it.";
}

async function loadSolarBills() {
  const loading = document.querySelector("#solar-loading");
  try {
    const response = await fetch("/api/bills");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load solar bills.");
    renderSolarDashboard(result.bills || []);
  } catch (error) {
    loading.textContent = error.message;
  }
}

renderGenerationChart();
loadSolarBills();
