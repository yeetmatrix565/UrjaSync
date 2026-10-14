import { describe, expect, it } from 'vitest';
import { ALERT_THRESHOLDS, STATUS_WINDOWS } from './constants';
import {
  alertedCellIndexes,
  cellAlertFlags,
  computeStatus,
  deriveAlerts,
  type AlertInput,
} from './rules';
import type { Alert } from './types';

const NOW = 1_700_000_000_000;
const HEALTHY = [3.9, 3.91, 3.89];

function rules(overrides: Partial<AlertInput> = {}): Alert[] {
  return deriveAlerts({ cells: HEALTHY, tempC: 25, imbalanceV: 0.02, ...overrides });
}

function codes(alerts: Alert[]): string[] {
  return alerts.map((a) => a.code);
}

describe('computeStatus', () => {
  it('is LIVE just inside the live window', () => {
    expect(computeStatus(NOW - (STATUS_WINDOWS.liveMs - 1), NOW)).toBe('LIVE');
  });

  it('flips to STALE at the live boundary', () => {
    expect(computeStatus(NOW - STATUS_WINDOWS.liveMs, NOW)).toBe('STALE');
  });

  it('is STALE just inside the stale window', () => {
    expect(computeStatus(NOW - (STATUS_WINDOWS.staleMs - 1), NOW)).toBe('STALE');
  });

  it('flips to OFFLINE at the stale boundary', () => {
    expect(computeStatus(NOW - STATUS_WINDOWS.staleMs, NOW)).toBe('OFFLINE');
  });

  it('treats a future timestamp as LIVE rather than negative age', () => {
    expect(computeStatus(NOW + 5_000, NOW)).toBe('LIVE');
  });
});

describe('deriveAlerts', () => {
  it('returns nothing for a healthy pack', () => {
    expect(rules()).toEqual([]);
  });

  it('returns nothing when the channel publishes no metrics at all', () => {
    expect(deriveAlerts({ cells: [], tempC: null, imbalanceV: null })).toEqual([]);
  });

  it('warns above the temperature threshold and escalates when critical', () => {
    expect(codes(rules({ tempC: ALERT_THRESHOLDS.tempWarn + 1 }))).toEqual(['HIGH_TEMP']);
    expect(rules({ tempC: 33 })[0]?.severity).toBe('warn');
    expect(rules({ tempC: ALERT_THRESHOLDS.tempCritical + 1 })[0]?.severity).toBe(
      'critical',
    );
  });

  it('does not fire at exactly the temperature threshold', () => {
    expect(rules({ tempC: ALERT_THRESHOLDS.tempWarn })).toEqual([]);
  });

  it('skips a temperature the channel does not publish', () => {
    expect(codes(rules({ tempC: null }))).toEqual([]);
  });

  it('flags over and under voltage per cell', () => {
    expect(codes(rules({ cells: [4.3, 3.9, 3.9], imbalanceV: null }))).toEqual([
      'OVERVOLTAGE_1',
    ]);
    expect(codes(rules({ cells: [3.9, 3.9, 2.9], imbalanceV: null }))).toEqual([
      'UNDERVOLTAGE_3',
    ]);
  });

  it('ignores empty cell slots', () => {
    expect(codes(rules({ cells: [null, 4.4, null], imbalanceV: null }))).toEqual([
      'OVERVOLTAGE_2',
    ]);
  });

  it('never raises CELL_IMBALANCE from a single cell', () => {
    expect(codes(rules({ cells: [3.9], imbalanceV: null }))).toEqual([]);
  });

  it('flags cell imbalance', () => {
    expect(codes(rules({ imbalanceV: ALERT_THRESHOLDS.cellImbalance + 0.01 }))).toEqual([
      'CELL_IMBALANCE',
    ]);
  });

  it('reports every rule that fires at once', () => {
    expect(codes(rules({ cells: [4.4, 3.9, 2.8], tempC: 45, imbalanceV: 1.6 }))).toEqual([
      'HIGH_TEMP',
      'OVERVOLTAGE_1',
      'UNDERVOLTAGE_3',
      'CELL_IMBALANCE',
    ]);
  });
});

describe('alertedCellIndexes / cellAlertFlags', () => {
  it('maps alert codes back to zero-based indexes', () => {
    const alerts = deriveAlerts({
      cells: [4.3, 3.9, 2.8],
      tempC: null,
      imbalanceV: null,
    });

    expect(alertedCellIndexes(alerts)).toEqual([0, 2]);
    expect(cellAlertFlags(alerts, 3)).toEqual([true, false, true]);
  });

  it('scales to a pack with more cells than the alert mentions', () => {
    const alerts = deriveAlerts({ cells: [4.3], tempC: null, imbalanceV: null });

    expect(cellAlertFlags(alerts, 4)).toEqual([true, false, false, false]);
  });

  it('ignores alerts that are not cell-specific', () => {
    expect(
      alertedCellIndexes(deriveAlerts({ cells: [], tempC: 40, imbalanceV: 0.5 })),
    ).toEqual([]);
  });

  it('drops indexes outside the pack', () => {
    const stray: Alert[] = [{ code: 'OVERVOLTAGE_5', message: '', severity: 'warn' }];
    expect(cellAlertFlags(stray, 2)).toEqual([false, false]);
  });
});
