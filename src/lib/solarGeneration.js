import { normalizeBillingMonth } from "./monthlyAnalytics.js";

// Values transcribed from the separate Solar Generation sections of the source
// KSEB bills. July 2026 is intentionally absent: it was a commissioning/
// conversion period without a comparable generator statement.
export const SOURCE_SOLAR_GENERATION = Object.freeze([
  Object.freeze({ month: "September 2026", total: 625, normal: 624, offPeak: 0, peak: 1 }),
  Object.freeze({ month: "October 2026", total: 908, normal: 906, offPeak: 0, peak: 2 }),
  Object.freeze({ month: "November 2026", total: 451, normal: 451, offPeak: 0, peak: 0 })
].map(record => Object.freeze({
  ...record,
  monthKey: normalizeBillingMonth(record.month),
  unit: "kWh",
  provenance: "source-recorded",
  source: "KSEB bill Solar Generation section"
})));

/**
 * Return the explicitly transcribed generation record for a billing month.
 * Returns null when no source reading exists; never interpolates or estimates.
 */
export function getSolarGenerationForMonth(month) {
  const monthKey = normalizeBillingMonth(month);
  if (!monthKey) return null;
  return SOURCE_SOLAR_GENERATION.find(record => record.monthKey === monthKey) ?? null;
}

/**
 * Return source generation readings only for months represented by saved
 * net-metered bills. Duplicate bills in a month do not duplicate generation.
 */
export function getSolarGenerationForBills(bills = []) {
  const availableMonths = new Set(
    bills
      .filter(bill => bill?.billType === "net-metered")
      .map(bill => normalizeBillingMonth(bill?.month))
      .filter(Boolean)
  );

  return SOURCE_SOLAR_GENERATION
    .filter(record => availableMonths.has(record.monthKey))
    .slice()
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
