/**
 * Numeric guards shared by every electrical calculation.
 *
 * These exist so no calculation ever returns NaN or Infinity: unusable input
 * becomes null, and null propagates to the UI as an em dash rather than a fake
 * zero. A missing measurement is never treated as 0.
 */

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Coerces anything unusable (null, undefined, NaN, Infinity, junk) to null. */
export function toFiniteOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/** Division that yields null instead of Infinity/NaN (zero denominators). */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

/** Only the finite entries of a possibly-null series, in order. */
export function finiteValues(series: ReadonlyArray<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const value of series) if (isFiniteNumber(value)) out.push(value);
  return out;
}

/** True when at least one entry is a real measurement. */
export function hasFinite(series: ReadonlyArray<number | null | undefined>): boolean {
  for (const value of series) if (isFiniteNumber(value)) return true;
  return false;
}
