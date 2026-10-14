'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from './icons';
import { DataSourceBadge, type DataSource } from './DataSourceBadge';

/**
 * Shared header for every detail screen: back, title, and the data's origin.
 * The back link is a 40px touch target, and the title is the page's one h1.
 */
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
        className="focus-ring mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-cyan-300/40 hover:text-cyan-200 active:scale-95"
      >
        <ArrowLeftIcon className="h-[18px] w-[18px]" />
      </Link>

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h1 className="text-lg font-semibold uppercase leading-tight tracking-[0.16em] text-white sm:text-xl">
            {title}
          </h1>
          {source ? <DataSourceBadge source={source} /> : null}
        </div>
        {subtitle ? (
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/55">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
