import { ALERT_THRESHOLDS, STATUS_WINDOWS } from './constants';
import type { Alert, Status } from './types';

/** Feed age -> connection status. */
export function computeStatus(ts: number, now: number = Date.now()): Status {
  const age = now - ts;
  if (!Number.isFinite(age) || age < STATUS_WINDOWS.liveMs) return 'LIVE';
  if (age < STATUS_WINDOWS.staleMs) return 'STALE';
  return 'OFFLINE';
}

/** Alert rules applied to a single reading. */
export function deriveAlerts(
  cells: [number, number, number],
  tempC: number,
  imbalanceV: number,
): Alert[] {
  const alerts: Alert[] = [];
  const t = ALERT_THRESHOLDS;

  if (tempC > t.tempWarn) {
    alerts.push({
      code: 'HIGH_TEMP',
      message: `HIGH TEMP ${tempC.toFixed(1)}\u00b0C`,
      severity: tempC > t.tempCritical ? 'critical' : 'warn',
    });
  }

  cells.forEach((v, i) => {
    const n = i + 1;
    if (v > t.cellOvervoltage) {
      alerts.push({
        code: `OVERVOLTAGE_${n}`,
        message: `OVERVOLTAGE C${n}`,
        severity: 'critical',
      });
    }
    if (v < t.cellUndervoltage) {
      alerts.push({
        code: `UNDERVOLTAGE_${n}`,
        message: `UNDERVOLTAGE C${n}`,
        severity: 'critical',
      });
    }
  });

  if (imbalanceV > t.cellImbalance) {
    alerts.push({
      code: 'CELL_IMBALANCE',
      message: `CELL IMBALANCE ${imbalanceV.toFixed(3)}V`,
      severity: 'warn',
    });
  }

  return alerts;
}

const CELL_ALERT_CODE = /(?:OVERVOLTAGE|UNDERVOLTAGE)_([123])/;

/** Cell indexes (0-based) that currently have a cell-specific alert. */
export function alertedCellIndexes(alerts: Alert[]): number[] {
  const indexes: number[] = [];
  for (const alert of alerts) {
    const match = CELL_ALERT_CODE.exec(alert.code);
    if (!match?.[1]) continue;
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < 3 && !indexes.includes(index)) indexes.push(index);
  }
  return indexes;
}

/** Same as `alertedCellIndexes`, shaped for per-cell boolean lookups. */
export function cellAlertFlags(alerts: Alert[]): [boolean, boolean, boolean] {
  const flags: [boolean, boolean, boolean] = [false, false, false];
  for (const index of alertedCellIndexes(alerts)) flags[index] = true;
  return flags;
}
