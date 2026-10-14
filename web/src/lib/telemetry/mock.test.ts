import { describe, expect, it } from 'vitest';
import { buildMockRaw } from './mock';
import { parseChannel } from './parse';

/**
 * The demo fixtures are raw ThingSpeak-shaped payloads on purpose: these tests
 * prove they survive the exact same parser as live data.
 */
describe('buildMockRaw', () => {
  it('normal: 100 live feeds, no alerts, no NaN', () => {
    const { latest, history } = parseChannel(buildMockRaw('normal'));

    expect(history).toHaveLength(100);
    expect(latest?.status).toBe('LIVE');
    expect(latest?.alerts).toEqual([]);
    expect(
      history.every((f) => Number.isFinite(f.packV) && Number.isFinite(f.imbalanceV)),
    ).toBe(true);
  });

  it('normal: successive builds advance rather than repeat', () => {
    const first = parseChannel(buildMockRaw('normal')).latest;
    const second = parseChannel(buildMockRaw('normal')).latest;

    expect(second?.timestamp).not.toBe(first?.timestamp);
  });

  it('alert: temperature, overvoltage and imbalance all fire', () => {
    const { latest } = parseChannel(buildMockRaw('alert'));

    expect(latest?.alerts.map((a) => a.code).sort()).toEqual([
      'CELL_IMBALANCE',
      'HIGH_TEMP',
      'OVERVOLTAGE_1',
    ]);
    expect(latest?.tempC).toBeGreaterThan(32);
  });

  it('stale: newest feed is roughly 150s old', () => {
    const { latest } = parseChannel(buildMockRaw('stale'));
    expect(latest?.status).toBe('STALE');
  });

  it('empty: no feeds at all', () => {
    expect(parseChannel(buildMockRaw('empty'))).toEqual({ latest: null, history: [] });
  });

  it('malformed: every row is rejected by the schema', () => {
    expect(parseChannel(buildMockRaw('malformed'))).toEqual({
      latest: null,
      history: [],
    });
  });

  it('defaults to the normal scenario', () => {
    expect(parseChannel(buildMockRaw()).history).toHaveLength(100);
  });
});
