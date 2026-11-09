import test from 'node:test';
import { getSolarGenerationForMonth } from './solarGeneration.js';
import assert from 'node:assert/strict';
import {
  buildMonthlyAnalytics,
  formatBillingMonth,
  getAdjacentAvailableMonth,
  getAvailableBillingMonths,
  getLatestAvailableMonth,
  getPreviousAvailableMonth,
  normalizeBillingMonth,
  selectLatestBillPerMonth,
} from './monthlyAnalytics.js';

test('normalizes supported billing month formats', () => {
  assert.equal(normalizeBillingMonth('October 2026'), '2026-10');
  assert.equal(normalizeBillingMonth('Oct 2026'), '2026-10');
  assert.equal(normalizeBillingMonth('10/2026'), '2026-10');
  assert.equal(normalizeBillingMonth('2026-10'), '2026-10');
  assert.equal(normalizeBillingMonth('2026-13'), null);
  assert.equal(normalizeBillingMonth('not a month'), null);
  assert.equal(normalizeBillingMonth(''), null);
});

test('formats a normalized billing month for display', () => {
  assert.equal(formatBillingMonth('2026-10', 'en-US'), 'October 2026');
});

test('month options are unique and sorted newest first', () => {
  const months = getAvailableBillingMonths([
    { id: 'a', month: 'September 2026', uploadedAt: '2026-09-10T10:00:00Z' },
    { id: 'b', month: 'October 2026', uploadedAt: '2026-10-10T10:00:00Z' },
    { id: 'c', month: 'September 2026', uploadedAt: '2026-09-12T10:00:00Z' },
  ]);
  assert.deepEqual(
    months.map((item) => item.key),
    ['2026-10', '2026-09'],
  );
  assert.equal(months[1].billCount, 2);
  assert.equal(months[1].activeBillId, 'c');
});

test('latest uploaded record wins without aggregating same-month records', () => {
  const bills = [
    {
      id: 'old',
      month: 'October 2026',
      uploadedAt: '2026-10-02T10:00:00Z',
      units: 100,
      amount: 500,
    },
    {
      id: 'new',
      month: 'October 2026',
      uploadedAt: '2026-10-03T10:00:00Z',
      units: 120,
      amount: 650,
    },
  ];
  const selected = selectLatestBillPerMonth(bills);
  assert.equal(selected.get('2026-10').id, 'new');

  const analytics = buildMonthlyAnalytics(bills, '2026-10');
  assert.equal(analytics.recordCount, 2);
  assert.equal(analytics.activeBillId, 'new');
  assert.equal(analytics.metrics.importedEnergy.value, 120);
  assert.equal(analytics.metrics.billAmount.value, 650);
});

test('falls back to bill date when upload timestamps are unavailable', () => {
  const selected = selectLatestBillPerMonth([
    { id: 'old', month: 'October 2026', billDate: '02/10/2026' },
    { id: 'new', month: 'October 2026', billDate: '05/10/2026' },
  ]);
  assert.equal(selected.get('2026-10').id, 'new');
});

test('latest available month and previous available month use saved periods only', () => {
  const bills = [{ month: 'July 2026' }, { month: 'September 2026' }, { month: 'November 2026' }];
  assert.equal(getLatestAvailableMonth(bills), '2026-11');
  assert.equal(getPreviousAvailableMonth(bills, '2026-11'), '2026-09');
  assert.equal(getPreviousAvailableMonth(bills, '2026-07'), null);
  assert.equal(getPreviousAvailableMonth(bills, '2026-10'), null);
});

test('adjacent month navigation visits only saved periods in chronological order', () => {
  const bills = [{ month: 'July 2026' }, { month: 'September 2026' }, { month: 'November 2026' }];
  assert.equal(getAdjacentAvailableMonth(bills, '2026-09', -1), '2026-07');
  assert.equal(getAdjacentAvailableMonth(bills, '2026-09', 1), '2026-11');
  assert.equal(getAdjacentAvailableMonth(bills, '2026-07', -1), null);
  assert.equal(getAdjacentAvailableMonth(bills, '2026-11', 1), null);
  assert.equal(getAdjacentAvailableMonth(bills, '2026-10', -1), null);
  assert.equal(getAdjacentAvailableMonth(bills, '2026-09', 0), null);
});

test('monthly analytics preserves missing values and genuine zero values', () => {
  const analytics = buildMonthlyAnalytics(
    [
      {
        id: 'oct',
        month: 'October 2026',
        importedUnits: 0,
        exportedUnits: null,
        amount: 0,
        netPayable: null,
      },
    ],
    '2026-10',
  );

  assert.equal(analytics.metrics.importedEnergy.value, 0);
  assert.equal(analytics.metrics.importedEnergy.provenance, 'source-recorded');
  assert.equal(analytics.metrics.exportedEnergy.value, null);
  assert.equal(analytics.metrics.exportedEnergy.provenance, 'unavailable');
  assert.equal(analytics.metrics.billAmount.value, 0);
  assert.equal(analytics.metrics.netPayable.value, null);
  assert.equal(analytics.metrics.solarGeneration.value, null);
});

test('monthly analytics includes only an explicitly matched source generation reading', () => {
  const bills = [{ id: 'oct', month: 'October 2026', billType: 'net-metered', importedUnits: 224 }];
  const generation = [getSolarGenerationForMonth('October 2026')];
  const analytics = buildMonthlyAnalytics(bills, '2026-10', generation);
  assert.equal(analytics.metrics.solarGeneration.value, 908);
  assert.equal(analytics.metrics.solarGeneration.unit, 'kWh');
  assert.equal(analytics.metrics.solarGeneration.provenance, 'source-recorded');
  assert.equal(analytics.metrics.solarGeneration.sourceField, 'sourceGeneration.total');
});

test("monthly analytics does not borrow a different month's generation reading", () => {
  const bills = [{ id: 'jul', month: 'July 2026', billType: 'net-metered', importedUnits: 0 }];
  const generation = [getSolarGenerationForMonth('October 2026')];
  const analytics = buildMonthlyAnalytics(bills, 'July 2026', generation);
  assert.equal(analytics.metrics.solarGeneration.value, null);
  assert.equal(analytics.metrics.solarGeneration.provenance, 'unavailable');
  assert.equal(analytics.metrics.importedEnergy.value, 0);
});

test('invalid or unavailable selected months return no monthly analytics', () => {
  assert.equal(buildMonthlyAnalytics([], '2026-10'), null);
  assert.equal(buildMonthlyAnalytics([{ month: 'October 2026' }], '2026-11'), null);
  assert.equal(buildMonthlyAnalytics([{ month: 'October 2026' }], 'invalid'), null);
});

test('invalid billing-month records are excluded from selector options', () => {
  const months = getAvailableBillingMonths([
    { id: 'valid', month: 'October 2026' },
    { id: 'invalid', month: 'sometime later' },
  ]);
  assert.deepEqual(
    months.map((item) => item.key),
    ['2026-10'],
  );
});
