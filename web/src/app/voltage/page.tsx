'use client';

import { useMemo, useState } from 'react';
import { CellStrip } from '@/components/dashboard/CellStrip';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormulaCard } from '@/components/ui/FormulaCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatRow } from '@/components/ui/StatRow';
import { TrendChart, type TrendSeries } from '@/components/ui/TrendChart';
import { hasFinite } from '@/lib/electrical/numeric';
import { FORMULAS } from '@/lib/electrical/formulas';
import { fmt, localTime } from '@/lib/format';
import { CELL_SERIES_COLORS } from '@/lib/telemetry/constants';
import { trendRows } from '@/lib/telemetry/derive';

export default function VoltagePage() {
  const { latest, history, metrics, snapshot, alerts, mapping } = useTelemetryContext();
  const [selected, setSelected] = useState<number | null>(null);

  const rows = useMemo(() => trendRows(history, true), [history]);
  const cellSeries: TrendSeries[] = metrics.cells.map((_, index) => ({
    key: `cell${index}`,
    name: `C${index + 1}`,
    color: CELL_SERIES_COLORS[index % CELL_SERIES_COLORS.length]!,
  }));

  const hasAnything = hasFinite(metrics.packV.values) || metrics.cells.length > 0;

  if (!hasAnything) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 pb-16 pt-3 sm:px-5 sm:pt-5">
        <PageHeader title="Voltage" subtitle="This channel publishes no voltage fields." />
        <div className="mt-4">
          <EmptyState
            title="no voltage data"
            detail="The field mapping found no pack or cell voltage in this channel. Check the channel's field labels on ThingSpeak."
          />
        </div>
      </main>
    );
  }

  const pack = metrics.packV.summary;
  const packIsDerived = mapping?.packV === undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-16 pt-3 sm:px-5 sm:pt-5">
      <PageHeader
        title="Voltage & cells"
        subtitle={
          latest
            ? `${localTime(latest.timestamp)} · ${packIsDerived ? 'pack total summed from cells' : 'pack voltage published by the device'}`
            : undefined
        }
        source={packIsDerived ? 'DERIVED' : 'LIVE'}
      />

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-1">Pack voltage now</p>
        <p className="num text-3xl font-medium leading-none text-cyan-300">
          {fmt(snapshot.packV, 2)}
          <span className="ml-1 font-mono text-xs text-white/40">V</span>
        </p>
        <div className="mt-3">
          <StatRow label="window minimum" value={fmt(pack.min, 2)} unit="V" />
          <StatRow label="window maximum" value={fmt(pack.max, 2)} unit="V" />
          <StatRow label="window average" value={fmt(pack.mean, 2)} unit="V" />
          <StatRow label="spread (max − min)" value={fmt(pack.range, 3)} unit="V" />
          <StatRow label="cell imbalance now" value={fmt(snapshot.imbalanceV, 3)} unit="V" emphasis />
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="label-xs">Cells</h2>
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/25">
            {metrics.cells.length} detected
          </span>
        </div>
        <CellStrip
          cells={snapshot.cells}
          alerts={alerts}
          selected={selected}
          onSelect={setSelected}
        />

        {metrics.cells.length > 0 ? (
          <div className="glass mt-2 p-3.5">
            <p className="label-xs mb-1">Per-cell range over the window</p>
            {metrics.cells.map((cell, index) => (
              <StatRow
                key={index}
                label={`C${index + 1}`}
                value={`${fmt(cell.summary.min, 3)} – ${fmt(cell.summary.max, 3)}`}
                unit="V"
                hint={`avg ${fmt(cell.summary.mean, 3)}`}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-2">Cell voltages over the window</p>
        <div className="h-52 w-full">
          <TrendChart rows={rows} series={cellSeries} unit="V" />
        </div>
      </section>

      <div className="mt-4 space-y-2.5">
        <FormulaCard
          doc={FORMULAS.packVoltage}
          inputs={[
            { label: 'pack voltage', value: fmt(snapshot.packV, 3), unit: 'V' },
            { label: 'cells published', value: String(metrics.cells.length) },
            { label: 'source', value: packIsDerived ? 'summed' : 'published' },
          ]}
          worked={
            packIsDerived && snapshot.cells.length > 0
              ? `Σ cells = ${snapshot.cells
                  .map((v) => fmt(v, 3))
                  .join(' + ')} = ${fmt(snapshot.packV, 3)} V`
              : undefined
          }
        />
        <FormulaCard
          doc={FORMULAS.cellImbalance}
          inputs={[
            { label: 'imbalance', value: fmt(snapshot.imbalanceV, 3), unit: 'V' },
            { label: 'threshold', value: '0.100', unit: 'V' },
          ]}
          worked={
            hasFinite(snapshot.cells)
              ? `max ${fmt(Math.max(...snapshot.cells.filter((v): v is number => v !== null)), 3)} − min ${fmt(
                  Math.min(...snapshot.cells.filter((v): v is number => v !== null)),
                  3,
                )} = ${fmt(snapshot.imbalanceV, 3)} V`
              : undefined
          }
        />
      </div>
    </main>
  );
}
