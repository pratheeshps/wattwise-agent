import test from "node:test";
import assert from "node:assert/strict";
import { extractBillFields } from "./pdfBillParser.js";

const bills = [
  {
    name: "September 2026 KSEB net-metered bill",
    text: "Consumer# 1145199000629 Billing Period 9/2026[Monthly] Bill Date 02-09-2026 Meter Type/ NET Meter KWH Normal Import 25.00 81.00 1 56 KWH Normal Export 207.00 668.00 1 461 KWH Off Peak Import 65.00 189.00 1 124 KWH Off Peak Export 0.00 0.00 1 0 KWH Peak Import 33.00 106.00 1 73 KWH Peak Export 0.00 0.00 1 0 Total Amt.(Bill#4519260900793) (a+b) 315.00 Net Payable(c+d+e+f+g-h-i) 0.00 Solar OnGrid Consumer (Generator) Bank Statement for 202609 (Generator) Units Imported 253 kWh Units Exported 461 kWh Bank Opening 84 Billed Consumption 0 kWh Bank Closing 292",
    expected: { month: "September 2026", billDate: "02-09-2026", importedUnits: 253, exportedUnits: 461, billedConsumption: 0, amount: 315, netPayable: 0, bankOpening: 84, bankClosing: 292 }
  },
  {
    name: "October 2026 KSEB net-metered bill",
    text: "Billing Period 10/2026[Monthly] Bill Date 02-10-2026 Meter Type/ NET Meter Total Amt.(Bill#4519261000741) (a+b) 340.00 Net Payable(c+d+e+f+g-h-i) 0.00 Solar OnGrid Consumer (Generator) Bank Statement for 202610 (Generator) Units Imported 409 kWh Units Exported 645 kWh Bank Opening 292 Billed Consumption 0 kWh Bank Closing 528",
    expected: { month: "October 2026", billDate: "02-10-2026", importedUnits: 409, exportedUnits: 645, billedConsumption: 0, amount: 340, netPayable: 0, bankOpening: 292, bankClosing: 528 }
  },
  {
    name: "November 2026 KSEB net-metered bill",
    text: "Billing Period 11/2026[Monthly] Bill Date 02-11-2026 Meter Type/ NET Meter Total Amt.(Bill#4519261100489) (a+b) 290.00 Net Payable(c+d+e+f+g-h-i) 0.00 Solar OnGrid Consumer (Generator) Bank Statement for 202611 (Generator) Units Imported 224 kWh Units Exported 320 kWh Bank Opening 528 Billed Consumption 0 kWh Bank Closing 624",
    expected: { month: "November 2026", billDate: "02-11-2026", importedUnits: 224, exportedUnits: 320, billedConsumption: 0, amount: 290, netPayable: 0, bankOpening: 528, bankClosing: 624 }
  }
];

for (const bill of bills) {
  test(bill.name, () => {
    const actual = extractBillFields(bill.text);
    assert.equal(actual.billType, "net-metered");
    for (const [key, value] of Object.entries(bill.expected)) {
      assert.equal(actual[key], value, key);
    }
    assert.deepEqual(actual.extractionWarnings, []);
  });
}

test("July 2026 KSEB meter-conversion bill", () => {
  const text = "Billing Period 7/2026[Monthly] Bill Date 01-08-2026 Meter Type/ NET Meter Units[Import-Export] 438 Total Amt.(Bill#4519260736432) (a+b+c+d) 4172.00 Net Payable(e+f+g+h+i-j-k) 4172.00";
  const actual = extractBillFields(text);
  assert.equal(actual.billType, "net-metered");
  assert.equal(actual.month, "July 2026");
  assert.equal(actual.billDate, "01-08-2026");
  assert.equal(actual.importedUnits, 438);
  assert.equal(actual.billedConsumption, 438);
  assert.equal(actual.amount, 4172);
  assert.equal(actual.netPayable, 4172);
});
