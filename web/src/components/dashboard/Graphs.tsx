'use client';

import { memo, useMemo, useState } from 'react';
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
import { cx, localTime } from '@/lib/format';
import { CELL_SERIES_COLORS } from '@/lib/telemetry/constants';
import type { Telemetry } from '@/lib/telemetry/types';
import { hasAnyValue, maxCellCount } from '@/lib/telemetry/values';

type Tab = 'cells' | 'current' | 'temp' | 'soc';

const TAB_LABELS: Record<Tab, { label: string; color: string }> = {
  cells: { label: 'Cell V', color: '#22d3ee' },
  current: { label: 'Current', color: '#f97316' },
  temp: { label: 'Temp', color: '#e5484d' },
  soc: { label: 'SOC', color: '#30d158' },
};

type Row = Record<string, string | number | null>;

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

const LINE = { strokeWidth: 1.6, dot: false, isAnimationActive: false } as const;

function GraphsBase({ history }: { history: Telemetry[] }) {
  const [requested, setRequested] = useState<Tab>('cells');

  const cells = maxCellCount(history);
  const hasCurrent = useMemo(
    () => hasAnyValue(history.map((f) => f.currentA)),
    [history],
  );
  const hasTemp = useMemo(() => hasAnyValue(history.map((f) => f.tempC)), [history]);
  const hasSoc = useMemo(() => hasAnyValue(history.map((f) => f.soc)), [history]);

  // Only offer tabs the channel can actually fill.
  const tabs = useMemo(() => {
    const available: Tab[] = [];
    if (cells > 0) available.push('cells');
    if (hasCurrent) available.push('current');
    if (hasTemp) available.push('temp');
    if (hasSoc) available.push('soc');
    return available;
  }, [cells, hasCurrent, hasTemp, hasSoc]);

  const tab = tabs.includes(requested) ? requested : (tabs[0] ?? 'cells');

  const rows = useMemo<Row[]>(
    () =>
      history.map((f) => {
        const row: Row = { label: localTime(f.timestamp) };
        f.cells.forEach((v, i) => {
          row[`cell${i}`] = v;
        });
        row.currentA = f.currentA;
        row.tempC = f.tempC;
        row.soc = f.soc;
        return row;
      }),
    [history],
  );

  return (
    <section className="glass p-3">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setRequested(id)}
            className={cx(
              'rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition',
              tab === id
                ? 'bg-white/10 text-white ring-1 ring-inset ring-white/20'
                : 'text-white/40 hover:text-white/70',
            )}
            style={tab === id ? { color: TAB_LABELS[id].color } : undefined}
          >
            {TAB_LABELS[id].label}
          </button>
        ))}
      </div>

      <div className="h-52 w-full">
        {rows.length < 2 ? (
          <div className="grid h-full place-items-center font-mono text-[11px] text-white/30">
            awaiting history…
          </div>
        ) : (
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
              />
              <Tooltip {...TOOLTIP} />

              {tab === 'cells'
                ? Array.from({ length: cells }, (_, i) => (
                    <Line
                      key={i}
                      type="monotone"
                      dataKey={`cell${i}`}
                      name={`C${i + 1}`}
                      stroke={CELL_SERIES_COLORS[i % CELL_SERIES_COLORS.length]}
                      {...LINE}
                    />
                  ))
                : null}

              {tab === 'current' ? (
                <>
                  <ReferenceLine
                    y={0}
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="currentA"
                    name="A"
                    stroke="#f97316"
                    {...LINE}
                  />
                </>
              ) : null}

              {tab === 'temp' ? (
                <Line
                  type="monotone"
                  dataKey="tempC"
                  name="°C"
                  stroke="#e5484d"
                  {...LINE}
                />
              ) : null}

              {tab === 'soc' ? (
                <Line type="monotone" dataKey="soc" name="%" stroke="#30d158" {...LINE} />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-white/25">
        {rows.length} feeds · local time
      </p>
    </section>
  );
}

export const Graphs = memo(GraphsBase);
