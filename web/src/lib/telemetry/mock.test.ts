import { describe, expect, it } from 'vitest';
import { detectMapping, extractFieldLabels } from './detect';
import { buildMockRaw } from './mock';
import { parseChannel } from './parse';
import type { Scenario } from './types';

/**
 * The demo fixtures are raw ThingSpeak-shaped payloads on purpose: these tests
 * prove they survive the exact same detector and parser as live data.
 */
function parse(scenario: Scenario) {
  const raw = buildMockRaw(scenario);
  return parseChannel(raw, detectMapping(extractFieldLabels(raw)));
}

describe('buildMockRaw', () => {
  it('normal: 100 live feeds, no alerts, nothing non-finite', () => {
    const { latest, history } = parse('normal');

    expect(history).toHaveLength(100);
    expect(latest?.status).toBe('LIVE');
    expect(latest?.alerts).toEqual([]);
    expect(history.every((f) => f.packV !== null && Number.isFinite(f.packV))).toBe(true);
  });

  it('normal: successive builds advance rather than repeat', () => {
    const first = parse('normal').latest;
    const second = parse('normal').latest;

    expect(second?.timestamp).not.toBe(first?.timestamp);
  });

  it('basic: a 2S pack with no temperature, SOC or SOH, pack total derived', () => {
    const { latest, history } = parse('basic');

    expect(history).toHaveLength(100);
    expect(latest?.cells).toHaveLength(2);
    expect(latest?.tempC).toBeNull();
    expect(latest?.soc).toBeNull();
    expect(latest?.soh).toBeNull();

    const [c1, c2] = latest?.cells ?? [];
    expect(latest?.packV).toBeCloseTo((c1 ?? 0) + (c2 ?? 0), 2);
    expect(latest?.status).toBe('LIVE');
  });

  it('alert: temperature, overvoltage and imbalance all fire', () => {
    const { latest } = parse('alert');

    expect(latest?.alerts.map((a) => a.code).sort()).toEqual([
      'CELL_IMBALANCE',
      'HIGH_TEMP',
      'OVERVOLTAGE_1',
    ]);
    expect(latest?.tempC ?? 0).toBeGreaterThan(32);
  });

  it('stale: newest feed is roughly 150s old', () => {
    expect(parse('stale').latest?.status).toBe('STALE');
  });

  it('empty: no feeds at all', () => {
    expect(parse('empty')).toEqual({ latest: null, history: [] });
  });

  it('malformed: nothing is readable in any row', () => {
    expect(parse('malformed')).toEqual({ latest: null, history: [] });
  });

  it('defaults to the normal scenario', () => {
    expect(parseChannel(buildMockRaw()).history).toHaveLength(100);
  });
});
