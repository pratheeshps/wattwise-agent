import { selectLatestBillPerMonth, formatBillingMonth, normalizeBillingMonth } from "./monthlyAnalytics.js";

/**
 * Build chronological monthly chart data from the active bill in each month.
 * Missing source fields remain null. Duplicate monthly bills are not summed.
 */
export function buildEnergyPerformance(bills = [], generationRecords = []) {
  const activeByMonth = selectLatestBillPerMonth(bills);
  const generationByMonth = new Map(
    generationRecords
      .map(record => [normalizeBillingMonth(record.monthKey ?? record.month), record])
      .filter(([monthKey]) => Boolean(monthKey))
  );

  return [...activeByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, bill]) => {
      const generation = bill.billType === "net-metered"
        ? generationByMonth.get(monthKey)
        : null;

      return {
        monthKey,
        label: formatBillingMonth(monthKey),
        shortLabel: formatBillingMonth(monthKey).replace(/\s+\d{4}$/, ""),
        activeBillId: bill.id ?? null,
        metrics: {
          importedEnergy: bill.importedUnits ?? bill.units ?? null,
          exportedEnergy: bill.exportedUnits ?? null,
          solarGeneration: generation?.total ?? null,
          billedConsumption: bill.billedConsumption ?? null
        }
      };
    });
}

export const ENERGY_PERFORMANCE_SERIES = Object.freeze([
  Object.freeze({ key: "importedEnergy", label: "Grid import", color: "#73914b" }),
  Object.freeze({ key: "exportedEnergy", label: "Grid export", color: "#c3a45b" }),
  Object.freeze({ key: "solarGeneration", label: "Solar generation", color: "#5f9d9a" }),
  Object.freeze({ key: "billedConsumption", label: "Billed consumption", color: "#8c78b5" })
]);
