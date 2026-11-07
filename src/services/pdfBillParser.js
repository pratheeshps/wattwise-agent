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

function compactDigits(value) {
  return String(value || "").replace(/\s/g, "");
}

function amountAfterLabel(text, labelPattern) {
  const match = text.match(new RegExp(labelPattern + "[^\\d]{0,100}([\\d,]+(?:\\.\\d{1,2})?)", "i"));
  return match ? numberFrom(match[1]) : null;
}

function extractKsebMeterTotals(text) {
  const totals = { imported: 0, exported: 0, hasImport: false, hasExport: false };
  const rowPattern = /^\s*KWH\s+(Normal|Off\s+Peak|Peak)\s+(Import|Export)\s+[\d,.]+\s+[\d,.]+\s+[\d,.]+\s+([\d,.]+)\s*$/i;

  for (const line of text.split("\n")) {
    const match = line.match(rowPattern);
    if (!match) continue;
    const units = numberFrom(match[3]);
    if (units == null) continue;
    if (match[2].toLowerCase() === "import") {
      totals.imported += units;
      totals.hasImport = true;
    } else {
      totals.exported += units;
      totals.hasExport = true;
    }
  }

  return {
    importedUnits: totals.hasImport ? totals.imported : null,
    exportedUnits: totals.hasExport ? totals.exported : null
  };
}

function monthLabel(value) {
  const match = String(value).match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return value;
  const monthIndex = Number(match[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return value;
  return new Date(Date.UTC(Number(match[2]), monthIndex, 1))
    .toLocaleString("en", { month: "long", timeZone: "UTC" }) + " " + match[2];
}

export function extractBillFields(sourceText) {
  const text = String(sourceText || "").replace(/\r/g, "\n");
  const compactText = text.replace(/[ \t]+/g, " ");

  // Prefer the explicitly labelled KSEB billing period. Do not infer the
  // billing month from unrelated dates such as solar grid-connection date.
  const ksebPeriod = firstMatch(text, [
    /Billing\s+Period\s+(\d{1,2}\s*\/\s*\d{4})/i
  ]).replace(/\s/g, "");

  const month = ksebPeriod
    ? monthLabel(ksebPeriod)
    : firstMatch(text, [
      /^\s*(?:Billing\s+Month|Bill\s+Month)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{4})\s*$/im,
      /^\s*(?:Billing\s+Period|Bill\s+Period)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{4})\s*$/im
    ]);

  const billDate = firstMatch(text, [
    /Bill\s+Date\s+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /(?:date\s+of\s+issue|invoice\s+date)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i
  ]);

  const isKsebNetMeter = /Meter\s+Type\s*\/?\s*NET\s+Meter/i.test(compactText) ||
    /Solar\s+OnGrid\s+Consumer/i.test(text) ||
    /Bank\s+Opening/i.test(text) && /Units\s+Exported/i.test(text);

  const meterTotals = extractKsebMeterTotals(text);

  const solarImported = firstMatch(text, [
    /Units\s+Imported\s+([\d\s,]+)\s*kWh/i
  ]);
  const solarExported = firstMatch(text, [
    /Units\s+Exported\s+([\d\s,]+)\s*kWh/i
  ]);

  const importedUnits = meterTotals.importedUnits ??
    (solarImported ? numberFrom(compactDigits(solarImported)) : null);
  const exportedUnits = meterTotals.exportedUnits ??
    (solarExported ? numberFrom(compactDigits(solarExported)) : null);

  const genericUnits = numberFrom(firstMatch(text, [
    /^\s*(?:Units\s+Consumed|Energy\s+Consumption|Total\s+Units|Consumption)\s*[:\-]?\s*([\d,]+(?:\.\d+)?)\s*(?:kWh|units)?\s*$/im
  ]));

  const billedConsumption = numberFrom(firstMatch(text, [
    /Billed\s+Consumption\s+([\d\s,]+(?:\.\d+)?)\s*kWh/i
  ]));

  const amount = amountAfterLabel(text,
    "Total\\s+Amt\\.\\s*\\(Bill#[^)]*\\)\\s*\\(a\\+b\\)|Total\\s+Bill\\s+Amount|Bill\\s+Amount|Current\\s+Bill\\s+Amount"
  );

  const netPayable = amountAfterLabel(text,
    "Net\\s+Payable(?:\\s*\\([^)]*\\))?"
  );

  const bankOpening = numberFrom(firstMatch(text, [
    /Bank\s+Opening\s+([\d\s,]+)(?:\s|$)/i
  ]));
  const bankClosing = numberFrom(firstMatch(text, [
    /Bank\s+Closing\s+([\d\s,]+)(?:\s|$)/i
  ]));

  const consumerNumber = compactDigits(firstMatch(text, [
    /Consumer#\s*([0-9][0-9 ]*)/i,
    /Consumer\s+No\.?\s+([0-9][0-9 ]*)/i,
    /(?:consumer\s*(?:no|number|id)|account\s*number)\s*[:\-]?\s*([A-Z0-9\/-]+)/i
  ]));

  const units = importedUnits ?? genericUnits;
  const extractionWarnings = [];
  if (!month) extractionWarnings.push("Billing month was not identified.");
  if (!billDate) extractionWarnings.push("Bill date was not identified.");
  if (units == null) extractionWarnings.push("Consumption/imported units were not identified.");
  if (amount == null) extractionWarnings.push("Bill amount was not identified.");
  if (isKsebNetMeter && exportedUnits == null) extractionWarnings.push("Exported solar units were not identified.");

  return {
    billType: isKsebNetMeter ? "net-metered" : "standard",
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
    extractionNote: isKsebNetMeter
      ? "KSEB solar net-metered bill detected. Imported energy, exported energy, billed consumption, solar bank balance, bill amount and net payable are extracted separately. Verify each value against the PDF."
      : "Standard electricity bill detected. Verify the billing period, consumption and amount against the PDF before saving."
  };
}
