'use client';

import { useMemo } from 'react';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormulaCard } from '@/components/ui/FormulaCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatRow } from '@/components/ui/StatRow';
import { TrendChart } from '@/components/ui/TrendChart';
import { hasFinite } from '@/lib/electrical/numeric';
import { FORMULAS } from '@/lib/electrical/formulas';
import { fmt, localTime } from '@/lib/format';
import { ALERT_THRESHOLDS } from '@/lib/telemetry/constants';
import { trendRows } from '@/lib/telemetry/derive';

export default function TemperaturePage() {
  const { latest, history, metrics, snapshot } = useTelemetryContext();

  const rows = useMemo(() => trendRows(history), [history]);
  const temp = metrics.tempC;

  if (!hasFinite(temp.values)) {
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
      >
        <PageHeader
          title="Temperature"
          subtitle="This channel publishes no temperature field."
        />
        <div className="mt-5">
          <EmptyState
            title="no temperature data"
            detail="No temperature field was found in this channel. The firmware reads a DHT11 for humidity, but only publishes what it sends to ThingSpeak."
          />
        </div>
      </main>
    );
  }

  const now = snapshot.tempC;
  const state =
    now === null
      ? '—'
      : now > ALERT_THRESHOLDS.tempCritical
        ? 'critical'
        : now > ALERT_THRESHOLDS.tempWarn
          ? 'above warning threshold'
          : 'within range';
  const color =
    now !== null && now > ALERT_THRESHOLDS.tempWarn
      ? 'text-brand-red'
      : 'text-brand-green';

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
    >
      <PageHeader
        title="Temperature"
        subtitle={latest ? `${localTime(latest.timestamp)} · as published` : undefined}
        source="LIVE"
      />

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-1">Temperature now</h2>
        <p
          className={`num text-4xl font-semibold leading-none tracking-tight sm:text-[2.75rem] ${color}`}
        >
          {fmt(now, 1)}
          <span className="ml-1 font-mono text-sm text-white/55">°C</span>
        </p>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-white/55">
          {state}
        </p>
        <div className="mt-3">
          <StatRow label="window minimum" value={fmt(temp.summary.min, 1)} unit="°C" />
          <StatRow label="window maximum" value={fmt(temp.summary.max, 1)} unit="°C" />
          <StatRow label="window average" value={fmt(temp.summary.mean, 1)} unit="°C" />
          <StatRow
            label="warning at"
            value={String(ALERT_THRESHOLDS.tempWarn)}
            unit="°C"
          />
          <StatRow
            label="critical at"
            value={String(ALERT_THRESHOLDS.tempCritical)}
            unit="°C"
          />
        </div>
      </section>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-2">Temperature over the window</h2>
        <div className="h-56 w-full sm:h-60">
          <TrendChart
            rows={rows}
            series={[{ key: 'tempC', name: '°C', color: '#e5484d' }]}
            unit="°C"
            ariaLabel="Temperature over the window"
          />
        </div>
      </section>

      <div className="mt-5 space-y-3">
        <FormulaCard
          doc={FORMULAS.connectionStatus}
          inputs={[
            { label: 'reading', value: fmt(now, 1), unit: '°C' },
            {
              label: 'warning threshold',
              value: String(ALERT_THRESHOLDS.tempWarn),
              unit: '°C',
            },
          ]}
        />
      </div>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-1">Interpretation</h2>
        <p className="text-[13px] leading-relaxed text-white/65">
          Cell temperature drives how much current the pack can safely absorb or deliver.
          Sustained readings above {ALERT_THRESHOLDS.tempWarn} °C raise the HIGH TEMP
          alert; above {ALERT_THRESHOLDS.tempCritical} °C that alert becomes critical. A
          reading that climbs while current is steady usually means airflow is blocked or
          a cell is heating internally rather than simply working harder.
        </p>
      </section>
    </main>
  );
}
