'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Sparkline } from './Sparkline';
import { ChevronRightIcon } from '@/components/ui/icons';
import { DataSourceBadge, type DataSource } from '@/components/ui/DataSourceBadge';
import { StatusDot, type MetricStatus } from '@/components/ui/StatusDot';
import { cx } from '@/lib/format';

export interface MetricCardProps {
  title: string;
  href: string;
  icon: ReactNode;
  /** Already formatted; an em dash when the value is missing. */
  value: string;
  unit?: string;
  hint?: string;
  status: MetricStatus;
  source: DataSource;
  spark?: Array<number | null>;
  sparkColor?: string;
}

/**
 * The one card component every dashboard tile is built from, in a square format
 * so two sit comfortably side by side on a phone: icon, title, prominent value, a
 * status indicator, the data's origin, a mini trend, and a clear affordance that
 * it opens a detail screen. The link fills its <li> in CardGrid, so the whole
 * tile is one large tap target; keyboard focus draws the shared ring.
 */
export function MetricCard({
  title,
  href,
  icon,
  value,
  unit,
  hint,
  status,
  source,
  spark,
  sparkColor = '#22d3ee',
}: MetricCardProps) {
  return (
    <Link
      href={href}
      aria-label={`${title}: ${value}${unit ? ` ${unit}` : ''}. ${hint ?? ''} Open ${title} details.`}
      className={cx(
        'glass card-interactive focus-ring group relative flex aspect-square w-full flex-col justify-between gap-1.5 p-3.5 sm:p-4',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200/90 transition group-hover:border-cyan-300/25 group-hover:text-cyan-200">
          {icon}
        </span>
        {/* Deliberately not the `label-xs` token: at 11px with 0.18em tracking it
            no longer fits an 11-character title (TEMPERATURE) in a half-width
            square card, where the icon and status dot already take ~46px. */}
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white/60">
          {title}
        </span>
        <StatusDot status={status} />
      </div>

      <div className="min-w-0">
        <p className="flex items-baseline gap-1">
          <span className="num text-[1.65rem] font-semibold leading-none tracking-tight text-white sm:text-3xl">
            {value}
          </span>
          {unit ? (
            <span className="font-mono text-[11px] text-white/55">{unit}</span>
          ) : null}
        </p>
        <p className="mt-1.5 truncate font-mono text-[10px] text-white/55">
          {hint ?? ''}
        </p>
      </div>

      <div className="flex items-end justify-between gap-1.5">
        <Sparkline
          data={spark ?? []}
          color={sparkColor}
          width={88}
          height={22}
          label={`${title} trend`}
        />
        <div className="flex items-center gap-1 pb-0.5">
          <DataSourceBadge source={source} />
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-cyan-200/80" />
        </div>
      </div>
    </Link>
  );
}
