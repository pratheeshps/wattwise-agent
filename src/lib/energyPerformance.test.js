import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnergyPerformance } from './energyPerformance.js';
import { getSolarGenerationForMonth } from './solarGeneration.js';

test('builds chronological series from saved billing months only', () => {
  const result = buildEnergyPerformance([
    { id: 'nov', month: 'November 2026', importedUnits: 210 },
    { id: 'jul', month: 'July 2026', importedUnits: 180 },
    { id: 'sep', month: 'September 2026', importedUnits: 195 },
  ]);
  assert.deepEqual(
    result.map((item) => item.monthKey),
    ['2026-07', '2026-09', '2026-11'],
  );
  assert.deepEqual(
    result.map((item) => item.metrics.importedEnergy),
    [180, 195, 210],
  );
});

test('uses latest uploaded bill per month instead of aggregating duplicates', () => {
  const result = buildEnergyPerformance([
    { id: 'old', month: 'October 2026', uploadedAt: '2026-10-01T10:00:00Z', units: 100 },
    { id: 'new', month: 'October 2026', uploadedAt: '2026-10-02T10:00:00Z', units: 125 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].activeBillId, 'new');
  assert.equal(result[0].metrics.importedEnergy, 125);
});

test('preserves missing values and genuine zero values', () => {
  const result = buildEnergyPerformance([
    { id: 'jul', month: 'July 2026', importedUnits: 0, exportedUnits: null },
  ]);
  assert.equal(result[0].metrics.importedEnergy, 0);
  assert.equal(result[0].metrics.exportedEnergy, null);
  assert.equal(result[0].metrics.solarGeneration, null);
  assert.equal(result[0].metrics.billedConsumption, null);
});

test('includes generation only for an exact month match on a net-metered bill', () => {
  const generation = [getSolarGenerationForMonth('October 2026')];
  const result = buildEnergyPerformance(
    [
      { id: 'oct', month: 'October 2026', billType: 'net-metered', importedUnits: 224 },
      { id: 'nov', month: 'November 2026', billType: 'net-metered', importedUnits: 210 },
      { id: 'sep', month: 'September 2026', billType: 'standard', importedUnits: 195 },
    ],
    generation,
  );
  assert.equal(result[0].metrics.solarGeneration, null);
  assert.equal(result[1].metrics.solarGeneration, 908);
  assert.equal(result[2].metrics.solarGeneration, null);
});

test('does not create points for calendar months without saved bills', () => {
  const result = buildEnergyPerformance([
    { id: 'jul', month: 'July 2026', units: 10 },
    { id: 'nov', month: 'November 2026', units: 30 },
  ]);
  assert.deepEqual(
    result.map((item) => item.monthKey),
    ['2026-07', '2026-11'],
  );
});
