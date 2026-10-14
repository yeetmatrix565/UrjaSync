import { describe, expect, it } from 'vitest';
import { integrateEnergy, type EnergySample } from './energy';

/**
 * Two samples separated by `seconds`, both carrying the same readings.
 * Spans stay under the 600 s gap cap, matching the real 15 s cadence.
 */
function pair(
  seconds: number,
  powerW: number | null,
  currentA: number | null,
): EnergySample[] {
  return [
    { t: 0, powerW, currentA },
    { t: seconds * 1000, powerW, currentA },
  ];
}

describe('integrateEnergy', () => {
  it('integrates constant power to P x t', () => {
    // 6 W for 600 s = 6 W * (600/3600) h = 1 Wh
    const result = integrateEnergy(pair(600, 6, null));

    expect(result.dischargedWh).toBeCloseTo(1, 9);
    expect(result.chargedWh).toBe(0);
    expect(result.netWh).toBeCloseTo(1, 9);
    expect(result.durationMs).toBe(600_000);
    expect(result.powerSamples).toBe(1);
  });

  it('integrates constant current to amp-hours', () => {
    // 6 A for 600 s = 1 Ah
    const result = integrateEnergy(pair(600, null, 6));

    expect(result.dischargedAh).toBeCloseTo(1, 9);
    expect(result.chargedAh).toBe(0);
  });

  it('splits charge from discharge by sign', () => {
    const result = integrateEnergy(pair(600, -6, -6));

    expect(result.chargedWh).toBeCloseTo(1, 9);
    expect(result.dischargedWh).toBe(0);
    expect(result.chargedAh).toBeCloseTo(1, 9);
    expect(result.netWh).toBeCloseTo(-1, 9);
  });

  it('uses the trapezoid, not the left value', () => {
    // power ramps 0 -> 12 W over 600 s: mean 6 W => 1 Wh
    const ramp: EnergySample[] = [
      { t: 0, powerW: 0, currentA: null },
      { t: 600_000, powerW: 12, currentA: null },
    ];

    expect(integrateEnergy(ramp).dischargedWh).toBeCloseTo(1, 9);
  });

  it('skips a segment with an implausible gap instead of integrating through it', () => {
    const withGap: EnergySample[] = [
      { t: 0, powerW: 6, currentA: null },
      { t: 3_600_000, powerW: 6, currentA: null }, // 3600 s > 600 s cap
    ];

    const result = integrateEnergy(withGap);

    expect(result.durationMs).toBe(0);
    expect(result.dischargedWh).toBe(0);
    expect(result.powerSamples).toBe(0);
  });

  it('ignores non-positive time deltas', () => {
    const outOfOrder: EnergySample[] = [
      { t: 5000, powerW: 6, currentA: null },
      { t: 1000, powerW: 6, currentA: null },
    ];

    expect(integrateEnergy(outOfOrder).durationMs).toBe(0);
  });

  it('does not integrate a segment whose endpoints are missing values', () => {
    const partial: EnergySample[] = [
      { t: 0, powerW: 6, currentA: 6 },
      { t: 60_000, powerW: null, currentA: null },
      { t: 120_000, powerW: 6, currentA: 6 },
    ];

    const result = integrateEnergy(partial);

    // Time still accrues (the pack was connected), but nothing is integrated
    // from a segment with a missing endpoint.
    expect(result.durationMs).toBe(120_000);
    expect(result.powerSamples).toBe(0);
    expect(result.dischargedWh).toBe(0);
    expect(result.dischargedAh).toBe(0);
  });

  it('integrates the good segments around a dropped sample', () => {
    const partial: EnergySample[] = [
      { t: 0, powerW: 6, currentA: null },
      { t: 60_000, powerW: null, currentA: null },
      { t: 120_000, powerW: 6, currentA: null },
      { t: 180_000, powerW: 6, currentA: null },
    ];

    const result = integrateEnergy(partial);

    // Only the 120s -> 180s segment has two usable power values: 6 W * 60/3600.
    expect(result.powerSamples).toBe(1);
    expect(result.dischargedWh).toBeCloseTo(0.1, 9);
  });

  it('returns an empty summary for fewer than two samples', () => {
    expect(integrateEnergy([]).durationMs).toBe(0);
    expect(integrateEnergy([{ t: 0, powerW: 5, currentA: 5 }]).dischargedWh).toBe(0);
  });
});
