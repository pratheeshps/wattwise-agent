function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function numberFrom(value) {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractBillFields(text) {
  const normalized = text.replace(/\r/g, "\n");
  const monthText = firstMatch(normalized, [
    /(?:bill\s*(?:month|period)|billing\s*period|month)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{4})/i,
    /(?:from|period)\s*[:\-]?\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.](\d{4})/i
  ]);

  const billDate = firstMatch(normalized, [
    /(?:bill\s*date|date\s*of\s*issue|invoice\s*date)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i
  ]);

  const unitsText = firstMatch(normalized, [
    /(?:units\s*consumed|energy\s*consumption|consumption|total\s*units|kwh)\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i
  ]);

  const amountText = firstMatch(normalized, [
    /(?:total\s*amount\s*payable|amount\s*payable|net\s*amount|bill\s*amount|total\s*due)\s*[:\-]?\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)/i
  ]);

  const consumerNumber = firstMatch(normalized, [
    /(?:consumer\s*(?:no|number|id)|account\s*number)\s*[:\-]?\s*([A-Z0-9\/-]+)/i
  ]);

  return {
    month: monthText,
    billDate,
    units: numberFrom(unitsText),
    amount: numberFrom(amountText),
    consumerNumber,
    extractionNote: "Automatically detected values may be incomplete. Review and correct every field before saving."
  };
}
