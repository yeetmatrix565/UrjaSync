import { describe, expect, it } from 'vitest';
import { ALERT_THRESHOLDS, STATUS_WINDOWS } from './constants';
import { alertedCellIndexes, cellAlertFlags, computeStatus, deriveAlerts } from './rules';
import type { Alert } from './types';

const NOW = 1_700_000_000_000;

const healthy: [number, number, number] = [3.9, 3.91, 3.89];

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
    expect(deriveAlerts(healthy, 25, 0.02)).toEqual([]);
  });

  it('warns above the temperature threshold and escalates when critical', () => {
    expect(codes(deriveAlerts(healthy, ALERT_THRESHOLDS.tempWarn + 1, 0.02))).toEqual([
      'HIGH_TEMP',
    ]);
    const [warn] = deriveAlerts(healthy, 33, 0.02);
    expect(warn?.severity).toBe('warn');

    const critical = deriveAlerts(healthy, ALERT_THRESHOLDS.tempCritical + 1, 0.02);
    expect(critical[0]?.severity).toBe('critical');
  });

  it('does not fire at exactly the temperature threshold', () => {
    expect(deriveAlerts(healthy, ALERT_THRESHOLDS.tempWarn, 0.02)).toEqual([]);
  });

  it('flags overvoltage per cell', () => {
    const alerts = deriveAlerts([4.3, 3.9, 3.9], 25, 0.02);
    expect(codes(alerts)).toEqual(['OVERVOLTAGE_1']);
    expect(alerts[0]?.severity).toBe('critical');
  });

  it('flags undervoltage per cell', () => {
    expect(codes(deriveAlerts([3.9, 3.9, 2.9], 25, 0.02))).toEqual(['UNDERVOLTAGE_3']);
  });

  it('flags cell imbalance', () => {
    expect(
      codes(deriveAlerts(healthy, 25, ALERT_THRESHOLDS.cellImbalance + 0.01)),
    ).toEqual(['CELL_IMBALANCE']);
  });

  it('reports every rule that fires at once', () => {
    expect(codes(deriveAlerts([4.4, 3.9, 2.8], 45, 1.6))).toEqual([
      'HIGH_TEMP',
      'OVERVOLTAGE_1',
      'UNDERVOLTAGE_3',
      'CELL_IMBALANCE',
    ]);
  });
});

describe('alertedCellIndexes / cellAlertFlags', () => {
  it('maps alert codes back to zero-based cell indexes', () => {
    const alerts = deriveAlerts([4.3, 3.9, 2.8], 25, 0.02);
    expect(alertedCellIndexes(alerts)).toEqual([0, 2]);
    expect(cellAlertFlags(alerts)).toEqual([true, false, true]);
  });

  it('ignores alerts that are not cell-specific', () => {
    expect(alertedCellIndexes(deriveAlerts(healthy, 40, 0.5))).toEqual([]);
    expect(cellAlertFlags([])).toEqual([false, false, false]);
  });
});
