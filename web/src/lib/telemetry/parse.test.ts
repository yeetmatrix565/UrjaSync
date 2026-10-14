import { describe, expect, it } from 'vitest';
import { parseChannel } from './parse';

type RawFeed = Record<string, unknown>;

function feed(overrides: RawFeed = {}): RawFeed {
  return {
    created_at: '2026-01-01T00:00:00.000Z',
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

const EMPTY = { latest: null, history: [] };

describe('parseChannel', () => {
  it('maps fields and derives power and imbalance', () => {
    const { latest } = parseChannel({ feeds: [feed()] });

    expect(latest).not.toBeNull();
    expect(latest?.packV).toBe(11.7);
    expect(latest?.cells).toEqual([3.9, 3.91, 3.89]);
    expect(latest?.powerW).toBeCloseTo(11.7 * 1.5, 6);
    expect(latest?.imbalanceV).toBeCloseTo(0.02, 6);
    expect(latest?.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('drops malformed rows but keeps the good ones', () => {
    const { history } = parseChannel({
      feeds: [
        feed({ field1: null }),
        feed({ field5: 'not-a-number' }),
        feed({ field1: '12.1' }),
      ],
    });

    expect(history).toHaveLength(1);
    expect(history[0]?.packV).toBe(12.1);
  });

  it('sorts oldest first and reports the newest as latest', () => {
    const older = feed({ created_at: '2026-01-01T00:00:00.000Z', field1: '11.0' });
    const newer = feed({ created_at: '2026-01-01T00:01:00.000Z', field1: '12.0' });

    const { latest, history } = parseChannel({ feeds: [newer, older] });

    expect(history.map((h) => h.packV)).toEqual([11.0, 12.0]);
    expect(latest?.packV).toBe(12.0);
  });

  it('never lets NaN through', () => {
    const { history } = parseChannel({ feeds: [feed(), feed({ field8: 'NaN' })] });

    for (const entry of history) {
      for (const value of [
        entry.packV,
        entry.tempC,
        entry.soc,
        entry.powerW,
        entry.imbalanceV,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('returns an empty response for a payload with no feeds key', () => {
    expect(parseChannel({ channel: { id: 1 } })).toEqual(EMPTY);
  });

  it('returns an empty response when every feed is malformed', () => {
    expect(parseChannel({ feeds: [feed({ field2: null }), null, 42] })).toEqual(EMPTY);
  });

  it('never throws on unexpected input', () => {
    for (const input of [null, undefined, 0, 'nope', [], { feeds: {} }]) {
      expect(() => parseChannel(input)).not.toThrow();
      expect(parseChannel(input)).toEqual(EMPTY);
    }
  });
});
