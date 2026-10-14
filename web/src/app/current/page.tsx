'use client';

import { useMemo } from 'react';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormulaCard } from '@/components/ui/FormulaCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatRow } from '@/components/ui/StatRow';
import { TrendChart } from '@/components/ui/TrendChart';
import { FORMULAS } from '@/lib/electrical/formulas';
import { hasFinite } from '@/lib/electrical/numeric';
import { fmt, localTime } from '@/lib/format';
import { trendRows } from '@/lib/telemetry/derive';

export default function CurrentPage() {
  const { latest, history, metrics, snapshot, energy } = useTelemetryContext();

  const rows = useMemo(() => trendRows(history), [history]);
  const current = metrics.currentA;

  if (!hasFinite(current.values)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 pb-16 pt-3 sm:px-5 sm:pt-5">
        <PageHeader title="Current" subtitle="This channel publishes no current field." />
        <div className="mt-4">
          <EmptyState
            title="no current data"
            detail="Without a current measurement the app cannot derive power or energy for this channel."
          />
        </div>
      </main>
    );
  }

  const now = snapshot.currentA;
  const direction =
    now === null ? '—' : now > 0.02 ? 'discharging' : now < -0.02 ? 'charging' : 'idle';

  const discharged = current.values.filter((v): v is number => v !== null && v > 0);
  const charged = current.values.filter((v): v is number => v !== null && v < 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-16 pt-3 sm:px-5 sm:pt-5">
      <PageHeader
        title="Current"
        subtitle={
          latest ? `${localTime(latest.timestamp)} · positive = discharging` : undefined
        }
        source="LIVE"
      />

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-1">Current now</p>
        <p className="num text-3xl font-medium leading-none text-violet-300">
          {fmt(now, 3)}
          <span className="ml-1 font-mono text-xs text-white/40">A</span>
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          {direction}
        </p>
        <div className="mt-3">
          <StatRow label="window average" value={fmt(current.summary.mean, 3)} unit="A" />
          <StatRow
            label="peak discharge"
            value={fmt(discharged.length ? Math.max(...discharged) : null, 3)}
            unit="A"
          />
          <StatRow
            label="peak charge"
            value={fmt(charged.length ? Math.min(...charged) : null, 3)}
            unit="A"
          />
          <StatRow label="charge delivered" value={fmt(energy.dischargedAh, 3)} unit="Ah" emphasis />
          <StatRow label="charge returned" value={fmt(energy.chargedAh, 3)} unit="Ah" emphasis />
        </div>
      </section>

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-2">Current over the window</p>
        <div className="h-52 w-full">
          <TrendChart
            rows={rows}
            series={[{ key: 'currentA', name: 'A', color: '#a78bfa' }]}
            unit="A"
            zeroLine
          />
        </div>
      </section>

      <div className="mt-4 space-y-2.5">
        <FormulaCard
          doc={FORMULAS.charge}
          inputs={[
            { label: 'delivered', value: fmt(energy.dischargedAh, 3), unit: 'Ah' },
            { label: 'returned', value: fmt(energy.chargedAh, 3), unit: 'Ah' },
            { label: 'integrated window', value: fmt(energy.durationMs / 60000, 1), unit: 'min' },
          ]}
        />
        <FormulaCard
          doc={FORMULAS.samplingLimit}
          inputs={[{ label: 'sampling interval', value: '15', unit: 's' }]}
        />
      </div>
    </main>
  );
}
