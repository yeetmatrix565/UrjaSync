'use client';

import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { fmt, fmtInt } from '@/lib/format';

/**
 * The three primary readouts, sat directly under the pack view so the numbers
 * that answer "what is the pack doing right now" are adjacent to the model they
 * describe. Everything deeper lives behind the cards below.
 *
 * A <dl>: these are term/value pairs, so description-list semantics give
 * assistive tech the label/value relationship for free. Each tile carries a
 * 2px accent bar in its metric colour for at-a-glance scanning.
 */
export function HeadlineStats() {
  const { snapshot } = useTelemetryContext();

  const headline = [
    { label: 'pack voltage', value: fmt(snapshot.packV, 2), unit: 'V', color: '#22d3ee' },
    { label: 'soc', value: fmtInt(snapshot.soc), unit: '%', color: '#30d158' },
    { label: 'current', value: fmt(snapshot.currentA, 2), unit: 'A', color: '#a78bfa' },
  ];

  return (
    <dl className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {headline.map((item) => (
        <div
          key={item.label}
          className="glass overflow-hidden px-3 py-2.5 sm:px-3.5 sm:py-3"
        >
          <div
            className="mb-2 h-0.5 w-6 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <dt className="label-xs truncate">{item.label}</dt>
          <dd className="mt-1.5 flex items-baseline gap-1">
            <span
              className="num text-xl font-semibold leading-none tracking-tight sm:text-2xl"
              style={{ color: item.color }}
            >
              {item.value}
            </span>
            <span className="font-mono text-[11px] text-white/55">{item.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
