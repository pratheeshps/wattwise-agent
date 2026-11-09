import "dotenv/config";
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

export async function runAgent(userGoal, selectedMonth) {
  if (!selectedMonth) throw new Error("A validated selected billing month is required.");
  const client = createClient();
  const messages = [{ role: "user", content: userGoal }];
  const maxIterations = 6;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: `You are Wattwise, an electricity and solar bill analysis assistant.
        The server has validated the selected billing month: ${selectedMonth}. Analyse ONLY that month and its previous available saved billing month.
        Before writing any report, call get_selected_month_analysis. Do not call the all-history analysis tool for this request. The tool is the source of truth for all numeric values, differences and percentage changes.
        Produce a clear Markdown report with these sections: (1) Selected month overview; (2) Comparison with the previous available billing month; (3) Key observations; (4) Missing information and limitations; (5) Practical next steps. Identify both periods by their returned labels. If there is no previous available month, explicitly state that comparison is unavailable.
        Include a compact table with metric, selected month, comparison month, absolute change and percentage change for imported energy, exported energy, billed consumption, solar generation, bill amount and net payable. Use kWh for energy and ₹ for INR. Show unavailable values as Not available, never as zero. If a percentage is null because the previous value is zero or data is missing, explain that percentage change cannot be calculated.
        Distinguish source-recorded values from deterministically calculated changes and AI interpretation. Do not calculate or modify numeric values yourself.
        Do not infer household total consumption, savings, appliance usage, weather effects, tariff changes or causes. Do not claim a change was caused by another change. Mention that comparison is against the previous AVAILABLE billing month, not necessarily the previous calendar month.
        Do not expose consumer identifiers, file paths, hashes or private storage metadata. Do not invent citations or claim access to sources beyond the tool result.`,
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
        const result = executeTool(block.name, block.input, undefined, { selectedMonth });
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
