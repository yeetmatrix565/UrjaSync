import { describe, expect, it } from 'vitest';
import { channelResponseSchema, feedSchema, toNumberOrNull } from './schema';

describe('toNumberOrNull', () => {
  it('parses numeric strings', () => {
    expect(toNumberOrNull('3.917')).toBe(3.917);
    expect(toNumberOrNull(' -1.5 ')).toBe(-1.5);
  });

  it('passes finite numbers through', () => {
    expect(toNumberOrNull(12)).toBe(12);
  });

  it.each([
    null,
    undefined,
    '',
    '   ',
    'abc',
    'null',
    'NaN',
    'Infinity',
    NaN,
    Infinity,
    -Infinity,
  ])('maps %p to null', (value) => {
    expect(toNumberOrNull(value)).toBeNull();
  });

  it('never throws on unexpected types', () => {
    expect(toNumberOrNull({})).toBeNull();
    expect(toNumberOrNull([])).toBeNull();
    expect(toNumberOrNull(true)).toBeNull();
  });
});

describe('feedSchema', () => {
  const base = { created_at: '2026-01-01T00:00:00.000Z' };

  it('normalises every field, including missing and unparseable ones', () => {
    const parsed = feedSchema.parse({ ...base, field1: '11.75', field3: 'abc' });

    expect(parsed.field1).toBe(11.75);
    expect(parsed.field2).toBeNull();
    expect(parsed.field3).toBeNull();
    expect(parsed.field8).toBeNull();
  });

  it('accepts a feed carrying a single field', () => {
    const parsed = feedSchema.parse({ ...base, field4: '3.2' });

    expect(parsed.field4).toBe(3.2);
    expect(parsed.field1).toBeNull();
  });

  it('accepts entry_id as a number, a string, or absent', () => {
    expect(feedSchema.safeParse({ ...base, entry_id: 1 }).success).toBe(true);
    expect(feedSchema.safeParse({ ...base, entry_id: '1' }).success).toBe(true);
    expect(feedSchema.safeParse(base).success).toBe(true);
  });

  it('still requires created_at', () => {
    expect(feedSchema.safeParse({ field1: '1' }).success).toBe(false);
    expect(feedSchema.safeParse({ ...base, created_at: 5 }).success).toBe(false);
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
