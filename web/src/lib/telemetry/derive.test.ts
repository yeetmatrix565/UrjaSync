import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  windowCellCount,
  windowDurationMs,
  windowEnergy,
  windowMetrics,
} from './derive';
import type { Telemetry } from './types';

function entry(overrides: Partial<Telemetry> = {}): Telemetry {
  return {
    timestamp: '2026-01-01T00:00:00.000Z',
    packV: 11.7,
    cells: [3.9, 3.91, 3.89],
    tempC: 28,
    currentA: 1.5,
    soc: 70,
    soh: 96,
    powerW: 17.55,
    imbalanceV: 0.02,
    status: 'LIVE',
    alerts: [],
    ...overrides,
  };
}

const T0 = Date.parse('2026-01-01T00:00:00.000Z');
const at = (seconds: number): string => new Date(T0 + seconds * 1000).toISOString();

describe('windowMetrics', () => {
  it('builds one series per metric and per cell', () => {
    const history = [
      entry({ timestamp: at(0), packV: 11.6 }),
      entry({ timestamp: at(15), packV: 11.7 }),
      entry({ timestamp: at(30), packV: 11.8 }),
    ];

    const metrics = windowMetrics(history);

    expect(metrics.sampleCount).toBe(3);
    expect(metrics.packV.values).toEqual([11.6, 11.7, 11.8]);
    expect(metrics.packV.summary.mean).toBeCloseTo(11.7, 9);
    expect(metrics.packV.summary.range).toBeCloseTo(0.2, 9);
    expect(metrics.cells).toHaveLength(3);
    expect(metrics.cells[0]?.values).toEqual([3.9, 3.9, 3.9]);
  });

  it('keeps a missing metric as null, not zero', () => {
    const history = [entry({ tempC: null }), entry({ tempC: null })];

    const metrics = windowMetrics(history);

    expect(metrics.tempC.values).toEqual([null, null]);
    expect(metrics.tempC.summary.mean).toBeNull();
  });

  it('mixes published and missing samples without shifting the series', () => {
    const history = [entry({ soc: 70 }), entry({ soc: null }), entry({ soc: 68 })];

    const metrics = windowMetrics(history);

    expect(metrics.soc.values).toEqual([70, null, 68]);
    expect(metrics.soc.summary.count).toBe(2);
    expect(metrics.soc.summary.mean).toBe(69);
  });

  it('handles an empty history', () => {
    const metrics = windowMetrics([]);
    expect(metrics.sampleCount).toBe(0);
    expect(metrics.cells).toHaveLength(0);
    expect(metrics.packV.summary.min).toBeNull();
  });

  it('pads per-cell series when a later sample has more cells', () => {
    const history = [entry({ cells: [3.9] }), entry({ cells: [3.9, 3.8] })];

    const metrics = windowMetrics(history);

    expect(metrics.cells).toHaveLength(2);
    expect(metrics.cells[1]?.values).toEqual([null, 3.8]);
  });
});

describe('windowCellCount', () => {
  it('takes the widest cell list', () => {
    expect(windowCellCount([entry({ cells: [] }), entry({ cells: [1, 2, 3] })])).toBe(3);
  });
});

describe('windowDurationMs', () => {
  it('spans first to last timestamp', () => {
    expect(windowDurationMs([entry({ timestamp: at(0) }), entry({ timestamp: at(90) })])).toBe(
      90_000,
    );
  });

  it('is 0 for a single sample or an unparseable timestamp', () => {
    expect(windowDurationMs([entry()])).toBe(0);
    expect(
      windowDurationMs([entry({ timestamp: at(0) }), entry({ timestamp: 'nonsense' })]),
    ).toBe(0);
  });
});

describe('windowEnergy', () => {
  it('integrates power over real timestamps', () => {
    const history = [
      entry({ timestamp: at(0), powerW: 6, currentA: 6 }),
      entry({ timestamp: at(600), powerW: 6, currentA: 6 }),
    ];

    const energy = windowEnergy(history);

    expect(energy.dischargedWh).toBeCloseTo(1, 9);
    expect(energy.dischargedAh).toBeCloseTo(1, 9);
    expect(energy.durationMs).toBe(600_000);
  });

  it('ignores entries with an unusable timestamp', () => {
    const history = [
      entry({ timestamp: 'nonsense', powerW: 999 }),
      entry({ timestamp: at(0), powerW: 6, currentA: null }),
      entry({ timestamp: at(600), powerW: 6, currentA: null }),
    ];

    expect(windowEnergy(history).dischargedWh).toBeCloseTo(1, 9);
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(24 * 60_000)).toBe('24 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min');
  });

  it('shows a dash when there is no span', () => {
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
  });
});
