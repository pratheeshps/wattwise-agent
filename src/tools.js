import { getBills } from "./services/billStore.js";

export const tools = [
  {
    name: "get_bills",
    description: "Retrieve all electricity bills uploaded and saved by the user. Use these real records only; never assume missing months.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    name: "compare_bills",
    description: "Compare two saved electricity bills. Pass the exact month values returned by get_bills, including the year where present.",
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

    const consumptionDifference = current.units - previous.units;
    const amountDifference = current.amount - previous.amount;

    return {
      previous_month: previous.month,
      current_month: current.month,
      previous_units: previous.units,
      current_units: current.units,
      previous_amount: previous.amount,
      current_amount: current.amount,
      consumption_difference: consumptionDifference,
      amount_difference: amountDifference,
      consumption_change_percent: previous.units === 0
        ? null
        : Number(((consumptionDifference / previous.units) * 100).toFixed(2)),
      amount_change_percent: previous.amount === 0
        ? null
        : Number(((amountDifference / previous.amount) * 100).toFixed(2))
    };
  }

  throw new Error(`Unsupported tool: ${name}`);
}
