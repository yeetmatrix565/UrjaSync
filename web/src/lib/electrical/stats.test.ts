import { describe, expect, it } from 'vitest';
import { mean, peak, summarise } from './stats';

describe('summarise', () => {
  it('returns nulls for an empty series', () => {
    expect(summarise([])).toEqual({
      count: 0,
      min: null,
      max: null,
      mean: null,
      first: null,
      last: null,
      range: null,
      delta: null,
    });
  });

  it('returns nulls when nothing is finite - a missing metric is not zero', () => {
    const summary = summarise([null, null, NaN]);
    expect(summary.count).toBe(0);
    expect(summary.mean).toBeNull();
    expect(summary.min).toBeNull();
  });

  it('computes the full summary', () => {
    expect(summarise([3, 1, 4, 2])).toEqual({
      count: 4,
      min: 1,
      max: 4,
      mean: 2.5,
      first: 3,
      last: 2,
      range: 3,
      delta: -1,
    });
  });

  it('skips nulls rather than treating them as zero', () => {
    const summary = summarise([10, null, 20, undefined, 30]);
    expect(summary.count).toBe(3);
    expect(summary.mean).toBe(20);
    expect(summary.min).toBe(10);
    expect(summary.max).toBe(30);
  });

  it('handles a single sample', () => {
    const summary = summarise([7]);
    expect(summary.count).toBe(1);
    expect(summary.range).toBe(0);
    expect(summary.delta).toBe(0);
    expect(summary.mean).toBe(7);
  });

  it('handles negative values (charge current)', () => {
    const summary = summarise([-1, -3, -2]);
    expect(summary.min).toBe(-3);
    expect(summary.max).toBe(-1);
    expect(summary.mean).toBe(-2);
  });
});

describe('mean', () => {
  it('averages the finite entries', () => {
    expect(mean([2, 4, null])).toBe(3);
  });

  it('is null with nothing to average', () => {
    expect(mean([])).toBeNull();
    expect(mean([null, NaN])).toBeNull();
  });
});

describe('peak', () => {
  it('keeps the sign of the largest magnitude', () => {
    expect(peak([-5, 3, 4])).toBe(-5);
    expect(peak([1, 9, -2])).toBe(9);
  });

  it('is null with nothing to measure', () => {
    expect(peak([])).toBeNull();
    expect(peak([null])).toBeNull();
  });
});
