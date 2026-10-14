'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrendSeries {
  /** Key into the row objects. */
  key: string;
  name: string;
  color: string;
}

export type TrendRow = Record<string, string | number | null>;

const AXIS = {
  stroke: 'rgba(255,255,255,0.25)',
  tick: { fill: 'rgba(255,255,255,0.45)', fontSize: 9 },
} as const;

const TOOLTIP = {
  contentStyle: {
    background: 'rgba(6,10,14,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    fontSize: 11,
    fontFamily: 'var(--font-ibm-plex-mono), monospace',
  },
  labelStyle: { color: 'rgba(255,255,255,0.55)', fontSize: 10 },
  itemStyle: { color: '#e6edf3' },
} as const;

const LINE = { type: 'monotone', strokeWidth: 1.6, dot: false, isAnimationActive: false } as const;

/**
 * Shared time-series chart for the detail screens. Recharts drives these because
 * they render at poll frequency, not per frame - the 60fps waveform laboratory
 * uses its own canvas renderer instead.
 */
export function TrendChart({
  rows,
  series,
  unit,
  zeroLine = false,
  emptyLabel = 'awaiting history…',
}: {
  rows: TrendRow[];
  series: TrendSeries[];
  unit?: string;
  zeroLine?: boolean;
  emptyLabel?: string;
}) {
  if (rows.length < 2) {
    return (
      <div className="grid h-full place-items-center font-mono text-[11px] text-white/30">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={AXIS.stroke}
          tick={AXIS.tick}
          minTickGap={28}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={AXIS.stroke}
          tick={AXIS.tick}
          domain={['auto', 'auto']}
          tickLine={false}
          axisLine={false}
          width={44}
          unit={unit}
        />
        <Tooltip {...TOOLTIP} />

        {zeroLine ? (
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
        ) : null}

        {series.map((entry) => (
          <Line key={entry.key} dataKey={entry.key} name={entry.name} stroke={entry.color} {...LINE} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
