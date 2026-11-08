export function billSortTimestamp(bill) {
  const dateValue = String(bill.billDate || "").trim();
  if (dateValue) {
    const isoMatch = dateValue.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      return Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }
    const dayFirstMatch = dateValue.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dayFirstMatch) {
      const yearValue = Number(dayFirstMatch[3]);
      const year = yearValue < 100 ? 2000 + yearValue : yearValue;
      return Date.UTC(year, Number(dayFirstMatch[2]) - 1, Number(dayFirstMatch[1]));
    }
    const parsedDate = Date.parse(dateValue);
    if (Number.isFinite(parsedDate)) return parsedDate;
  }
  const monthDate = Date.parse(`1 ${String(bill.month || "")}`);
  return Number.isFinite(monthDate) ? monthDate : 0;
}
