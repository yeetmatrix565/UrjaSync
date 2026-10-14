'use client';

import { useState } from 'react';
import { StatRow } from './StatRow';
import type { FormulaDoc } from '@/lib/electrical/formulas';

export interface FormulaInput {
  label: string;
  value: string;
  unit?: string;
}

/**
 * "How is this calculated?" for one parameter.
 *
 * Collapsed by default so a detail screen stays readable, and it shows the
 * formula, the variables, the live input values, a worked example, the
 * assumptions and the limitations - with the implementation it documents, so the
 * explanation can never drift away from the engine.
 */
export function FormulaCard({
  doc,
  inputs,
  worked,
}: {
  doc: FormulaDoc;
  inputs?: ReadonlyArray<FormulaInput>;
  worked?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="glass overflow-hidden p-3.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="label-xs">{doc.title} · how it is calculated</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-200/70">
          {open ? 'hide' : 'show'}
        </span>
      </button>

      <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-cyan-100">
        {doc.formula}
      </p>

      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] leading-relaxed text-white/55">{doc.meaning}</p>

          <div>
            <p className="label-xs mb-1">Variables</p>
            {doc.variables.map((variable) => (
              <div
                key={variable.symbol}
                className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1 last:border-b-0"
              >
                <span className="font-mono text-[11px] text-cyan-100">{variable.symbol}</span>
                <span className="text-right font-mono text-[11px] text-white/50">
                  {variable.definition}
                  {variable.unit ? ` (${variable.unit})` : ''}
                </span>
              </div>
            ))}
          </div>

          {inputs && inputs.length > 0 ? (
            <div>
              <p className="label-xs mb-1">Your current inputs</p>
              {inputs.map((input) => (
                <StatRow
                  key={input.label}
                  label={input.label}
                  value={input.value}
                  unit={input.unit}
                />
              ))}
            </div>
          ) : null}

          {worked ? (
            <div>
              <p className="label-xs mb-1">Worked example</p>
              <p className="font-mono text-[11px] leading-relaxed text-white/55">{worked}</p>
            </div>
          ) : null}

          <div>
            <p className="label-xs mb-1">Assumptions</p>
            <ul className="list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-white/50">
              {doc.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label-xs mb-1">Limitations</p>
            <ul className="list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-white/50">
              {doc.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-[9px] uppercase tracking-widest text-white/25">
            implementation · {doc.implementation}
          </p>
        </div>
      ) : null}
    </section>
  );
}
