'use client';

import type { Status } from '@/lib/telemetry/types';
import { cx } from '@/lib/format';

const STYLES: Record<Status, { dot: string; text: string; ring: string }> = {
  LIVE: {
    dot: 'bg-brand-green',
    text: 'text-brand-green',
    ring: 'ring-brand-green/30',
  },
  STALE: {
    dot: 'bg-brand-amber',
    text: 'text-brand-amber',
    ring: 'ring-brand-amber/30',
  },
  OFFLINE: {
    dot: 'bg-brand-red',
    text: 'text-brand-red',
    ring: 'ring-brand-red/30',
  },
};

export interface StatusPillProps {
  status: Status;
  agoLabel: string;
  onRefresh: () => void;
  loading?: boolean;
}

export function StatusPill({ status, agoLabel, onRefresh, loading }: StatusPillProps) {
  const s = STYLES[status];
  return (
    <div className="flex items-center gap-2">
      <span
        className={cx(
          'inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-inset',
          s.ring,
        )}
      >
        <span
          className={cx(
            'h-1.5 w-1.5 rounded-full',
            s.dot,
            status === 'LIVE' && 'animate-pulseSoft',
          )}
        />
        <span className={cx('font-mono text-[11px] font-medium tracking-widest', s.text)}>
          {status}
        </span>
        <span className="font-mono text-[10px] text-white/40">· {agoLabel}</span>
      </span>

      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh telemetry"
        className={cx(
          'grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 transition',
          'hover:border-cyan-300/40 hover:text-cyan-200 active:scale-95',
          loading && 'animate-spin',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 11a8 8 0 1 0-2.3 5.7" strokeLinecap="round" />
          <path d="M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
