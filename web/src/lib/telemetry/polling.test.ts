import { describe, expect, it } from 'vitest';
import { POLL_INTERVAL_MS } from './constants';
import { keepsPreviousReadings, pollDelayMs, POLL_BACKOFF_MS } from './polling';
import type { Telemetry } from './types';

function entry(): Telemetry {
  return {
    timestamp: '2026-01-01T00:00:00.000Z',
    packV: 11.7,
    cells: [3.9, 3.91, 3.89],
    tempC: 28,
    currentA: 1.5,
    soc: 70,
    soh: 96,
    powerW: 17.55,
    imbalanceV: 0.02,
    status: 'LIVE',
    alerts: [],
  };
}

describe('pollDelayMs', () => {
  it('polls at the ThingSpeak floor while the device is live', () => {
    expect(pollDelayMs('LIVE')).toBe(POLL_INTERVAL_MS);
  });

  it('backs off once the data goes stale', () => {
    expect(pollDelayMs('STALE')).toBe(60_000);
  });

  it('backs off hardest while the device is offline', () => {
    expect(pollDelayMs('OFFLINE')).toBe(300_000);
  });

  it('never polls faster as freshness drops', () => {
    expect(pollDelayMs('LIVE')).toBeLessThan(pollDelayMs('STALE'));
    expect(pollDelayMs('STALE')).toBeLessThan(pollDelayMs('OFFLINE'));
  });

  it('keeps every status covered', () => {
    expect(Object.keys(POLL_BACKOFF_MS).sort()).toEqual(['LIVE', 'OFFLINE', 'STALE']);
  });
});

describe('keepsPreviousReadings', () => {
  it('keeps the last readings when the channel answers with nothing', () => {
    expect(keepsPreviousReadings({ latest: null, history: [] }, true)).toBe(true);
  });

  it('replaces the readings when the channel returns data', () => {
    expect(keepsPreviousReadings({ latest: entry(), history: [entry()] }, true)).toBe(false);
  });

  it('accepts an empty response when there is nothing to preserve', () => {
    // First load on an empty channel: empty is all we know, so show it.
    expect(keepsPreviousReadings({ latest: null, history: [] }, false)).toBe(false);
  });

  it('replaces readings when history arrives without a latest', () => {
    expect(keepsPreviousReadings({ latest: null, history: [entry()] }, true)).toBe(false);
  });
});
