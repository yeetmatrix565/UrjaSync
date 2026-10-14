'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from './icons';
import { DataSourceBadge, type DataSource } from './DataSourceBadge';

/** Shared header for every detail screen: back, title, and the data's origin. */
export function PageHeader({
  title,
  subtitle,
  source,
}: {
  title: string;
  subtitle?: string;
  source?: DataSource;
}) {
  return (
    <header className="flex items-start gap-3">
      <Link
        href="/"
        aria-label="Back to dashboard"
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-cyan-300/40 hover:text-cyan-200 active:scale-95"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-base font-semibold uppercase tracking-[0.18em] text-white">
            {title}
          </h1>
          {source ? <DataSourceBadge source={source} /> : null}
        </div>
        {subtitle ? (
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-white/40">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
