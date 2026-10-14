import { finiteValues } from './numeric';

/**
 * Summary statistics over a sampled series.
 *
 * Every field is null when there is nothing to compute from, so the UI shows a
 * dash instead of a misleading zero. `count` is the number of *finite* samples,
 * which may be fewer than the series length when a channel omits a metric.
 */
export interface SeriesSummary {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  first: number | null;
  last: number | null;
  /** max - min, i.e. the spread across the window. */
  range: number | null;
  /** last - first, i.e. the change across the window. */
  delta: number | null;
}

const EMPTY: SeriesSummary = {
  count: 0,
  min: null,
  max: null,
  mean: null,
  first: null,
  last: null,
  range: null,
  delta: null,
};

export function summarise(series: ReadonlyArray<number | null | undefined>): SeriesSummary {
  if (series.length === 0) return EMPTY;

  const values = finiteValues(series);
  if (values.length === 0) return EMPTY;

  let min = values[0]!;
  let max = values[0]!;
  let total = 0;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
    total += value;
  }

  const first = values[0]!;
  const last = values[values.length - 1]!;

  return {
    count: values.length,
    min,
    max,
    mean: total / values.length,
    first,
    last,
    range: max - min,
    delta: last - first,
  };
}

/** Arithmetic mean of the finite entries, or null when there are none. */
export function mean(series: ReadonlyArray<number | null | undefined>): number | null {
  const values = finiteValues(series);
  if (values.length === 0) return null;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

/**
 * Largest absolute value, keeping its sign (the DC analogue of "peak").
 * Returns null rather than 0 for an empty or all-null series.
 */
export function peak(series: ReadonlyArray<number | null | undefined>): number | null {
  const values = finiteValues(series);
  if (values.length === 0) return null;

  let best = values[0]!;
  for (const value of values) {
    if (Math.abs(value) > Math.abs(best)) best = value;
  }
  return best;
}
