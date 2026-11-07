import { getBills } from "./services/billStore.js";

function monthTimestamp(month) {
  const timestamp = Date.parse("1 " + month);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function change(current, previous) {
  if (current == null || previous == null) return null;
  const difference = Number((current - previous).toFixed(2));
  return {
    difference,
    percent: previous === 0 ? null : Number(((difference / previous) * 100).toFixed(2))
  };
}

function analyseSavedBills(bills) {
  const sorted = [...bills].sort((a, b) => monthTimestamp(a.month) - monthTimestamp(b.month));
  const comparisons = [];

  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const previousImported = previous.importedUnits ?? previous.units ?? null;
    const currentImported = current.importedUnits ?? current.units ?? null;

    comparisons.push({
      period: previous.month + " -> " + current.month,
      previous: {
        importedUnits: previousImported,
        exportedUnits: previous.exportedUnits ?? null,
        billAmount: previous.amount ?? null
      },
      current: {
        importedUnits: currentImported,
        exportedUnits: current.exportedUnits ?? null,
        billAmount: current.amount ?? null
      },
      changes: {
        importedUnits: change(currentImported, previousImported),
        exportedUnits: change(current.exportedUnits ?? null, previous.exportedUnits ?? null),
        billAmount: change(current.amount ?? null, previous.amount ?? null)
      }
    });
  }

  const importedValues = sorted.map(bill => bill.importedUnits ?? bill.units).filter(Number.isFinite);
  const exportedValues = sorted.map(bill => bill.exportedUnits).filter(Number.isFinite);
  const amounts = sorted.map(bill => bill.amount).filter(Number.isFinite);

  return {
    billCount: sorted.length,
    bills: sorted.map(bill => ({
      month: bill.month,
      billType: bill.billType,
      importedUnits: bill.importedUnits ?? bill.units ?? null,
      exportedUnits: bill.exportedUnits ?? null,
      billedConsumption: bill.billedConsumption ?? null,
      bankOpening: bill.bankOpening ?? null,
      bankClosing: bill.bankClosing ?? null,
      billAmount: bill.amount ?? null,
      netPayable: bill.netPayable ?? null
    })),
    comparisons,
    totals: {
      importedUnits: importedValues.reduce((sum, value) => sum + value, 0),
      exportedUnits: exportedValues.reduce((sum, value) => sum + value, 0),
      billAmount: amounts.reduce((sum, value) => sum + value, 0)
    }
  };
}

export const tools = [
  {
    name: "get_bills",
    description: "Retrieve uploaded electricity bills, including imported/exported energy and solar bank details when available. Use these records only.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    name: "get_monthly_analysis",
    description: "Return chronologically sorted saved bills, month-on-month changes and percentage calculations for imported units, exported units and bill amount. Use this tool for complete multi-month analysis; it performs the arithmetic deterministically.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    name: "compare_bills",
    description: "Compare two saved electricity bills using imported units and bill amounts. Pass exact month values from get_bills.",
    input_schema: {
      type: "object",
      properties: {
        previous_month: { type: "string" },
        current_month: { type: "string" }
      },
      required: ["previous_month", "current_month"],
      additionalProperties: false
    }
  }
];

export function executeTool(name, input = {}) {
  const bills = getBills();

  if (name === "get_bills") {
    return bills.map(({ sha256, storedFile, ...bill }) => bill);
  }

  if (name === "get_monthly_analysis") {
    return analyseSavedBills(bills);
  }

  if (name === "compare_bills") {
    const previous = bills.find(
      bill => bill.month.trim().toLowerCase() === input.previous_month?.trim().toLowerCase()
    );
    const current = bills.find(
      bill => bill.month.trim().toLowerCase() === input.current_month?.trim().toLowerCase()
    );

    if (!previous || !current) {
      throw new Error("One or both requested bills were not found. Use exact month values from get_bills.");
    }

    const previousUnits = previous.importedUnits ?? previous.units;
    const currentUnits = current.importedUnits ?? current.units;
    const consumptionDifference = currentUnits - previousUnits;
    const amountDifference = current.amount - previous.amount;

    return {
      previous_month: previous.month,
      current_month: current.month,
      previous_imported_units: previousUnits,
      current_imported_units: currentUnits,
      previous_exported_units: previous.exportedUnits ?? null,
      current_exported_units: current.exportedUnits ?? null,
      previous_billed_consumption: previous.billedConsumption ?? null,
      current_billed_consumption: current.billedConsumption ?? null,
      previous_bill_amount: previous.amount,
      current_bill_amount: current.amount,
      previous_net_payable: previous.netPayable ?? null,
      current_net_payable: current.netPayable ?? null,
      imported_units_difference: consumptionDifference,
      bill_amount_difference: amountDifference,
      imported_units_change_percent: previousUnits === 0
        ? null
        : Number(((consumptionDifference / previousUnits) * 100).toFixed(2)),
      bill_amount_change_percent: previous.amount === 0
        ? null
        : Number(((amountDifference / previous.amount) * 100).toFixed(2))
    };
  }

  throw new Error("Unsupported tool: " + name);
}
