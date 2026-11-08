export function billSortTimestamp(bill) {
  const dateValue = String(bill.billDate || "").trim();
  if (dateValue) {
    const normalized = dateValue.replace(/[.-]/g, "/");
    const parts = normalized.split("/");
    if (parts.length === 3) {
      const [first, second, third] = parts;
      const year = Number(third.length === 2 ? `20${third}` : third);
      const month = Number(second);
      const day = Number(first);
      if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return Date.UTC(year, month - 1, day);
      }
    }
    const parsedDate = Date.parse(dateValue);
    if (Number.isFinite(parsedDate)) return parsedDate;
  }
  const monthDate = Date.parse(`1 ${String(bill.month || "")}`);
  return Number.isFinite(monthDate) ? monthDate : 0;
}
