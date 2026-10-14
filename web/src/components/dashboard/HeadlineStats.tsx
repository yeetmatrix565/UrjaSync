'use client';

import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { fmt, fmtInt } from '@/lib/format';

/**
 * The three primary readouts, sat directly under the pack view so the numbers
 * that answer "what is the pack doing right now" are adjacent to the model they
 * describe. Everything deeper lives behind the cards below.
 */
export function HeadlineStats() {
  const { snapshot } = useTelemetryContext();

  const headline = [
    { label: 'pack voltage', value: fmt(snapshot.packV, 2), unit: 'V', color: '#22d3ee' },
    { label: 'soc', value: fmtInt(snapshot.soc), unit: '%', color: '#30d158' },
    { label: 'current', value: fmt(snapshot.currentA, 2), unit: 'A', color: '#a78bfa' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {headline.map((item) => (
        <div key={item.label} className="glass px-2.5 py-2">
          <p className="label-xs truncate">{item.label}</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="num text-lg font-medium leading-none" style={{ color: item.color }}>
              {item.value}
            </span>
            <span className="font-mono text-[10px] text-white/40">{item.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
