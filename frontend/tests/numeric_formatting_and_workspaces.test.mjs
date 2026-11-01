import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidNumber,
  safeToFixed,
  formatScore,
  formatTemperature,
  formatNDVI,
  formatCurrencyLakh,
  formatCurrencyCrore,
  formatCurrencyRawINR,
  formatPercentage,
  formatDistanceKm,
  formatMeters,
} from '../src/utils/numericFormat.js';

describe('VanSetu Green — Production Numeric Formatting & Validation Utility', () => {
  test('isValidNumber correctly identifies valid numbers and strings', () => {
    assert.equal(isValidNumber(0), true, '0 must be recognized as valid');
    assert.equal(isValidNumber(42), true);
    assert.equal(isValidNumber(-12.5), true);
    assert.equal(isValidNumber('3.1415'), true);
    assert.equal(isValidNumber('0'), true);
    assert.equal(isValidNumber('-100'), true);
    assert.equal(isValidNumber(1e5), true);

    // Invalid values
    assert.equal(isValidNumber(null), false, 'null is not a valid number');
    assert.equal(isValidNumber(undefined), false, 'undefined is not a valid number');
    assert.equal(isValidNumber(''), false, 'empty string is not a valid number');
    assert.equal(isValidNumber('   '), false, 'whitespace string is not a valid number');
    assert.equal(isValidNumber(NaN), false, 'NaN is not a valid number');
    assert.equal(isValidNumber(Infinity), false, 'Infinity is not a valid number');
    assert.equal(isValidNumber(-Infinity), false, '-Infinity is not a valid number');
    assert.equal(isValidNumber('abc'), false, 'non-numeric string is not a valid number');
    assert.equal(isValidNumber({}), false, 'object is not a valid number');
    assert.equal(isValidNumber([]), false, 'array is not a valid number');
  });

  test('safeToFixed strictly preserves true zero and handles decimals', () => {
    assert.equal(safeToFixed(0, 2), '0.00', '0 must format to 0.00');
    assert.equal(safeToFixed(0, 0), '0', '0 must format to 0');
    assert.equal(safeToFixed(0, 4), '0.0000');
    assert.equal(safeToFixed('0', 2), '0.00');
    assert.equal(safeToFixed(12.3456, 2), '12.35');
    assert.equal(safeToFixed(-5.678, 2), '-5.68');
    assert.equal(safeToFixed('42.5', 1), '42.5');
  });

  test('safeToFixed safely returns custom fallback for null, undefined, NaN, and objects without throwing', () => {
    assert.equal(safeToFixed(null), '—');
    assert.equal(safeToFixed(undefined), '—');
    assert.equal(safeToFixed(NaN), '—');
    assert.equal(safeToFixed(Infinity), '—');
    assert.equal(safeToFixed('invalid'), '—');
    assert.equal(safeToFixed({}, 2, 'N/A'), 'N/A');
    assert.equal(safeToFixed(null, 3, 'MISSING'), 'MISSING');
  });

  test('formatScore formats multi-criteria priority scores safely', () => {
    assert.equal(formatScore(0.7421, 3), '0.742');
    assert.equal(formatScore(0, 3), '0.000');
    assert.equal(formatScore(1, 4), '1.0000');
    assert.equal(formatScore(null), 'N/A');
    assert.equal(formatScore(undefined), 'N/A');
    assert.equal(formatScore(''), 'N/A');
  });

  test('formatTemperature appends Celsius unit and handles missing values', () => {
    assert.equal(formatTemperature(34.2), '34.2°C');
    assert.equal(formatTemperature(0), '0.0°C');
    assert.equal(formatTemperature(-2.5), '-2.5°C');
    assert.equal(formatTemperature(null), '—');
    assert.equal(formatTemperature(undefined), '—');
    assert.equal(formatTemperature(NaN), '—');
  });

  test('formatNDVI formats vegetation index without throwing', () => {
    assert.equal(formatNDVI(0.312, 3), '0.312');
    assert.equal(formatNDVI(0, 2), '0.00');
    assert.equal(formatNDVI(-0.15, 2), '-0.15');
    assert.equal(formatNDVI(null), '—');
    assert.equal(formatNDVI(undefined), '—');
  });

  test('formatCurrencyLakh formats INR in Lakhs with Rupee symbol', () => {
    assert.equal(formatCurrencyLakh(18.5, 1), '₹18.5L');
    assert.equal(formatCurrencyLakh(18.52, 2), '₹18.52L');
    assert.equal(formatCurrencyLakh(0, 1), '₹0.0L');
    assert.equal(formatCurrencyLakh(null), '—');
    assert.equal(formatCurrencyLakh(undefined), '—');
  });

  test('formatCurrencyCrore formats INR in Crores with Rupee symbol', () => {
    assert.equal(formatCurrencyCrore(2.45, 2), '₹2.45 Cr');
    assert.equal(formatCurrencyCrore(0, 2), '₹0.00 Cr');
    assert.equal(formatCurrencyCrore(null), '—');
    assert.equal(formatCurrencyCrore(undefined), '—');
  });

  test('formatCurrencyRawINR formats integers with Indian comma grouping', () => {
    assert.equal(formatCurrencyRawINR(1500000), '₹15,00,000');
    assert.equal(formatCurrencyRawINR(0), '₹0');
    assert.equal(formatCurrencyRawINR(null), '—');
    assert.equal(formatCurrencyRawINR(undefined), '—');
  });

  test('formatPercentage handles ratio and direct percentages', () => {
    assert.equal(formatPercentage(0.456, 0), '46%');
    assert.equal(formatPercentage(0, 0), '0%');
    assert.equal(formatPercentage(1.0, 0), '100%');
    assert.equal(formatPercentage(45.6, 1, false), '45.6%');
    assert.equal(formatPercentage(null), '—');
    assert.equal(formatPercentage(undefined), '—');
  });

  test('formatDistanceKm and formatMeters format physical metrics', () => {
    assert.equal(formatDistanceKm(2.456, 2), '2.46 km');
    assert.equal(formatDistanceKm(0, 1), '0.0 km');
    assert.equal(formatDistanceKm(null), '—');

    assert.equal(formatMeters(1800, 0), '1800 m');
    assert.equal(formatMeters(0, 0), '0 m');
    assert.equal(formatMeters(null), '—');
  });
});

describe('VanSetu Green — Simulated Component Resilience for Previously Crashing Modules', () => {
  test('PriorityRankingPanel data flow handles completely empty corridor properties', () => {
    const corruptCorridor = {
      name: 'Uncalibrated Test Path',
      district: 'North Delhi',
      highway: 'unclassified',
      priority_score: undefined,
      lst_mean: null,
      ndvi_mean: undefined,
      aqi: null,
      confidence_score: undefined,
      length_km: null,
    };

    // Verify all formatting calls succeed without TypeError
    assert.doesNotThrow(() => {
      const scoreStr = formatScore(corruptCorridor.priority_score, 3);
      const tempStr = formatTemperature(corruptCorridor.lst_mean);
      const ndviStr = formatNDVI(corruptCorridor.ndvi_mean, 3);
      const confStr = formatPercentage(corruptCorridor.confidence_score, 0);
      const distStr = formatDistanceKm(corruptCorridor.length_km);

      assert.equal(scoreStr, 'N/A');
      assert.equal(tempStr, '—');
      assert.equal(ndviStr, '—');
      assert.equal(confStr, '—');
      assert.equal(distStr, '—');
    });
  });

  test('CorridorAnalyticalDetail handles null and undefined multi-vector inputs', () => {
    const emptyCorridor = {
      priority_score: null,
      feasibility_score: undefined,
      confidence_score: null,
      green_deficit: undefined,
      length_km: undefined,
    };

    assert.doesNotThrow(() => {
      const priorityFormatted = formatScore(emptyCorridor.priority_score, 4);
      const feasFormatted = formatPercentage(emptyCorridor.feasibility_score, 0);
      const confFormatted = formatPercentage(emptyCorridor.confidence_score, 0);
      const lengthFormatted = formatDistanceKm(emptyCorridor.length_km);
      const gapFormatted = formatPercentage(emptyCorridor.green_deficit, 1);

      assert.equal(priorityFormatted, 'N/A');
      assert.equal(feasFormatted, '—');
      assert.equal(confFormatted, '—');
      assert.equal(lengthFormatted, '—');
      assert.equal(gapFormatted, '—');
    });
  });

  test('CorridorPredictionView handles both object and array confidence bands', () => {
    // Array format from Python backend
    const payloadArray = {
      predicted_metrics: {
        lst_celsius: 31.4,
        confidence_interval_90: [29.8, 33.2],
      },
    };
    const pred1 = payloadArray.predicted_metrics;
    const band1 = pred1.confidence_interval_90;
    const lower1 = Array.isArray(band1) ? band1[0] : (band1?.lower_lst_celsius ?? null);
    const upper1 = Array.isArray(band1) ? band1[1] : (band1?.upper_lst_celsius ?? null);
    assert.equal(formatTemperature(lower1), '29.8°C');
    assert.equal(formatTemperature(upper1), '33.2°C');

    // Object format from client fallback
    const payloadObject = {
      predicted: {
        lst_celsius: 31.4,
      },
      confidence_interval_90: {
        lower_lst_celsius: 29.8,
        upper_lst_celsius: 33.2,
      },
    };
    const pred2 = payloadObject.predicted;
    const band2 = pred2.confidence_interval_90 || payloadObject.confidence_interval_90;
    const lower2 = Array.isArray(band2) ? band2[0] : (band2?.lower_lst_celsius ?? null);
    const upper2 = Array.isArray(band2) ? band2[1] : (band2?.upper_lst_celsius ?? null);
    assert.equal(formatTemperature(lower2), '29.8°C');
    assert.equal(formatTemperature(upper2), '33.2°C');

    // Completely missing band
    const payloadMissing = {};
    const band3 = payloadMissing.confidence_interval_90;
    const lower3 = Array.isArray(band3) ? band3[0] : (band3?.lower_lst_celsius ?? null);
    const upper3 = Array.isArray(band3) ? band3[1] : (band3?.upper_lst_celsius ?? null);
    assert.equal(formatTemperature(lower3), '—');
    assert.equal(formatTemperature(upper3), '—');
  });

  test('GovtDistrictAdminView handles missing budgets without dividing by zero or throwing', () => {
    const districts = [
      { district: 'Test District', budgetAllocatedLakh: undefined, budgetSpentLakh: null },
    ];
    const totalBudget = 0;
    const totalSpent = 0;

    assert.doesNotThrow(() => {
      const budgetSanctionStr = formatCurrencyCrore(totalBudget / 100, 2);
      const spentStr = formatCurrencyCrore(totalSpent / 100, 2);
      const pctStr = totalBudget > 0 ? formatPercentage(totalSpent / totalBudget, 1) : '0.0%';

      assert.equal(budgetSanctionStr, '₹0.00 Cr');
      assert.equal(spentStr, '₹0.00 Cr');
      assert.equal(pctStr, '0.0%');

      districts.forEach((d) => {
        const alloc = formatCurrencyLakh(d.budgetAllocatedLakh, 1);
        const spent = formatCurrencyLakh(d.budgetSpentLakh, 1);
        assert.equal(alloc, '—');
        assert.equal(spent, '—');
      });
    });
  });

  test('CanopyHydrologyView and App header handle missing or empty telemetry', () => {
    const emptyStats = { raster: { lst: {}, ndvi: {} }, aqi: {} };

    assert.doesNotThrow(() => {
      const lstStr = formatTemperature(emptyStats.raster.lst.mean);
      const ndviStr = formatNDVI(emptyStats.raster.ndvi.mean, 3);
      assert.equal(lstStr, '—');
      assert.equal(ndviStr, '—');
    });
  });

  test('ScenarioLabView and CorridorRankingView handle undefined weights', () => {
    const whatIfHeatWeight = undefined;
    const safeHeatWeight = isValidNumber(whatIfHeatWeight) ? Number(whatIfHeatWeight) : 0.60;
    const greenWeight = safeToFixed(1.0 - safeHeatWeight, 2);

    assert.equal(safeHeatWeight, 0.60);
    assert.equal(greenWeight, '0.40');

    const score = undefined;
    const formattedScore = formatScore(score, 4);
    assert.equal(formattedScore, 'N/A');
  });
});
