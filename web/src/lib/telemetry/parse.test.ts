import { describe, expect, it } from 'vitest';
import { DEFAULT_FIELD_MAPPING } from './constants';
import { parseChannel } from './parse';
import type { FieldMapping } from './types';

type RawFeed = Record<string, unknown>;

const URJA: FieldMapping = DEFAULT_FIELD_MAPPING;
const EMPTY = { latest: null, history: [] };
const CREATED = '2026-01-01T00:00:00.000Z';

function feed(overrides: RawFeed = {}): RawFeed {
  return {
    created_at: CREATED,
    entry_id: 1,
    field1: '11.7',
    field2: '3.9',
    field3: '3.91',
    field4: '3.89',
    field5: '28',
    field6: '1.5',
    field7: '70',
    field8: '96',
    ...overrides,
  };
}

const BLANK_FEED: RawFeed = {
  created_at: CREATED,
  field1: null,
  field2: null,
  field3: null,
  field4: null,
  field5: null,
  field6: null,
  field7: null,
  field8: null,
};

describe('parseChannel', () => {
  it('maps fields with the reference layout and derives power and imbalance', () => {
    const { latest } = parseChannel({ feeds: [feed()] }, URJA);

    expect(latest?.packV).toBe(11.7);
    expect(latest?.cells).toEqual([3.9, 3.91, 3.89]);
    expect(latest?.powerW).toBeCloseTo(11.7 * 1.5, 6);
    expect(latest?.imbalanceV).toBeCloseTo(0.02, 6);
    expect(latest?.tempC).toBe(28);
    expect(latest?.soc).toBe(70);
    expect(latest?.soh).toBe(96);
    expect(latest?.timestamp).toBe(CREATED);
  });

  it('reads a 2S pack that publishes no temperature, SOC or SOH', () => {
    const mapping: FieldMapping = { cellV: [1, 2], currentA: 3, tempUnit: 'C' };
    const { latest } = parseChannel(
      { feeds: [{ created_at: CREATED, field1: '3.92', field2: '3.88', field3: '0.5' }] },
      mapping,
    );

    expect(latest?.cells).toEqual([3.92, 3.88]);
    expect(latest?.packV).toBeCloseTo(7.8, 6);
    expect(latest?.soh).toBeNull();
    expect(latest?.tempC).toBeNull();
    expect(latest?.imbalanceV).toBeCloseTo(0.04, 6);
    expect(latest?.powerW).toBeCloseTo(3.9, 6);
  });

  it('does not invent a pack total when a cell is missing', () => {
    const mapping: FieldMapping = { cellV: [1, 2], tempUnit: 'C' };
    const { latest } = parseChannel(
      { feeds: [{ created_at: CREATED, field1: '3.92', field2: null }] },
      mapping,
    );

    expect(latest?.packV).toBeNull();
  });

  it('never raises an imbalance alert from a single cell', () => {
    const mapping: FieldMapping = { cellV: [1], tempUnit: 'C' };
    const { latest } = parseChannel(
      { feeds: [{ created_at: CREATED, field1: '3.92' }] },
      mapping,
    );

    expect(latest?.cells).toEqual([3.92]);
    expect(latest?.imbalanceV).toBeNull();
    expect(latest?.alerts).toEqual([]);
  });

  it('converts a Fahrenheit channel to Celsius', () => {
    const mapping: FieldMapping = { cellV: [], tempC: 1, tempUnit: 'F' };
    const { latest } = parseChannel(
      { feeds: [{ created_at: CREATED, field1: '104' }] },
      mapping,
    );

    expect(latest?.tempC).toBeCloseTo(40, 6);
  });

  it('keeps usable rows and drops the empty ones', () => {
    const { history } = parseChannel(
      {
        feeds: [feed({ field1: null }), feed({ field5: 'not-a-number' }), BLANK_FEED],
      },
      URJA,
    );

    expect(history).toHaveLength(2);
    expect(history[0]?.packV).toBe(11.7);
  });

  it('drops a row with an unusable timestamp', () => {
    expect(parseChannel({ feeds: [feed({ created_at: 'not-a-date' })] }, URJA)).toEqual(
      EMPTY,
    );
  });

  it('sorts oldest first and reports the newest as latest', () => {
    const older = feed({ created_at: '2026-01-01T00:00:00.000Z', field1: '11.0' });
    const newer = feed({ created_at: '2026-01-01T00:01:00.000Z', field1: '12.0' });

    const { latest, history } = parseChannel({ feeds: [newer, older] }, URJA);

    expect(history.map((h) => h.packV)).toEqual([11.0, 12.0]);
    expect(latest?.packV).toBe(12.0);
  });

  it('never lets NaN through', () => {
    const { history } = parseChannel(
      { feeds: [feed(), feed({ field8: 'NaN' }), feed({ field2: 'abc' })] },
      URJA,
    );

    for (const entry of history) {
      for (const value of [
        entry.packV,
        entry.tempC,
        entry.soc,
        entry.powerW,
        entry.imbalanceV,
        ...entry.cells,
      ]) {
        expect(value === null || Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('returns an empty response for a payload with no feeds key', () => {
    expect(parseChannel({ channel: { id: 1 } }, URJA)).toEqual(EMPTY);
  });

  it('returns an empty response when no feed is usable', () => {
    expect(parseChannel({ feeds: [BLANK_FEED, null, 42] }, URJA)).toEqual(EMPTY);
  });

  it('never throws on unexpected input', () => {
    for (const input of [null, undefined, 0, 'nope', [], { feeds: {} }]) {
      expect(() => parseChannel(input, URJA)).not.toThrow();
      expect(parseChannel(input, URJA)).toEqual(EMPTY);
    }
  });
});
