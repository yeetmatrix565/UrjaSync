'use client';

import type { ReactNode } from 'react';

/**
 * Shown whenever a screen has nothing honest to display. Announced as a
 * status so screen-reader users hear the empty state instead of silence,
 * and given real breathing room so it reads as a deliberate state, not a
 * missing block.
 */
export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="glass flex flex-col items-center gap-2.5 px-6 py-10 text-center sm:py-12"
      role="status"
    >
      <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-white/70">
        {title}
      </p>
      {detail ? (
        <p className="max-w-[42ch] text-[13px] leading-relaxed text-white/60">{detail}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
