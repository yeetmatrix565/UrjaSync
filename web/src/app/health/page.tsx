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
import { fmt, fmtInt, localTime } from '@/lib/format';
import { ADVISORY_THRESHOLDS } from '@/lib/telemetry/constants';
import { trendRows } from '@/lib/telemetry/derive';

export default function HealthPage() {
  const { latest, history, metrics, snapshot } = useTelemetryContext();

  const rows = useMemo(() => trendRows(history), [history]);
  const hasSoc = hasFinite(metrics.soc.values);
  const hasSoh = hasFinite(metrics.soh.values);

  if (!hasSoc && !hasSoh) {
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
      >
        <PageHeader
          title="Cell health"
          subtitle="This channel publishes no SOC or SOH field."
        />
        <div className="mt-5">
          <EmptyState
            title="no health data"
            detail="State of charge and state of health are reported by the firmware. This channel does not publish either, and the app will not estimate them from other values."
          />
        </div>
      </main>
    );
  }

  const socLow = snapshot.soc !== null && snapshot.soc < ADVISORY_THRESHOLDS.socLow;
  const sohLow = snapshot.soh !== null && snapshot.soh < ADVISORY_THRESHOLDS.sohEndOfLife;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
    >
      <PageHeader
        title="Cell health"
        subtitle={
          latest ? `${localTime(latest.timestamp)} · as reported by the BMS` : undefined
        }
        source="LIVE"
      />

      <section className="glass mt-5 grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-5">
        <div>
          <h2 className="label-xs mb-1">State of charge</h2>
          <p className="num text-4xl font-semibold leading-none tracking-tight sm:text-[2.75rem] text-emerald-300">
            {fmtInt(snapshot.soc)}
            <span className="ml-1 font-mono text-sm text-white/55">%</span>
          </p>
          <p className="mt-1.5 font-mono text-[11px] text-white/55">
            {socLow
              ? `below advisory ${ADVISORY_THRESHOLDS.socLow}%`
              : 'above advisory reserve'}
          </p>
        </div>
        <div>
          <h2 className="label-xs mb-1">State of health</h2>
          <p className="num text-4xl font-semibold leading-none tracking-tight sm:text-[2.75rem] text-violet-300">
            {fmtInt(snapshot.soh)}
            <span className="ml-1 font-mono text-sm text-white/55">%</span>
          </p>
          <p className="mt-1.5 font-mono text-[11px] text-white/55">
            {sohLow ? 'at advisory end of life' : 'above advisory end of life'}
          </p>
        </div>
      </section>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-1">Over the window</h2>
        {hasSoc ? (
          <StatRow
            label="SOC average"
            value={fmt(metrics.soc.summary.mean, 1)}
            unit="%"
          />
        ) : null}
        {hasSoc ? (
          <StatRow
            label="SOC change"
            value={fmt(metrics.soc.summary.delta, 1)}
            unit="%"
            hint="last − first"
          />
        ) : null}
        {hasSoh ? (
          <StatRow
            label="SOH average"
            value={fmt(metrics.soh.summary.mean, 1)}
            unit="%"
          />
        ) : null}
        {hasSoh ? (
          <StatRow
            label="SOH change"
            value={fmt(metrics.soh.summary.delta, 2)}
            unit="%"
            hint="last − first"
          />
        ) : null}
      </section>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-2">Trend</h2>
        <div className="h-56 w-full sm:h-60">
          <TrendChart
            rows={rows}
            series={[
              ...(hasSoc ? [{ key: 'soc', name: 'SOC %', color: '#30d158' }] : []),
              ...(hasSoh ? [{ key: 'soh', name: 'SOH %', color: '#8b5cf6' }] : []),
            ]}
            unit="%"
            ariaLabel="State of charge and health over the window"
          />
        </div>
      </section>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-1">About the advisory limits</h2>
        <p className="text-[13px] leading-relaxed text-white/65">
          The {ADVISORY_THRESHOLDS.socLow}% SOC reserve and{' '}
          {ADVISORY_THRESHOLDS.sohEndOfLife}% SOH end-of-life figures are{' '}
          <span className="text-white/70">
            common industry practice, not firmware thresholds
          </span>{' '}
          - unlike the cell, imbalance and temperature limits, which come from the BMS
          itself. They are used only to colour this screen, never to raise alerts. The app
          does not estimate remaining runtime or capacity: it has no measured capacity to
          divide by.
        </p>
      </section>

      <div className="mt-5 space-y-3">
        <FormulaCard
          doc={FORMULAS.packVoltage}
          inputs={[
            { label: 'pack voltage', value: fmt(snapshot.packV, 2), unit: 'V' },
            { label: 'cells', value: String(metrics.cells.length) },
          ]}
        />
      </div>
    </main>
  );
}
