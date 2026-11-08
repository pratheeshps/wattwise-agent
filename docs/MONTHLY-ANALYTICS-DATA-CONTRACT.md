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
- Solar generation is not inferred from import/export. It is included only when an explicitly transcribed source generation record matches the selected billing month by canonical YYYY-MM key. Otherwise it remains unavailable. Source readings live in src/lib/solarGeneration.js; no reading is borrowed from an adjacent month.
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
- `buildMonthlyAnalytics(bills, selectedMonth, generationRecords = [])`

These helpers are pure and do not modify saved bill records or persistence behavior.


## Solar generation source contract — Sprint 0 Task 0.3

The source-generation module contains the transcribed KSEB Solar Generation section readings:

| Billing month | Normal | Off-peak | Peak | Total |
|---|---:|---:|---:|---:|
| September 2026 | 624 | 0 | 1 | 625 kWh |
| October 2026 | 906 | 0 | 2 | 908 kWh |
| November 2026 | 451 | 0 | 0 | 451 kWh |

- Source records carry canonical monthKey, kWh unit, source-recorded provenance and source description.
- July 2026 is intentionally absent because the commissioning/conversion period has no comparable generator statement.
- getSolarGenerationForMonth(month) returns one exact month match or null.
- getSolarGenerationForBills(bills) exposes source readings only for months represented by saved net-metered bills. Duplicate bills in one month do not duplicate generation.
- buildMonthlyAnalytics accepts optional generationRecords and adds a source-recorded solar generation metric only for an exact selected-month match.
- These readings are explicit source transcriptions, not dynamically extracted from the local PDF archive. The repository does not contain tracked sample bill records.
