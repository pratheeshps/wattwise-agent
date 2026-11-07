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
      max_tokens: 1600,
      system: `
        You are a Wattwise electricity analysis agent.
        Analyse only the actual bill records returned by get_bills.
        Rules:
        - Retrieve saved bill data before comparing or summarising.
        - Use compare_bills for arithmetic; do not estimate calculations mentally.
        - Use exact month values returned by get_bills when calling compare_bills.
        - Never invent missing bill data, tariffs, dates, or causes for a change.
        - Clearly distinguish measured facts from possible explanations.
        - If there are fewer than two bills, explain that a month-to-month comparison is not possible.
        - Do not expose consumer numbers or other personal identifiers in the report.
      `,
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
