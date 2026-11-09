import test from "node:test";
import assert from "node:assert/strict";
import { executeTool, tools } from "./tools.js";

test("selected-month tool returns scoped deterministic evidence only", () => {
  const bills = [
    {
      id: "sep", month: "September 2026", importedUnits: 100, amount: 500,
      consumerNumber: "private-consumer", storedFile: "/private/path.pdf", sha256: "private-hash"
    },
    { id: "oct", month: "October 2026", importedUnits: 150, amount: 650 }
  ];
  const result = executeTool(
    "get_selected_month_analysis",
    {},
    bills,
    { selectedMonth: "2026-10" }
  );

  assert.equal(result.selectedPeriod.key, "2026-10");
  assert.equal(result.comparisonPeriod.key, "2026-09");
  assert.equal(result.current.importedEnergy.value, 150);
  assert.equal(result.comparisons.importedEnergy.difference, 50);
  assert.equal(JSON.stringify(result).includes("private-consumer"), false);
  assert.equal(JSON.stringify(result).includes("/private/path.pdf"), false);
  assert.equal(JSON.stringify(result).includes("private-hash"), false);
});

test("selected-month tool rejects missing or unavailable selected-month context", () => {
  assert.throws(
    () => executeTool("get_selected_month_analysis", {}, [{ month: "October 2026" }], {}),
    /validated selected billing month/
  );
  assert.throws(
    () => executeTool("get_selected_month_analysis", {}, [{ month: "October 2026" }], { selectedMonth: "2026-09" }),
    /no longer available/
  );
});

test("selected-month tool is registered with a closed empty input schema", () => {
  const tool = tools.find(item => item.name === "get_selected_month_analysis");
  assert.ok(tool);
  assert.deepEqual(tool.input_schema.required, []);
  assert.equal(tool.input_schema.additionalProperties, false);
});
