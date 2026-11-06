import "dotenv/config";
import { runAgent } from "./agent.js";

const result = await runAgent(
  "Compare my October and November electricity bills. " +
  "Explain the consumption and cost changes."
);

console.log("\nWattwise Agent Report:\n");
console.log(result);