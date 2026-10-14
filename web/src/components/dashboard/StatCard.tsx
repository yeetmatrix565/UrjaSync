'use client';

import { Sparkline } from './Sparkline';

export interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  color?: string;
  spark?: Array<number | null>;
  hint?: string;
}

export function StatCard({
  label,
  value,
  unit,
  color = '#22d3ee',
  spark,
  hint,
}: StatCardProps) {
  return (
    <div className="glass snap-item flex min-w-[9.25rem] flex-col gap-1.5 p-3 sm:min-w-0">
      <span className="label-xs">{label}</span>
      <span className="flex items-baseline gap-1">
        <span
          className="num text-2xl font-medium leading-none text-white"
          style={{ color }}
        >
          {value}
        </span>
        <span className="font-mono text-[11px] text-white/40">{unit}</span>
      </span>
      {hint ? <span className="font-mono text-[10px] text-white/35">{hint}</span> : null}
      <div className="mt-1 -mb-1">
        <Sparkline data={spark ?? []} color={color} />
      </div>
    </div>
  );
}
