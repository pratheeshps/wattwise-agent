import Anthropic from "@anthropic-ai/sdk";
import { tools, executeTool } from "./tools.js";

function createClient() {
  if (!process.env.ANTHROPIC_AUTH_TOKEN || !process.env.ANTHROPIC_MODEL) {
    throw new Error("Configure ANTHROPIC_AUTH_TOKEN and ANTHROPIC_MODEL in .env before requesting AI analysis.");
  }

  return new Anthropic({
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
    baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"
  });
}

export async function runAgent(userGoal) {
  const client = createClient();
  const messages = [{ role: "user", content: userGoal }];
  const maxIterations = 6;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: `\n        You are Wattwise, an electricity and solar bill analysis assistant.\n        Analyse only saved bill records returned by your tools. Never use hardcoded or assumed records.\n        \n        For any request to analyse multiple bills:\n        1. Call get_monthly_analysis before writing the report. This tool supplies chronological records and exact month-on-month arithmetic.\n        2. Use the returned values exactly. Do not recalculate percentages or invent missing values.\n        3. Produce a detailed Markdown report with this exact structure:\n           - Title: Month-on-Month Analysis\n           - A subsection for each consecutive month pair, with a Markdown table containing Metric, previous month, current month, Change, and % Change. Include Imported Units (kWh), Exported Units (kWh), and Bill Amount (₹).\n           - A short factual summary under each comparison.\n           - A section titled Identified Trends and Observations with numbered observations grounded in the returned records.\n           - A section titled Missing Information and Limitations explaining that records alone cannot establish causes, appliance usage, weather, solar generation conditions, or tariff changes unless explicitly present.\n        4. Format unit values with kWh and currency with ₹. Show positive changes with + and negative changes with -.\n        5. When billedConsumption is 0 and netPayable is 0, report those as recorded values. Do not claim imports and exports directly offset charges or that the bill is net neutral unless the bill data explicitly proves the reason.\n        6. Distinguish bill amount from net payable. Do not call bill amount the final amount paid.\n        7. If fewer than two bills exist, say month-on-month comparison is unavailable. If a field is null, display Not available rather than assuming zero.\n        8. Never infer causation from correlation. Say that changes occurred together, not that one caused the other.\n        9. Do not expose consumer numbers or personal identifiers.\n        10. Do not include invented source citations or claim access to information outside the saved bill records.\n      `
      tools,
      messages
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      return response.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("\n");
    }

    if (response.stop_reason !== "tool_use") {
      throw new Error(`Unexpected stop reason: ${response.stop_reason}`);
    }

    const results = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const result = executeTool(block.name, block.input);
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      } catch (error) {
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: error.message,
          is_error: true
        });
      }
    }
    messages.push({ role: "user", content: results });
  }

  throw new Error("Agent reached its iteration limit.");
}
