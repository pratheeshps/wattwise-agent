import test from "node:test";
import assert from "node:assert/strict";
import { billSortTimestamp } from "./billDates.js";

test("bill sorting understands ISO and day-first bill dates", () => {
  const older = billSortTimestamp({ billDate: "02-09-2026", month: "September 2026" });
  const newer = billSortTimestamp({ billDate: "2026-10-02", month: "October 2026" });
  assert.ok(older < newer);
});

test("bill sorting falls back to billing month when bill date is absent", () => {
  assert.ok(billSortTimestamp({ month: "September 2026" }) < billSortTimestamp({ month: "October 2026" }));
});

test("unparseable dates safely sort to zero", () => {
  assert.equal(billSortTimestamp({ billDate: "not a date", month: "unknown" }), 0);
});
