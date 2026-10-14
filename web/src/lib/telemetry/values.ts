import type { CellVoltages, Telemetry } from './types';

/** True when at least one entry is a real measurement. */
export function hasAnyValue(values: Array<number | null>): boolean {
  return values.some((value) => value !== null && Number.isFinite(value));
}

/** Widest cell list across a history, so charts can lay out a fixed series count. */
export function maxCellCount(history: Telemetry[]): number {
  return history.reduce((max, entry) => Math.max(max, entry.cells.length), 0);
}

export function cellCount(cells: CellVoltages): number {
  return cells.length;
}
