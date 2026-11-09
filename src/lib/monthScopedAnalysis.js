import {
  formatBillingMonth,
  getPreviousAvailableMonth,
  normalizeBillingMonth,
  selectLatestBillPerMonth
} from "./monthlyAnalytics.js";

function metric(value, unit, sourceField) {
  return {
    value: value ?? null,
    unit,
    provenance: value == null ? "unavailable" : "source-recorded",
    sourceField: value == null ? null : sourceField
  };
}

function delta(current, previous) {
  if (current == null || previous == null) {
    return { difference: null, percent: null, provenance: "unavailable" };
  }
  const difference = Number((current - previous).toFixed(2));
  return {
    difference,
    percent: previous === 0 ? null : Number(((difference / previous) * 100).toFixed(2)),
    provenance: "deterministically-calculated"
  };
}

/**
 * Create a privacy-safe, deterministic evidence packet for the selected
 * billing month and its previous available month. No consumer or file metadata
 * is included, and same-month duplicate records are never aggregated.
 */
export function buildMonthScopedAnalysis(bills = [], selectedMonth, generationRecords = []) {
  const selectedKey = normalizeBillingMonth(selectedMonth);
  const activeByMonth = selectLatestBillPerMonth(bills);
  if (!selectedKey || !activeByMonth.has(selectedKey)) return null;

  const previousKey = getPreviousAvailableMonth(bills, selectedKey);
  const currentBill = activeByMonth.get(selectedKey);
  const previousBill = previousKey ? activeByMonth.get(previousKey) : null;
  const generationByMonth = new Map(
    generationRecords.map(record => [normalizeBillingMonth(record.monthKey ?? record.month), record])
      .filter(([key]) => Boolean(key))
  );

  function valuesFor(bill, monthKey) {
    if (!bill) return null;
    const generation = bill.billType === "net-metered" ? generationByMonth.get(monthKey) : null;
    return {
      importedEnergy: metric(bill.importedUnits ?? bill.units, "kWh", bill.importedUnits != null ? "importedUnits" : "units"),
      exportedEnergy: metric(bill.exportedUnits, "kWh", "exportedUnits"),
      billedConsumption: metric(bill.billedConsumption, "kWh", "billedConsumption"),
      solarGeneration: metric(generation?.total, "kWh", "sourceGeneration.total"),
      billAmount: metric(bill.amount, "INR", "amount"),
      netPayable: metric(bill.netPayable, "INR", "netPayable")
    };
  }

  const current = valuesFor(currentBill, selectedKey);
  const previous = valuesFor(previousBill, previousKey);
  const comparisons = Object.fromEntries(
    Object.keys(current).map(key => [
      key,
      delta(current[key].value, previous?.[key].value ?? null)
    ])
  );

  const unavailableCurrent = Object.entries(current)
    .filter(([, value]) => value.value == null)
    .map(([key]) => key);

  return {
    selectedPeriod: { key: selectedKey, label: formatBillingMonth(selectedKey) },
    comparisonPeriod: previousKey
      ? { key: previousKey, label: formatBillingMonth(previousKey) }
      : null,
    selectionPolicy: "latest-upload-wins",
    current,
    previous,
    comparisons,
    coverage: {
      savedBillCountForSelectedMonth: bills.filter(bill => normalizeBillingMonth(bill.month) === selectedKey).length,
      currentMonthUnavailableMetrics: unavailableCurrent,
      comparisonAvailable: Boolean(previousBill),
      solarGenerationAvailable: current.solarGeneration.value != null
    },
    limitations: [
      "Only the latest uploaded bill for each billing month is used; duplicate records are not added together.",
      "The comparison uses the previous available saved billing month, which may not be the immediately preceding calendar month.",
      "Missing source fields are unavailable, not zero.",
      "These records do not establish appliance usage, weather, tariff causes, household total consumption or savings."
    ]
  };
}
