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
import type { Telemetry } from '@/lib/telemetry/types';
import { cx, localTime } from '@/lib/format';

type Tab = 'cells' | 'current' | 'temp' | 'soc';

const TABS: Array<{ id: Tab; label: string; color: string }> = [
  { id: 'cells', label: 'Cell V', color: '#22d3ee' },
  { id: 'current', label: 'Current', color: '#f97316' },
  { id: 'temp', label: 'Temp', color: '#e5484d' },
  { id: 'soc', label: 'SOC', color: '#30d158' },
];

interface Row {
  label: string;
  c1: number;
  c2: number;
  c3: number;
  currentA: number;
  tempC: number;
  soc: number;
}

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

function GraphsBase({ history }: { history: Telemetry[] }) {
  const [tab, setTab] = useState<Tab>('cells');

  const rows = useMemo<Row[]>(
    () =>
      history.map((f) => ({
        label: localTime(f.timestamp),
        c1: f.cells[0],
        c2: f.cells[1],
        c3: f.cells[2],
        currentA: f.currentA,
        tempC: f.tempC,
        soc: f.soc,
      })),
    [history],
  );

  return (
    <section className="glass p-3">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              'rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition',
              tab === t.id
                ? 'bg-white/10 text-white ring-1 ring-inset ring-white/20'
                : 'text-white/40 hover:text-white/70',
            )}
            style={tab === t.id ? { color: t.color } : undefined}
          >
            {t.label}
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

              {tab === 'cells' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="c1"
                    name="C1"
                    stroke="#22d3ee"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="c2"
                    name="C2"
                    stroke="#a78bfa"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="c3"
                    name="C3"
                    stroke="#f5a524"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              ) : null}

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
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              ) : null}

              {tab === 'temp' ? (
                <Line
                  type="monotone"
                  dataKey="tempC"
                  name="°C"
                  stroke="#e5484d"
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}

              {tab === 'soc' ? (
                <Line
                  type="monotone"
                  dataKey="soc"
                  name="%"
                  stroke="#30d158"
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={false}
                />
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
