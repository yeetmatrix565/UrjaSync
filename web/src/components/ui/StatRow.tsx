'use client';

import { cx } from '@/lib/format';

/** Label/value row used across the detail screens for secondary statistics. */
export function StatRow({
  label,
  value,
  unit,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
      <span className="label-xs">{label}</span>
      <span className="flex items-baseline gap-1 text-right">
        <span
          className={cx(
            'num font-mono',
            emphasis ? 'text-base text-white' : 'text-sm text-white/85',
          )}
        >
          {value}
        </span>
        {unit ? <span className="font-mono text-[10px] text-white/40">{unit}</span> : null}
        {hint ? (
          <span className="ml-1 font-mono text-[10px] text-white/30">{hint}</span>
        ) : null}
      </span>
    </div>
  );
}
