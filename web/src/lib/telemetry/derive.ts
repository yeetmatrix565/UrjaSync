import { integrateEnergy, type EnergySample, type EnergySummary } from '@/lib/electrical/energy';
import { summarise, type SeriesSummary } from '@/lib/electrical/stats';
import { localTime } from '@/lib/format';
import type { Telemetry } from './types';

export type TrendRow = Record<string, string | number | null>;

/**
 * Chart rows for the detail screens: a local-time label plus every metric, and
 * optionally one key per cell. Shared so each screen doesn't rebuild the shape.
 */
export function trendRows(
  history: readonly Telemetry[],
  includeCells = false,
): TrendRow[] {
  return history.map((entry) => {
    const row: TrendRow = {
      label: localTime(entry.timestamp),
      packV: entry.packV,
      currentA: entry.currentA,
      powerW: entry.powerW,
      tempC: entry.tempC,
      soc: entry.soc,
      soh: entry.soh,
      imbalanceV: entry.imbalanceV,
    };

    if (includeCells) {
      entry.cells.forEach((value, index) => {
        row[`cell${index}`] = value;
      });
    }

    return row;
  });
}

export interface MetricSeries {
  /** One entry per history sample; null where the channel published nothing. */
  values: Array<number | null>;
  summary: SeriesSummary;
}

export interface WindowMetrics {
  sampleCount: number;
  /** Span between the first and last sample, in ms. 0 when there is no span. */
  durationMs: number;
  packV: MetricSeries;
  currentA: MetricSeries;
  powerW: MetricSeries;
  tempC: MetricSeries;
  soc: MetricSeries;
  soh: MetricSeries;
  imbalanceV: MetricSeries;
  cells: MetricSeries[];
}

function seriesOf(
  history: readonly Telemetry[],
  select: (entry: Telemetry) => number | null,
): MetricSeries {
  const values = history.map(select);
  return { values, summary: summarise(values) };
}

/** Widest cell list across the history, so per-cell series line up. */
export function windowCellCount(history: readonly Telemetry[]): number {
  let max = 0;
  for (const entry of history) max = Math.max(max, entry.cells.length);
  return max;
}

/** Span covered by the history window, derived from real timestamps. */
export function windowDurationMs(history: readonly Telemetry[]): number {
  if (history.length < 2) return 0;

  const first = Date.parse(history[0]!.timestamp);
  const last = Date.parse(history[history.length - 1]!.timestamp);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return 0;

  return last - first;
}

/**
 * Every metric the dashboard and detail screens summarise over the window,
 * computed once per poll rather than per render or per frame.
 */
export function windowMetrics(history: readonly Telemetry[]): WindowMetrics {
  const cellCount = windowCellCount(history);
  const cells: MetricSeries[] = [];
  for (let i = 0; i < cellCount; i++) {
    cells.push(seriesOf(history, (entry) => entry.cells[i] ?? null));
  }

  return {
    sampleCount: history.length,
    durationMs: windowDurationMs(history),
    packV: seriesOf(history, (entry) => entry.packV),
    currentA: seriesOf(history, (entry) => entry.currentA),
    powerW: seriesOf(history, (entry) => entry.powerW),
    tempC: seriesOf(history, (entry) => entry.tempC),
    soc: seriesOf(history, (entry) => entry.soc),
    soh: seriesOf(history, (entry) => entry.soh),
    imbalanceV: seriesOf(history, (entry) => entry.imbalanceV),
    cells,
  };
}

/** Accumulated energy and charge over the window, from real timestamps. */
export function windowEnergy(history: readonly Telemetry[]): EnergySummary {
  const samples: EnergySample[] = [];
  for (const entry of history) {
    const t = Date.parse(entry.timestamp);
    if (!Number.isFinite(t)) continue;
    samples.push({ t, powerW: entry.powerW, currentA: entry.currentA });
  }
  return integrateEnergy(samples);
}

/** Human-readable duration for a window, e.g. "24 min" or "1 h 05 min". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}
