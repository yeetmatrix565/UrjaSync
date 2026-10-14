import { isFiniteNumber } from './numeric';

export interface EnergySample {
  /** Epoch milliseconds of the sample. */
  t: number;
  powerW: number | null;
  currentA: number | null;
}

export interface EnergySummary {
  /** Energy delivered by the pack (discharge, p > 0), in Wh. */
  dischargedWh: number;
  /** Energy returned to the pack (charge, p < 0), in Wh. */
  chargedWh: number;
  /** dischargedWh − chargedWh. */
  netWh: number;
  dischargedAh: number;
  chargedAh: number;
  /** Milliseconds of sampled time actually integrated (gaps excluded). */
  durationMs: number;
  /** Number of samples that carried a usable power value. */
  powerSamples: number;
}

/**
 * A segment longer than this is treated as missing time rather than integrated.
 *
 * At the 15 s ThingSpeak cadence this tolerates a few dropped samples, but
 * refuses to pretend the pack held a power level across a real outage - doing so
 * would invent energy that was never measured.
 */
const MAX_GAP_S = 600;

const EMPTY: EnergySummary = {
  dischargedWh: 0,
  chargedWh: 0,
  netWh: 0,
  dischargedAh: 0,
  chargedAh: 0,
  durationMs: 0,
  powerSamples: 0,
};

/**
 * Trapezoidal integration of p(t) and i(t) over a sampled series.
 *
 * Uses each pair's real timestamps rather than assuming a fixed interval,
 * because ThingSpeak sampling is not perfectly regular. A segment is skipped
 * when it has no usable pair of values or when the gap is implausibly large
 * (a disconnect must not be integrated as if the pack held that power).
 */
export function integrateEnergy(samples: readonly EnergySample[]): EnergySummary {
  if (samples.length < 2) return EMPTY;

  let dischargedWh = 0;
  let chargedWh = 0;
  let dischargedAh = 0;
  let chargedAh = 0;
  let durationMs = 0;
  let powerSamples = 0;

  for (let i = 1; i < samples.length; i++) {
    const previous = samples[i - 1]!;
    const current = samples[i]!;

    const dtSeconds = (current.t - previous.t) / 1000;
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || dtSeconds > MAX_GAP_S) continue;

    durationMs += dtSeconds * 1000;

    if (isFiniteNumber(previous.powerW) && isFiniteNumber(current.powerW)) {
      powerSamples += 1;
      const wh = ((previous.powerW + current.powerW) / 2) * (dtSeconds / 3600);
      if (wh >= 0) dischargedWh += wh;
      else chargedWh += -wh;
    }

    if (isFiniteNumber(previous.currentA) && isFiniteNumber(current.currentA)) {
      const ah = ((previous.currentA + current.currentA) / 2) * (dtSeconds / 3600);
      if (ah >= 0) dischargedAh += ah;
      else chargedAh += -ah;
    }
  }

  return {
    dischargedWh,
    chargedWh,
    netWh: dischargedWh - chargedWh,
    dischargedAh,
    chargedAh,
    durationMs,
    powerSamples,
  };
}

/**
 * Running energy total after each sample, so the Energy card can show a trend
 * that actually represents energy rather than re-plotting power.
 * Uses the same trapezoid and the same gap rule as `integrateEnergy`.
 */
export function cumulativeEnergyWh(samples: readonly EnergySample[]): number[] {
  const series: number[] = [];
  let total = 0;

  for (let i = 0; i < samples.length; i++) {
    if (i > 0) {
      const previous = samples[i - 1]!;
      const current = samples[i]!;
      const dtSeconds = (current.t - previous.t) / 1000;

      if (
        Number.isFinite(dtSeconds) &&
        dtSeconds > 0 &&
        dtSeconds <= MAX_GAP_S &&
        isFiniteNumber(previous.powerW) &&
        isFiniteNumber(current.powerW)
      ) {
        total += ((previous.powerW + current.powerW) / 2) * (dtSeconds / 3600);
      }
    }
    series.push(total);
  }

  return series;
}
