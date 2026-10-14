import { describe, expect, it } from 'vitest';
import { finiteValues, hasFinite, isFiniteNumber, safeDivide, toFiniteOrNull } from './numeric';

describe('isFiniteNumber', () => {
  it('accepts finite numbers only', () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-1.5)).toBe(true);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber('1')).toBe(false);
  });
});

describe('toFiniteOrNull', () => {
  it('passes finite numbers through', () => {
    expect(toFiniteOrNull(3.5)).toBe(3.5);
  });

  it('parses numeric strings', () => {
    expect(toFiniteOrNull(' 12.5 ')).toBe(12.5);
  });

  it.each([null, undefined, '', '   ', 'abc', NaN, Infinity, -Infinity, {}, []])(
    'maps %p to null',
    (value) => {
      expect(toFiniteOrNull(value)).toBeNull();
    },
  );
});

describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it('returns null for a zero denominator rather than Infinity', () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(safeDivide(0, 0)).toBeNull();
  });

  it('returns null for non-finite operands', () => {
    expect(safeDivide(NaN, 2)).toBeNull();
    expect(safeDivide(1, Infinity)).toBeNull();
  });
});

describe('finiteValues / hasFinite', () => {
  it('keeps only finite entries, in order', () => {
    expect(finiteValues([1, null, 2, NaN, undefined, 3])).toEqual([1, 2, 3]);
  });

  it('reports whether anything is measurable', () => {
    expect(hasFinite([null, undefined, NaN])).toBe(false);
    expect(hasFinite([null, 0])).toBe(true);
    expect(hasFinite([])).toBe(false);
  });
});
