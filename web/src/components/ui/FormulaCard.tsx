'use client';

import { useId, useState } from 'react';
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
 * explanation can never drift away from the engine. The toggle is a full-width
 * 44px target with aria-expanded/aria-controls, and a rotating chevron so the
 * open state is visible, not just announced.
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
  const panelId = useId();

  return (
    <section
      className="glass overflow-hidden p-4 sm:p-5"
      aria-label={`${doc.title} calculation`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left"
      >
        <span className="label-xs">{doc.title} · how it is calculated</span>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200/80">
          <span>{open ? 'hide' : 'show'}</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <p className="mt-2.5 overflow-x-auto whitespace-nowrap pb-0.5 font-mono text-[13px] text-cyan-100">
        {doc.formula}
      </p>

      {open ? (
        <div id={panelId} className="mt-3.5 space-y-4">
          <p className="text-[13px] leading-relaxed text-white/70">{doc.meaning}</p>

          <div>
            <p className="label-xs mb-1.5">Variables</p>
            {doc.variables.map((variable) => (
              <div
                key={variable.symbol}
                className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-1.5 last:border-b-0"
              >
                <span className="shrink-0 font-mono text-[12px] text-cyan-100">
                  {variable.symbol}
                </span>
                <span className="text-right font-mono text-[11px] leading-relaxed text-white/65">
                  {variable.definition}
                  {variable.unit ? ` (${variable.unit})` : ''}
                </span>
              </div>
            ))}
          </div>

          {inputs && inputs.length > 0 ? (
            <div>
              <p className="label-xs mb-1.5">Your current inputs</p>
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
              <p className="label-xs mb-1.5">Worked example</p>
              <p className="overflow-x-auto whitespace-nowrap pb-0.5 font-mono text-[12px] leading-relaxed text-white/70">
                {worked}
              </p>
            </div>
          ) : null}

          <div>
            <p className="label-xs mb-1.5">Assumptions</p>
            <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-white/65">
              {doc.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label-xs mb-1.5">Limitations</p>
            <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-white/65">
              {doc.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-[9px] uppercase tracking-widest text-white/45">
            implementation · {doc.implementation}
          </p>
        </div>
      ) : null}
    </section>
  );
}
