import Anthropic from "@anthropic-ai/sdk";
import { tools, executeTool } from "./tools.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL
});

export async function runAgent(userGoal) {
  const messages = [
    {
      role: "user",
      content: userGoal
    }
  ];

  const maxIterations = 6;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 1200,
      system: `
        You are a Wattwise electricity analysis agent.

        Your objective is to complete the user's electricity
        bill analysis request.

        Rules:
        - Retrieve actual bill data before comparing.
        - Use the comparison tool for calculations.
        - Never invent missing bill data.
        - If required data is unavailable, explain the limitation.
        - Do not claim an action succeeded unless the tool confirms it.
      `,
      tools,
      messages
    });

    messages.push({
      role: "assistant",
      content: response.content
    });

    if (response.stop_reason === "end_turn") {
      return response.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("\n");
    }

    if (response.stop_reason !== "tool_use") {
      throw new Error(
        `Unexpected stop reason: ${response.stop_reason}`
      );
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

    messages.push({
      role: "user",
      content: results
    });
  }

  throw new Error("Agent reached its iteration limit.");
}