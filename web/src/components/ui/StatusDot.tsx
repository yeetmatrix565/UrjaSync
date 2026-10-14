'use client';

import { cx } from '@/lib/format';

export type MetricStatus = 'ok' | 'warn' | 'critical' | 'unknown';

const DOT: Record<MetricStatus, string> = {
  ok: 'bg-brand-green',
  warn: 'bg-brand-amber',
  critical: 'bg-brand-red',
  unknown: 'bg-white/25',
};

const LABEL: Record<MetricStatus, string> = {
  ok: 'normal',
  warn: 'warning',
  critical: 'alert',
  unknown: 'no data',
};

export function StatusDot({
  status,
  withLabel = false,
  className,
}: {
  status: MetricStatus;
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <span
        className={cx(
          'h-2 w-2 shrink-0 rounded-full',
          DOT[status],
          status === 'critical' && 'animate-pulseSoft motion-reduce:animate-none',
        )}
        aria-hidden="true"
      />
      {withLabel ? (
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/60">
          {LABEL[status]}
        </span>
      ) : (
        <span className="sr-only">{LABEL[status]}</span>
      )}
    </span>
  );
}
