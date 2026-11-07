import { getBills } from "./services/billStore.js";

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

  throw new Error(\`Unsupported tool: \${name}\`);
}
