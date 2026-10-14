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

export default function PowerPage() {
  const { latest, history, metrics, snapshot } = useTelemetryContext();

  const rows = useMemo(() => trendRows(history), [history]);
  const power = metrics.powerW;

  if (!hasFinite(power.values)) {
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
      >
        <PageHeader
          title="Power"
          subtitle="Needs both a voltage and a current measurement."
        />
        <div className="mt-5">
          <EmptyState
            title="power unavailable"
            detail="p(t) = v(t) · i(t) requires both voltage and current. This channel does not publish both."
          />
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
    >
      <PageHeader
        title="Power"
        subtitle={
          latest ? `${localTime(latest.timestamp)} · DC, so P = V × I` : undefined
        }
        source="DERIVED"
      />

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-1">Instantaneous power now</h2>
        <p className="num text-4xl font-semibold leading-none tracking-tight sm:text-[2.75rem] text-orange-300">
          {fmt(snapshot.powerW, 2)}
          <span className="ml-1 font-mono text-sm text-white/55">W</span>
        </p>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-white/55">
          {snapshot.powerW === null
            ? '—'
            : snapshot.powerW >= 0
              ? 'leaving the pack'
              : 'entering the pack'}
        </p>
        <div className="mt-3">
          <StatRow label="window average" value={fmt(power.summary.mean, 2)} unit="W" />
          <StatRow label="peak discharge" value={fmt(power.summary.max, 2)} unit="W" />
          <StatRow label="peak charge" value={fmt(power.summary.min, 2)} unit="W" />
          <StatRow
            label="average voltage"
            value={fmt(metrics.packV.summary.mean, 2)}
            unit="V"
          />
          <StatRow
            label="average current"
            value={fmt(metrics.currentA.summary.mean, 3)}
            unit="A"
          />
        </div>
      </section>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-2">p(t) = v(t) · i(t)</h2>
        <div className="h-56 w-full sm:h-60">
          <TrendChart
            rows={rows}
            series={[{ key: 'powerW', name: 'W', color: '#f97316' }]}
            unit="W"
            zeroLine
            ariaLabel="Power over the window"
          />
        </div>
      </section>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-1">Not shown on this screen, deliberately</h2>
        <p className="text-[13px] leading-relaxed text-white/65">
          Reactive power (var), apparent power (VA) and power factor exist to describe the
          phase displacement between AC voltage and current. A battery pack delivers
          steady DC, where voltage and current have no phase relationship, so those
          quantities are mathematically undefined here rather than simply unmeasured. For
          the same reason there is no frequency or harmonic content to report: at a 15 s
          sample interval the Nyquist limit is about 0.033 Hz. Those quantities are
          demonstrated only in the Signal Laboratory, against synthesised signals, and are
          labelled simulated.
        </p>
      </section>

      <div className="mt-5 space-y-3">
        <FormulaCard
          doc={FORMULAS.instantaneousPower}
          inputs={[
            { label: 'pack voltage', value: fmt(snapshot.packV, 3), unit: 'V' },
            { label: 'current', value: fmt(snapshot.currentA, 3), unit: 'A' },
            { label: 'power', value: fmt(snapshot.powerW, 3), unit: 'W' },
          ]}
          worked={
            snapshot.packV !== null && snapshot.currentA !== null
              ? `${fmt(snapshot.packV, 3)} V × ${fmt(snapshot.currentA, 3)} A = ${fmt(
                  snapshot.packV * snapshot.currentA,
                  3,
                )} W`
              : undefined
          }
        />
        <FormulaCard
          doc={FORMULAS.averagePower}
          inputs={[
            { label: 'samples averaged', value: String(power.summary.count) },
            { label: 'average power', value: fmt(power.summary.mean, 2), unit: 'W' },
          ]}
        />
      </div>
    </main>
  );
}
