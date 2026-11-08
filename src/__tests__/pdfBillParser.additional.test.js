import test from "node:test";
import assert from "node:assert/strict";
import { extractBillFields } from "../services/pdfBillParser.js";

test("standard bill extracts labelled dates and financial fields", () => {
  const result = extractBillFields("Billing Month: January 2026 Bill Date: 15-01-2026 Units Consumed: 123 Total Bill Amount: Rs. 1,234.50 Net Payable: Rs. 1,234.50 Consumer No: 123456789");
  assert.equal(result.billType, "standard");
  assert.equal(result.month, "January 2026");
  assert.equal(result.billDate, "15-01-2026");
  assert.equal(result.amount, 1234.5);
  assert.equal(result.netPayable, 1234.5);
  assert.equal(result.importedUnits, null);
  assert.ok(result.extractionWarnings.includes("Imported/consumption units were not identified."));
});

test("empty or unrelated text reports missing fields without inventing values", () => {
  const result = extractBillFields("This document does not contain an electricity bill.");
  assert.equal(result.billType, "standard");
  assert.equal(result.month, "");
  assert.equal(result.importedUnits, null);
  assert.equal(result.exportedUnits, null);
  assert.equal(result.amount, null);
  assert.equal(result.netPayable, null);
  assert.equal(result.extractionWarnings.length, 4);
});
