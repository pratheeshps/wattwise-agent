function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function numberFrom(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).replace(/,/g, "").replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function ksebZoneUnits(text, zone, trading) {
  const pattern = new RegExp(
    `KWH\\s+${zone}\\s+${trading}\\s+[\\d,.]+\\s+[\\d,.]+\\s+\\d+\\s+([\\d,.]+)`,
    "i"
  );
  return numberFrom(firstMatch(text, [pattern]));
}

function monthLabel(value) {
  const match = value.match(/^(\\d{1,2})\\/(\\d{4})$/);
  if (!match) return value;
  const monthIndex = Number(match[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return value;
  return new Date(Date.UTC(Number(match[2]), monthIndex, 1))
    .toLocaleString("en", { month: "long", timeZone: "UTC" }) + ` ${match[2]}`;
}

export function extractBillFields(text) {
  const normalized = text.replace(/\r/g, "\n");
  const ksebPeriod = firstMatch(normalized, [
    /Billing\\s+Period\\s+(\\d{1,2}\\/\\d{4})/i
  ]);
  const month = ksebPeriod
    ? monthLabel(ksebPeriod)
    : firstMatch(normalized, [
      /(?:bill\\s*(?:month|period)|billing\\s*period|month)\\s*[:\\-]?\\s*([A-Za-z]{3,9}\\s+\\d{4})/i
    ]);

  const billDate = firstMatch(normalized, [
    /Bill\\s+Date\\s+(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4})/i,
    /(?:date\\s*of\\s*issue|invoice\\s*date)\\s*[:\\-]?\\s*(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4})/i
  ]);

  const isKsebNetMeter = /Meter\\s+Type\\s*\\/?\\s*\\n?\\s*NET\\s+Meter/i.test(normalized) ||
    /Solar\\s+OnGrid\\s+Consumer/i.test(normalized);

  let importedUnits = null;
  let exportedUnits = null;
  if (isKsebNetMeter) {
    const imports = [
      ksebZoneUnits(normalized, "Normal", "Import"),
      ksebZoneUnits(normalized, "Off\\s+Peak", "Import"),
      ksebZoneUnits(normalized, "Peak", "Import")
    ];
    const exports = [
      ksebZoneUnits(normalized, "Normal", "Export"),
      ksebZoneUnits(normalized, "Off\\s+Peak", "Export"),
      ksebZoneUnits(normalized, "Peak", "Export")
    ];
    if (imports.every(value => value !== null)) importedUnits = imports.reduce((sum, value) => sum + value, 0);
    if (exports.every(value => value !== null)) exportedUnits = exports.reduce((sum, value) => sum + value, 0);
  }

  const genericUnits = numberFrom(firstMatch(normalized, [
    /(?:units\\s*consumed|energy\\s*consumption|total\\s*units)\\s*[:\\-]?\\s*([\\d,]+(?:\\.\\d+)?)/i
  ]));

  const amount = numberFrom(firstMatch(normalized, [
    /Total\\s+Amt\\.\\(Bill#[^)]+\\)\\s*\\(a\\+b\\)\\s+([\\d,]+(?:\\.\\d{1,2})?)/i,
    /(?:total\\s*amount\\s*payable|bill\\s*amount|total\\s*due)\\s*[:\\-]?\\s*(?:₹|rs\\.?\\s*)?([\\d,]+(?:\\.\\d{1,2})?)/i
  ]));

  const netPayable = numberFrom(firstMatch(normalized, [
    /Net\\s+Payable\\([^)]*\\)\\s+([\\d,]+(?:\\.\\d{1,2})?)/i,
    /Net\\s+Payable\\s*[:\\-]?\\s*(?:₹|Rs\\.?\\s*)?([\\d,]+(?:\\.\\d{1,2})?)/i
  ]));

  const billedConsumption = numberFrom(firstMatch(normalized, [
    /Billed\\s+Consumption\\s+([\\d,]+(?:\\.\\d+)?)\\s*kWh/i
  ]));
  const bankOpening = numberFrom(firstMatch(normalized, [
    /Bank\\s+Opening\\s+([\\d,]+(?:\\.\\d+)?)/i
  ]));
  const bankClosing = numberFrom(firstMatch(normalized, [
    /Bank\\s+Closing\\s+([\\d,]+(?:\\.\\d+)?)/i
  ]));

  const consumerNumber = firstMatch(normalized, [
    /Consumer#\\s*([0-9]+)/i,
    /Consumer\\s+No\\.\\s*([0-9 ]{8,})/i,
    /(?:consumer\\s*(?:no|number|id)|account\\s*number)\\s*[:\\-]?\\s*([A-Z0-9\\/-]+)/i
  ]).replace(/\\s/g, "");

  return {
    billType: isKsebNetMeter ? "net-metered" : "standard",
    month,
    billDate,
    units: importedUnits ?? genericUnits,
    importedUnits,
    exportedUnits,
    billedConsumption,
    bankOpening,
    bankClosing,
    amount,
    netPayable,
    consumerNumber,
    extractionNote: isKsebNetMeter
      ? "KSEB net-metered bill detected. Imported, exported, banked and billed units are separate values. Verify all figures against the PDF before saving."
      : "Automatically detected values may be incomplete. Review and correct every field before saving."
  };
}
