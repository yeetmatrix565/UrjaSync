'use client';

import type { ReactNode } from 'react';

/** Shown whenever a screen has nothing honest to display. */
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
    <div className="glass flex flex-col items-center gap-2 p-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">{title}</p>
      {detail ? (
        <p className="max-w-[38ch] font-mono text-[11px] leading-relaxed text-white/35">
          {detail}
        </p>
      ) : null}
      {action}
    </div>
  );
}
