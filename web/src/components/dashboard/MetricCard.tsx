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
 * it opens a detail screen.
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
      className={cx(
        'glass group relative flex aspect-square flex-col justify-between gap-1.5 p-3 transition',
        'hover:border-cyan-300/30 hover:shadow-glowCyan',
        'active:scale-[0.985]',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200/80 transition group-hover:text-cyan-200">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate label-xs">{title}</span>
        <StatusDot status={status} />
      </div>

      <div className="min-w-0">
        <p className="flex items-baseline gap-1">
          <span className="num text-2xl font-medium leading-none text-white">{value}</span>
          {unit ? <span className="font-mono text-[10px] text-white/40">{unit}</span> : null}
        </p>
        <p className="mt-1 truncate font-mono text-[10px] text-white/35">{hint ?? ''}</p>
      </div>

      <div className="flex items-end justify-between gap-1.5">
        <Sparkline data={spark ?? []} color={sparkColor} width={88} height={22} />
        <div className="flex items-center gap-1 pb-0.5">
          <DataSourceBadge source={source} />
          <ChevronRightIcon className="h-3 w-3 shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-cyan-200/70" />
        </div>
      </div>
    </Link>
  );
}
