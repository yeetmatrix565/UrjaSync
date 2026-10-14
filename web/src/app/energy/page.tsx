'use client';

import { useMemo } from 'react';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormulaCard } from '@/components/ui/FormulaCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatRow } from '@/components/ui/StatRow';
import { TrendChart } from '@/components/ui/TrendChart';
import { cumulativeEnergyWh } from '@/lib/electrical/energy';
import { FORMULAS } from '@/lib/electrical/formulas';
import { fmt } from '@/lib/format';
import { formatDuration, trendRows } from '@/lib/telemetry/derive';

export default function EnergyPage() {
  const { history, energy, metrics } = useTelemetryContext();

  const cumulative = useMemo(() => {
    const samples = history
      .map((entry) => ({
        t: Date.parse(entry.timestamp),
        powerW: entry.powerW,
        currentA: entry.currentA,
      }))
      .filter((sample) => Number.isFinite(sample.t));
    return cumulativeEnergyWh(samples);
  }, [history]);

  const rows = useMemo(() => {
    const base = trendRows(history);
    return base.map((row, index) => ({ ...row, cumulativeWh: cumulative[index] ?? 0 }));
  }, [history, cumulative]);

  if (energy.powerSamples === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 pb-16 pt-3 sm:px-5 sm:pt-5">
        <PageHeader title="Energy" subtitle="Integrating power needs at least two usable samples." />
        <div className="mt-4">
          <EmptyState
            title="not enough data to integrate"
            detail="Energy is the integral of power over time. This channel has not yet reported two consecutive power samples inside the integration window."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-16 pt-3 sm:px-5 sm:pt-5">
      <PageHeader
        title="Energy"
        subtitle={`${formatDuration(energy.durationMs)} of sampled time · ${metrics.sampleCount} samples`}
        source="DERIVED"
      />

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-1">Net energy over the window</p>
        <p className="num text-3xl font-medium leading-none text-emerald-300">
          {fmt(energy.netWh, 3)}
          <span className="ml-1 font-mono text-xs text-white/40">Wh</span>
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          discharge minus charge
        </p>
        <div className="mt-3">
          <StatRow label="discharged" value={fmt(energy.dischargedWh, 3)} unit="Wh" emphasis />
          <StatRow label="charged" value={fmt(energy.chargedWh, 3)} unit="Wh" emphasis />
          <StatRow label="charge delivered" value={fmt(energy.dischargedAh, 3)} unit="Ah" />
          <StatRow label="charge returned" value={fmt(energy.chargedAh, 3)} unit="Ah" />
          <StatRow label="integrated duration" value={formatDuration(energy.durationMs)} />
          <StatRow label="average power" value={fmt(metrics.powerW.summary.mean, 2)} unit="W" />
        </div>
      </section>

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-2">Cumulative energy</p>
        <div className="h-52 w-full">
          <TrendChart
            rows={rows}
            series={[{ key: 'cumulativeWh', name: 'Wh', color: '#30d158' }]}
            unit="Wh"
          />
        </div>
      </section>

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-1">About this window</p>
        <p className="text-[11px] leading-relaxed text-white/50">
          ThingSpeak returns only the most recent feeds, so this is energy accumulated over{' '}
          {formatDuration(energy.durationMs)} of sampled time - not a lifetime total, and not a
          battery capacity. A gap longer than 10 minutes between samples is treated as missing
          time rather than integrated, so an outage never invents energy.
        </p>
      </section>

      <div className="mt-4 space-y-2.5">
        <FormulaCard
          doc={FORMULAS.energy}
          inputs={[
            { label: 'net', value: fmt(energy.netWh, 4), unit: 'Wh' },
            { label: 'usable power samples', value: String(energy.powerSamples) },
            { label: 'duration', value: formatDuration(energy.durationMs) },
          ]}
        />
      </div>
    </main>
  );
}
