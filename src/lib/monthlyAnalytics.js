import { billSortTimestamp } from "./billDates.js";

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const MONTH_ALIASES = new Map(
  MONTH_NAMES.flatMap((name, index) => [
    [name, index + 1],
    [name.slice(0, 3), index + 1]
  ])
);

function validMonthKey(year, month) {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Normalize supported billing month labels to YYYY-MM.
 * Supported examples: "October 2026", "Oct 2026", "10/2026", "2026-10".
 */
export function normalizeBillingMonth(value) {
  const input = String(value ?? "").trim();
  if (!input) return null;

  let match = input.match(/^(\d{4})-(\d{1,2})$/);
  if (match) return validMonthKey(Number(match[1]), Number(match[2]));

  match = input.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) return validMonthKey(Number(match[2]), Number(match[1]));

  match = input.toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (match) {
    const month = MONTH_ALIASES.get(match[1]);
    return month ? validMonthKey(Number(match[2]), month) : null;
  }

  return null;
}

export function getBillingMonthKey(billOrMonth) {
  const month = typeof billOrMonth === "string"
    ? billOrMonth
    : billOrMonth?.month;
  return normalizeBillingMonth(month);
}

export function formatBillingMonth(monthKey, locale = "en-IN") {
  const normalized = normalizeBillingMonth(monthKey);
  if (!normalized) return String(monthKey ?? "");
  const [year, month] = normalized.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function uploadTimestamp(bill) {
  const uploadedAt = Date.parse(String(bill.uploadedAt ?? ""));
  return Number.isFinite(uploadedAt) ? uploadedAt : billSortTimestamp(bill);
}

function compareActiveBills(a, b) {
  const timestampDifference = uploadTimestamp(a) - uploadTimestamp(b);
  if (timestampDifference !== 0) return timestampDifference;
  return String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

/**
 * Return one active record per billing month. The latest upload wins;
 * older records remain available to the bill-history UI.
 */
export function selectLatestBillPerMonth(bills = []) {
  const activeByMonth = new Map();

  for (const bill of bills) {
    const monthKey = getBillingMonthKey(bill);
    if (!monthKey) continue;

    const current = activeByMonth.get(monthKey);
    if (!current || compareActiveBills(bill, current) > 0) {
      activeByMonth.set(monthKey, bill);
    }
  }

  return activeByMonth;
}

/**
 * Month options are derived only from valid saved billing-month records.
 * Results are sorted newest first for selector convenience.
 */
export function getAvailableBillingMonths(bills = []) {
  const activeByMonth = selectLatestBillPerMonth(bills);
  return [...activeByMonth.entries()]
    .map(([key, activeBill]) => ({
      key,
      label: formatBillingMonth(key),
      billCount: bills.filter(bill => getBillingMonthKey(bill) === key).length,
      activeBillId: activeBill.id ?? null
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export function getLatestAvailableMonth(bills = []) {
  return getAvailableBillingMonths(bills)[0]?.key ?? null;
}

export function getPreviousAvailableMonth(bills = [], selectedMonth) {
  const selectedKey = normalizeBillingMonth(selectedMonth);
  if (!selectedKey) return null;

  const months = getAvailableBillingMonths(bills)
    .map(period => period.key)
    .sort();

  const selectedIndex = months.indexOf(selectedKey);
  return selectedIndex > 0 ? months[selectedIndex - 1] : null;
}

function sourceMetric(value, unit, sourceField) {
  return {
    value: value ?? null,
    unit,
    provenance: value == null ? "unavailable" : "source-recorded",
    sourceField: value == null ? null : sourceField
  };
}

/**
 * Build a month-scoped view model from the active bill for that month.
 * It intentionally does not aggregate multiple bills or infer generation.
 */
export function buildMonthlyAnalytics(bills = [], selectedMonth, generationRecords = []) {
  const monthKey = normalizeBillingMonth(selectedMonth);
  if (!monthKey) return null;

  const activeByMonth = selectLatestBillPerMonth(bills);
  const activeBill = activeByMonth.get(monthKey) ?? null;
  if (!activeBill) return null;

  const importedUnits = activeBill.importedUnits ?? activeBill.units ?? null;
  const generationRecord = generationRecords.find(record => normalizeBillingMonth(record.monthKey ?? record.month) === monthKey) ?? null;

  return {
    period: {
      key: monthKey,
      label: formatBillingMonth(monthKey)
    },
    recordCount: bills.filter(bill => getBillingMonthKey(bill) === monthKey).length,
    activeBillId: activeBill.id ?? null,
    selectionPolicy: "latest-upload",
    metrics: {
      importedEnergy: sourceMetric(importedUnits, "kWh", activeBill.importedUnits != null ? "importedUnits" : "units"),
      exportedEnergy: sourceMetric(activeBill.exportedUnits, "kWh", "exportedUnits"),
      billedConsumption: sourceMetric(activeBill.billedConsumption, "kWh", "billedConsumption"),
      solarGeneration: sourceMetric(generationRecord?.total, "kWh", "sourceGeneration.total"),
      bankOpening: sourceMetric(activeBill.bankOpening, "units", "bankOpening"),
      bankClosing: sourceMetric(activeBill.bankClosing, "units", "bankClosing"),
      billAmount: sourceMetric(activeBill.amount, "INR", "amount"),
      netPayable: sourceMetric(activeBill.netPayable, "INR", "netPayable")
    }
  };
}
