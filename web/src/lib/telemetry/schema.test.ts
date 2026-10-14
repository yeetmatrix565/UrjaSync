import { describe, expect, it } from 'vitest';
import { channelResponseSchema, feedSchema, numeric } from './schema';

const VALID_FEED = {
  created_at: '2026-01-01T00:00:00Z',
  entry_id: 1,
  field1: '11.75',
  field2: '3.917',
  field3: '3.915',
  field4: '3.916',
  field5: '28.1',
  field6: '1.146',
  field7: '73.2',
  field8: '95.8',
};

describe('numeric', () => {
  it('parses numeric strings', () => {
    expect(numeric.parse('3.917')).toBe(3.917);
    expect(numeric.parse(' -1.5 ')).toBe(-1.5);
  });

  it('accepts numbers', () => {
    expect(numeric.parse(12)).toBe(12);
  });

  it.each(['', '   ', 'abc', 'null', 'NaN', 'Infinity', '1e400'])(
    'rejects non-numeric %j',
    (value) => {
      expect(numeric.safeParse(value).success).toBe(false);
    },
  );

  it('rejects null (the common ThingSpeak empty-field value)', () => {
    expect(numeric.safeParse(null).success).toBe(false);
  });
});

describe('feedSchema', () => {
  it('parses a well-formed feed into numbers', () => {
    const parsed = feedSchema.parse(VALID_FEED);
    expect(parsed.field1).toBe(11.75);
    expect(parsed.field8).toBe(95.8);
    expect(typeof parsed.field6).toBe('number');
  });

  it('treats entry_id as optional', () => {
    const { entry_id: _entryId, ...withoutEntry } = VALID_FEED;
    expect(feedSchema.safeParse(withoutEntry).success).toBe(true);
  });

  it.each(['field1', 'field2', 'field5', 'field8'])('rejects a null %s', (field) => {
    expect(feedSchema.safeParse({ ...VALID_FEED, [field]: null }).success).toBe(false);
  });

  it('rejects a missing created_at', () => {
    const { created_at: _createdAt, ...withoutDate } = VALID_FEED;
    expect(feedSchema.safeParse(withoutDate).success).toBe(false);
  });
});

describe('channelResponseSchema', () => {
  it('accepts a payload with no feeds key', () => {
    expect(channelResponseSchema.parse({ channel: { id: 1 } }).feeds).toBeUndefined();
  });

  it('rejects feeds that are not an array', () => {
    expect(channelResponseSchema.safeParse({ feeds: 'nope' }).success).toBe(false);
  });
});
