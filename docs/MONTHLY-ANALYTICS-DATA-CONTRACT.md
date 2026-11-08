# Monthly Analytics Data Contract

**Status:** Sprint 0 — implemented  
**Policy:** Latest uploaded bill wins within a billing month. Older records remain in bill history and are not added to the active month's metrics.

## Canonical period identifier

- `key`: canonical billing month in `YYYY-MM` format.
- Accepted source labels: full month name plus year (for example `October 2026`), abbreviated month plus year (`Oct 2026`), `MM/YYYY`, and `YYYY-MM`.
- Invalid or missing month labels are excluded from month options.
- Month options are derived only from saved bill records and sorted newest first.
- The previous period means the previous available saved month, not necessarily the previous calendar month.

## Active bill selection

For each canonical month:

1. Select the record with the latest valid `uploadedAt` timestamp.
2. If upload timestamps are unavailable or tied, use `billSortTimestamp` as a deterministic fallback.
3. If still tied, use the record ID as a deterministic tie-breaker.
4. Keep every record in bill history; never sum same-month records by default.

## Monthly analytics view model

```js
{
  period: {
    key: "2026-10",
    label: "October 2026"
  },
  recordCount: 2,
  activeBillId: "record-id",
  selectionPolicy: "latest-upload",
  metrics: {
    importedEnergy: {
      value: 224,
      unit: "kWh",
      provenance: "source-recorded",
      sourceField: "importedUnits"
    },
    exportedEnergy: {
      value: null,
      unit: "kWh",
      provenance: "unavailable",
      sourceField: null
    },
    billedConsumption: { value: null, unit: "kWh", provenance: "unavailable", sourceField: null },
    solarGeneration: { value: null, unit: "kWh", provenance: "unavailable", sourceField: null },
    bankOpening: { value: null, unit: "units", provenance: "unavailable", sourceField: null },
    bankClosing: { value: null, unit: "units", provenance: "unavailable", sourceField: null },
    billAmount: { value: 1200, unit: "INR", provenance: "source-recorded", sourceField: "amount" },
    netPayable: { value: null, unit: "INR", provenance: "unavailable", sourceField: null }
  }
}
```

## Metric rules

- `null` means unavailable; numeric `0` is a valid source value.
- Imported energy uses `importedUnits`, falling back to the legacy `units` field only when the former is absent.
- Exported energy, billed consumption, bank balances, bill amount and net payable remain separate metrics.
- Solar generation is not inferred from import/export. It remains unavailable in this bill-only view model until a month-matched source generation record is explicitly supplied.
- The view model contains no consumer number, PDF path, stored filename or file hash.
- No totals across multiple same-month records are calculated.

## Implemented helpers

`src/lib/monthlyAnalytics.js` exports:
- `normalizeBillingMonth(value)`
- `getBillingMonthKey(billOrMonth)`
- `formatBillingMonth(monthKey, locale)`
- `selectLatestBillPerMonth(bills)`
- `getAvailableBillingMonths(bills)`
- `getLatestAvailableMonth(bills)`
- `getPreviousAvailableMonth(bills, selectedMonth)`
- `buildMonthlyAnalytics(bills, selectedMonth)`

These helpers are pure and do not modify saved bill records or persistence behavior.
