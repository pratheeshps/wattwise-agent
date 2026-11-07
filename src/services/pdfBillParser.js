function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] != null) return String(match[1]).trim();
  }
  return "";
}

function numberFrom(value) {
  if (value == null || value === "") return null;
  // KSEB PDFs sometimes split a number into groups, e.g. "4 61" for 461.
  const normalized = String(value).replace(/[\s,]/g, "").replace(/[^0-9.-]/g, "");
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

function captureNumber(text, pattern) {
  const match = text.match(pattern);
  return match ? numberFrom(match[1]) : null;
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

export function extractBillFields(sourceText) {
  const text = String(sourceText || "").replace(/\r/g, "\n");
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

  const isNetMetered =
    /Meter\s+Type\s*\/?\s*NET\s+Meter/i.test(flatText) ||
    /Solar\s+OnGrid\s+Consumer/i.test(flatText);
  const hasSolarStatement =
    /Solar\s+OnGrid\s+Consumer\s*\(Generator\)/i.test(flatText) &&
    /Bank\s+Statement\s+for\s+\d{6}/i.test(flatText);

  // Read the explicit monthly generator bank statement first. Its values are
  // distinct from the meter-zone readings printed on page 1.
  const importedUnits = captureNumber(
    flatText,
    /Units\s+Imported\s*([\d\s,]+?)\s*kWh/i
  );
  const exportedUnits = captureNumber(
    flatText,
    /Units\s+Exported\s*([\d\s,]+?)\s*kWh/i
  );
  const billedConsumption = captureNumber(
    flatText,
    /Billed\s+Consumption\s*([\d\s,]+?)\s*kWh/i
  );
  const bankOpening = captureNumber(
    flatText,
    /Bank\s+Opening\s*([\d,]+)\s*(?=Billed\s+Consumption|Bank\s+Closing)/i
  );
  const bankClosing = captureNumber(
    flatText,
    /Bank\s+Closing\s*([\d,]+)/i
  );

  // Some older/conversion bills do not contain a generator bank statement.
  const meterTotals = extractMeterTableTotals(flatText);
  const conversionUnits = captureNumber(
    flatText,
    /Units\s*\[\s*Import\s*-\s*Export\s*\]\s*([\d\s,]+)/i
  );
  const resolvedImportedUnits =
    importedUnits ?? conversionUnits ?? meterTotals.importedUnits;
  const resolvedExportedUnits = exportedUnits ?? meterTotals.exportedUnits;

  // KSEB has used both (a+b) and (a+b+c+d...) bill formats. Match the
  // labelled Total Amt row, not unrelated payment or security-deposit values.
  const amount = captureNumber(
    flatText,
    /Total\s+Amt\.\s*\(Bill#\s*\d+\)\s*\([^)]*\)\s*([\d,]+(?:\.\d{1,2})?)/i
  ) ?? captureNumber(
    flatText,
    /(?:Total\s+Bill\s+Amount|Bill\s+Amount|Current\s+Bill\s+Amount)\s*[:\-]?\s*(?:₹|Rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i
  );

  const netPayable = captureNumber(
    flatText,
    /Net\s+Payable(?:\s*\([^)]*\))?\s*([\d,]+(?:\.\d{1,2})?)/i
  );

  const consumerNumber = firstMatch(flatText, [
    /Consumer#\s*([0-9][0-9 ]*)/i,
    /Consumer\s+No\.?\s+([0-9][0-9 ]*)/i,
    /(?:Consumer\s*(?:No|Number|ID)|Account\s*Number)\s*[:\-]?\s*([A-Z0-9/-]+)/i
  ]).replace(/\s/g, "");

  const units = resolvedImportedUnits;
  const extractionWarnings = [];
  if (!month) extractionWarnings.push("Billing month was not identified.");
  if (!billDate) extractionWarnings.push("Bill date was not identified.");
  if (units == null) extractionWarnings.push("Imported/consumption units were not identified.");
  if (amount == null) extractionWarnings.push("Total bill amount was not identified.");
  if (isNetMetered && resolvedExportedUnits == null) extractionWarnings.push("Exported solar units were not identified.");
  if (hasSolarStatement && bankOpening == null) extractionWarnings.push("Solar bank opening balance was not identified.");
  if (hasSolarStatement && bankClosing == null) extractionWarnings.push("Solar bank closing balance was not identified.");

  return {
    billType: isNetMetered ? "net-metered" : "standard",
    month,
    billDate,
    units,
    importedUnits: resolvedImportedUnits,
    exportedUnits: resolvedExportedUnits,
    billedConsumption: billedConsumption ?? conversionUnits,
    bankOpening,
    bankClosing,
    amount,
    netPayable,
    consumerNumber,
    extractionWarnings,
    extractionNote: isNetMetered
      ? "KSEB solar net-metered bill detected. Imported/exported units, billed consumption, solar bank balances, bill amount and net payable are extracted separately. Verify each value against the PDF."
      : "Standard electricity bill detected. Verify the billing period, consumption and amount against the PDF before saving."
  };
}
