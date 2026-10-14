import { describe, expect, it } from 'vitest';
import { integrateEnergy } from './energy';
import { FORMULAS, formulaFor, type FormulaDoc } from './formulas';
import { mean, summarise } from './stats';
import { POLL_INTERVAL_MS } from '@/lib/telemetry/constants';
import { mapFeed } from '@/lib/telemetry/parse';
import { computeStatus } from '@/lib/telemetry/rules';

/**
 * Drift guard for the drift-guard claim in formulas.ts: every documented
 * formula's `implementation` must name a calculation that actually exists,
 * and every calculation in the documented set must be named by at least one
 * entry - so a calculation can never ship without a doc entry, and a doc
 * entry can never point at a renamed / deleted function.
 *
 * The documented calculation set is the set FORMULAS already references:
 * mapFeed, summarise, mean, integrateEnergy, computeStatus, POLL_INTERVAL_MS.
 * A genuinely new calculation must be added to this list AND to FORMULAS
 * together, or this test fails - that is the guard working.
 */
const DOCUMENTED_CALCULATIONS: ReadonlyArray<{ name: string; exists: unknown }> = [
  { name: 'mapFeed', exists: mapFeed },
  { name: 'summarise', exists: summarise },
  { name: 'mean', exists: mean },
  { name: 'integrateEnergy', exists: integrateEnergy },
  { name: 'computeStatus', exists: computeStatus },
  { name: 'POLL_INTERVAL_MS', exists: POLL_INTERVAL_MS },
];

describe('FORMULAS drift guard', () => {
  it('has one entry per documented formula, with id matching its key', () => {
    const entries = Object.entries(FORMULAS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, doc] of entries) {
      expect(doc.id).toBe(key);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.meaning.length).toBeGreaterThan(0);
      expect(doc.formula.length).toBeGreaterThan(0);
      expect(doc.variables.length).toBeGreaterThan(0);
      expect(doc.implementation.length).toBeGreaterThan(0);
      for (const variable of doc.variables) {
        expect(variable.symbol.length).toBeGreaterThan(0);
        expect(variable.definition.length).toBeGreaterThan(0);
      }
    }
    // No duplicate ids.
    const ids = entries.map(([, doc]) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every implementation names a calculation that actually exists', () => {
    for (const doc of Object.values(FORMULAS) as FormulaDoc[]) {
      const named = DOCUMENTED_CALCULATIONS.find((calc) =>
        doc.implementation.includes(calc.name),
      );
      expect(
        named,
        `FORMULAS.${doc.id} implementation "${doc.implementation}" names no known calculation`,
      ).toBeDefined();
      expect(
        typeof named!.exists === 'function' || typeof named!.exists === 'number',
      ).toBe(true);
    }
  });

  it('every documented calculation is named by at least one entry', () => {
    const implementations = (Object.values(FORMULAS) as FormulaDoc[]).map(
      (doc) => doc.implementation,
    );
    for (const calc of DOCUMENTED_CALCULATIONS) {
      expect(
        implementations.some((impl) => impl.includes(calc.name)),
        `calculation ${calc.name} ships with no FORMULAS entry`,
      ).toBe(true);
    }
  });

  it('formulaFor returns the documented entry', () => {
    expect(formulaFor('energy')).toBe(FORMULAS.energy);
    expect(formulaFor('packVoltage').implementation).toContain('mapFeed');
  });
});
