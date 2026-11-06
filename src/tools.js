const bills = [
  {
    month: "October",
    units: 220,
    amount: 1450
  },
  {
    month: "November",
    units: 260,
    amount: 1720
  }
];

export const tools = [
  {
    name: "get_bills",
    description: "Retrieve available electricity bills.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    name: "compare_bills",
    description:
      "Compare two electricity bills using their consumption and amount.",
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

export function executeTool(name, input) {
  if (name === "get_bills") {
    return bills;
  }

  if (name === "compare_bills") {
    const previous = bills.find(
      bill => bill.month.toLowerCase() ===
        input.previous_month.toLowerCase()
    );

    const current = bills.find(
      bill => bill.month.toLowerCase() ===
        input.current_month.toLowerCase()
    );

    if (!previous || !current) {
      throw new Error("Bill not found.");
    }

    return {
      previous_month: previous.month,
      current_month: current.month,
      consumption_difference:
        current.units - previous.units,
      amount_difference:
        current.amount - previous.amount,
      consumption_change_percent:
        previous.units === 0
          ? null
          : Number(
              (((current.units - previous.units) /
                previous.units) * 100).toFixed(2)
            )
    };
  }

  throw new Error(`Unsupported tool: ${name}`);
}