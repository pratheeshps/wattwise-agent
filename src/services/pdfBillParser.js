function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] != null) return String(match[1]).trim();
  }
  return "";
}

function numberFrom(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).replace(/,/g, "").replace(/\s/g, "").replace(/[^0-9.-]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function monthLabel(value) {
  const match = String(value).match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return value;
  const monthIndex = Number(match[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return value;
  return new Date(Date.UTC(Number(match[2]), monthIndex, 1))
    .toLocaleString("en", { month: "long", timeZone: "UTC" }) + " " + match[2];
}

function extractMeterTableTotals(flatText) {
  const totals = { importedUnits: 0, exportedUnits: 0, hasImport: false, hasExport: false };
  const rowPattern = /\bKWH\s+(Normal|Off\s+Peak|Peak)\s+(Import|Export)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/gi;
  let match;

  while ((match = rowPattern.exec(flatText)) !== null) {
    const units = numberFrom(match[6]);
    if (units == null) continue;
    if (match[2].toLowerCase() === "import") {
      totals.importedUnits += units;
      totals.hasImport = true;
    } else {
      totals.exportedUnits += units;
      totals.hasExport = true;
    }
  }

  return {
    importedUnits: totals.hasImport ? totals.importedUnits : null,
    exportedUnits: totals.hasExport ? totals.exportedUnits : null
  };
}

function labelledKwh(flatText, label) {
  const match = flatText.match(new RegExp(label + "\\s+([\\d,]+(?:\\.\\d+)?)\\s*kWh", "i"));
  return match ? numberFrom(match[1]) : null;
}

function labelledAmount(flatText, pattern) {
  const match = flatText.match(pattern);
  return match ? numberFrom(match[1]) : null;
}

export function extractBillFields(sourceText) {
  const text = String(sourceText || "").replace(/\r/g, "\n");
  // pdf-parse/pdf.js may split table cells across lines. Collapse whitespace
  // before matching labels and table rows so extraction does not depend on
  // the PDF text-layout engine's line wrapping.
  const flatText = text.replace(/\s+/g, " ").trim();

  const period = firstMatch(flatText, [
    /Billing\s+Period\s+(\d{1,2}\s*\/\s*\d{4})/i
  ]).replace(/\s/g, "");
  const month = period
    ? monthLabel(period)
    : firstMatch(flatText, [
      /(?:Billing\s+Month|Bill\s+Month|Billing\s+Period|Bill\s+Period)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{4})/i
    ]);

  const billDate = firstMatch(flatText, [
    /Bill\s+Date\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /(?:Date\s+of\s+Issue|Invoice\s+Date)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i
  ]);

  const hasSolarStatement = /Solar\s+OnGrid\s+Consumer\s*\(Generator\)/i.test(flatText) &&
    /Bank\s+Statement\s+for\s+\d{6}/i.test(flatText);
  const isNetMetered = /Meter\s+Type\s*\/?\s*NET\s+Meter/i.test(flatText) ||
    /Solar\s+OnGrid\s+Consumer/i.test(flatText);

  const meterTotals = extractMeterTableTotals(flatText);
  // The KSEB generator bank statement is the canonical monthly net-meter
  // summary. Prefer it over recomputing from time-of-day meter rows.
  const importedFromBank = labelledKwh(flatText, "Units\\s+Imported");
  const exportedFromBank = labelledKwh(flatText, "Units\\s+Exported");
  // During a KSEB meter-conversion month the generator bank statement may
  // not exist yet; the old-meter section reports a combined Import-Export total.
  const conversionMonthUnits = labelledAmount(flatText, /Units\\s*\\[\\s*Import\\s*-\\s*Export\\s*\\]\\s*([\\d,]+)/i);
  const importedUnits = importedFromBank ?? conversionMonthUnits ?? meterTotals.importedUnits;
  const exportedUnits = exportedFromBank ?? meterTotals.exportedUnits;

  const billedConsumption = labelledKwh(flatText, "Billed\\s+Consumption") ??
    labelledAmount(flatText, /Billed\s+Consumption\s+([\d,]+(?:\.\d+)?)/i);

  const amount = labelledAmount(flatText,
    /Total\s+Amt\.\s*\(Bill#\s*\d+\)\s*\(a\+b\)\s*([\d,]+(?:\.\d{1,2})?)/i
  ) ?? labelledAmount(flatText,
    /(?:Total\s+Bill\s+Amount|Bill\s+Amount|Current\s+Bill\s+Amount)\s*[:\-]?\s*(?:₹|Rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i
  );

  const netPayable = labelledAmount(flatText,
    /Net\s+Payable(?:\s*\([^)]*\))?\s*([\d,]+(?:\.\d{1,2})?)/i
  );

  const bankOpening = labelledAmount(flatText, /Bank\s+Opening\s+([\d,]+)/i);
  const bankClosing = labelledAmount(flatText, /Bank\s+Closing\s+([\d,]+)/i);
  const consumerNumber = firstMatch(flatText, [
    /Consumer#\s*([0-9][0-9 ]*)/i,
    /Consumer\s+No\.?\s+([0-9][0-9 ]*)/i,
    /(?:Consumer\s*(?:No|Number|ID)|Account\s*Number)\s*[:\-]?\s*([A-Z0-9/-]+)/i
  ]).replace(/\s/g, "");

  const units = importedUnits ?? meterTotals.importedUnits;
  const extractionWarnings = [];
  if (!month) extractionWarnings.push("Billing month was not identified.");
  if (!billDate) extractionWarnings.push("Bill date was not identified.");
  if (units == null) extractionWarnings.push("Imported/consumption units were not identified.");
  if (amount == null) extractionWarnings.push("Total bill amount was not identified.");
  if (isNetMetered && exportedUnits == null) extractionWarnings.push("Exported solar units were not identified.");
  if (hasSolarStatement && bankOpening == null) extractionWarnings.push("Solar bank opening balance was not identified.");
  if (hasSolarStatement && bankClosing == null) extractionWarnings.push("Solar bank closing balance was not identified.");

  return {
    billType: isNetMetered ? "net-metered" : "standard",
    month,
    billDate,
    units,
    importedUnits,
    exportedUnits,
    billedConsumption,
    bankOpening,
    bankClosing,
    amount,
    netPayable,
    consumerNumber,
    extractionWarnings,
    extractionNote: isNetMetered
      ? "KSEB solar net-metered bill detected. Monthly imported/exported units are taken from the generator bank statement when present; meter-zone readings remain a separate source. Bill amount and net payable are separate values."
      : "Standard electricity bill detected. Verify the billing period, consumption and amount against the PDF before saving."
  };
}
