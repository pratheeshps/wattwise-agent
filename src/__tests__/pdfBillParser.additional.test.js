import test from "node:test";
import assert from "node:assert/strict";
import { extractBillFields } from "../services/pdfBillParser.js";

test("standard bill extracts labelled dates and financial fields", () => {
  const result = extractBillFields("Billing Month: January 2026 Bill Date: 15-01-2026 Units Consumed: 123 Total Bill Amount: Rs. 1,234.50 Net Payable 1,234.50 Consumer No: 123456789");
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


test("net-metered extraction preserves zero readings and does not mix financial fields", () => {
  const result = extractBillFields(
    "Billing Period 12/2026[Monthly] Bill Date 02-12-2026 Meter Type/ NET Meter Total Amt.(Bill#4519261200123) (a+b) 1,250.50 Net Payable(c+d+e) 0.00 Solar OnGrid Consumer (Generator) Bank Statement for 202612 Units Imported 0 kWh Units Exported 125 kWh Bank Opening 0 Billed Consumption 0 kWh Bank Closing 125"
  );
  assert.equal(result.month, "December 2026");
  assert.equal(result.importedUnits, 0);
  assert.equal(result.exportedUnits, 125);
  assert.equal(result.billedConsumption, 0);
  assert.equal(result.bankOpening, 0);
  assert.equal(result.bankClosing, 125);
  assert.equal(result.amount, 1250.5);
  assert.equal(result.netPayable, 0);
  assert.deepEqual(result.extractionWarnings, []);
});

test("grouped meter readings are normalized without confusing import and export rows", () => {
  const result = extractBillFields(
    "Billing Period 1/2027 Bill Date 02-01-2027 Meter Type/ NET Meter KWH Normal Import 0 0 1 1 KWH Normal Export 0 0 1 461 KWH Off Peak Import 0 0 1 24 KWH Off Peak Export 0 0 1 0"
  );
  assert.equal(result.importedUnits, 25);
  assert.equal(result.exportedUnits, 461);
});

test("invalid numeric text and unsupported billing periods remain unavailable", () => {
  const result = extractBillFields(
    "Billing Period 13/2026 Bill Date 02-13-2026 Units Consumed: -- Total Bill Amount: Rs. --"
  );
  assert.equal(result.month, "13/2026");
  assert.equal(result.importedUnits, null);
  assert.equal(result.amount, null);
  assert.ok(result.extractionWarnings.includes("Imported/consumption units were not identified."));
  assert.ok(result.extractionWarnings.includes("Total bill amount was not identified."));
});

test("standard bill amount is taken from the labelled total and not unrelated deposits", () => {
  const result = extractBillFields(
    "Billing Month: February 2027 Bill Date: 10-02-2027 Security Deposit: Rs. 5000 Total Bill Amount: Rs. 1,075.25 Net Payable: 875.25 Units Consumed: 88"
  );
  assert.equal(result.amount, 1075.25);
  assert.equal(result.netPayable, 875.25);
  assert.equal(result.importedUnits, null);
});
