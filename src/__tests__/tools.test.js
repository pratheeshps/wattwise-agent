import test from "node:test";
import assert from "node:assert/strict";
import { analyseSavedBills, executeTool } from "../tools.js";

const sampleBills = [
  { month: "November 2026", importedUnits: 224, exportedUnits: 320, amount: 290, billedConsumption: 0, netPayable: 0, consumerNumber: "private", sha256: "hash-3", storedFile: "bill-3.pdf" },
  { month: "September 2026", importedUnits: 253, exportedUnits: 461, amount: 315, billedConsumption: 0, netPayable: 0, consumerNumber: "private", sha256: "hash-1", storedFile: "bill-1.pdf" },
  { month: "October 2026", importedUnits: 409, exportedUnits: 645, amount: 340, billedConsumption: 0, netPayable: 0, consumerNumber: "private", sha256: "hash-2", storedFile: "bill-2.pdf" }
];

test("monthly analysis sorts bills chronologically and calculates exact deltas", () => {
  const result = analyseSavedBills(sampleBills);
  assert.equal(result.billCount, 3);
  assert.deepEqual(result.bills.map(bill => bill.month), ["September 2026", "October 2026", "November 2026"]);
  assert.equal(result.comparisons[0].changes.importedUnits.difference, 156);
  assert.equal(result.comparisons[0].changes.importedUnits.percent, 61.66);
  assert.equal(result.comparisons[1].changes.exportedUnits.difference, -325);
  assert.equal(result.comparisons[1].changes.billAmount.difference, -50);
  assert.deepEqual(result.totals, { importedUnits: 886, exportedUnits: 1426, billAmount: 945 });
});

test("missing values remain null and zero baselines have no percentage", () => {
  const result = analyseSavedBills([{ month: "January 2026", importedUnits: 0, exportedUnits: null, amount: null }, { month: "February 2026", importedUnits: 10, exportedUnits: null, amount: 20 }]);
  assert.equal(result.comparisons[0].changes.importedUnits.percent, null);
  assert.equal(result.comparisons[0].changes.exportedUnits, null);
  assert.equal(result.comparisons[0].changes.billAmount, null);
  assert.equal(result.bills[0].netPayable, null);
});

test("get_bills removes file hashes, stored paths and consumer identifiers", () => {
  const result = executeTool("get_bills", {}, sampleBills);
  assert.equal(result.length, 3);
  for (const bill of result) {
    assert.equal("consumerNumber" in bill, false);
    assert.equal("sha256" in bill, false);
    assert.equal("storedFile" in bill, false);
  }
});

test("compare_bills calculates changes using exact saved month names", () => {
  const result = executeTool("compare_bills", { previous_month: "September 2026", current_month: "October 2026" }, sampleBills);
  assert.equal(result.imported_units_difference, 156);
  assert.equal(result.bill_amount_difference, 25);
  assert.equal(result.imported_units_change_percent, 61.66);
});

test("compare_bills rejects unknown months and unsupported tools", () => {
  assert.throws(() => executeTool("compare_bills", { previous_month: "May 2026", current_month: "June 2026" }, sampleBills), /not found/);
  assert.throws(() => executeTool("unknown", {}, sampleBills), /Unsupported tool/);
});

test("compare_bills keeps missing arithmetic unavailable", () => {
  const result = executeTool("compare_bills", { previous_month: "January 2026", current_month: "February 2026" }, [{ month: "January 2026" }, { month: "February 2026" }]);
  assert.equal(result.imported_units_difference, null);
  assert.equal(result.bill_amount_difference, null);
  assert.equal(result.imported_units_change_percent, null);
});
