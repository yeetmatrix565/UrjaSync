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
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0">
      <span className="label-xs shrink-0">{label}</span>
      <span className="flex min-w-0 flex-wrap items-baseline justify-end gap-1 text-right">
        <span
          className={cx(
            'num break-all font-mono',
            emphasis ? 'text-base font-medium text-white' : 'text-sm text-white/90',
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-[10px] text-white/55">{unit}</span>
        ) : null}
        {hint ? (
          <span className="ml-1 font-mono text-[10px] text-white/50">{hint}</span>
        ) : null}
      </span>
    </div>
  );
}
