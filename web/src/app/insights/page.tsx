'use client';

import { useMemo } from 'react';
import { EventFeed } from '@/components/dashboard/EventFeed';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormulaCard } from '@/components/ui/FormulaCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatRow } from '@/components/ui/StatRow';
import { TrendChart } from '@/components/ui/TrendChart';
import { FORMULAS } from '@/lib/electrical/formulas';
import { fmt, localTime } from '@/lib/format';
import { ALERT_THRESHOLDS } from '@/lib/telemetry/constants';
import { trendRows } from '@/lib/telemetry/derive';
import type { Alert } from '@/lib/telemetry/types';

/** Which rule produced an alert code, stated in the user's terms. */
function ruleFor(code: string): string {
  if (code === 'HIGH_TEMP') return `temperature > ${ALERT_THRESHOLDS.tempWarn} °C`;
  if (code === 'CELL_IMBALANCE') return `imbalance > ${ALERT_THRESHOLDS.cellImbalance} V`;
  const over = /^OVERVOLTAGE_(\d)$/.exec(code);
  if (over) return `cell ${over[1]} > ${ALERT_THRESHOLDS.cellOvervoltage} V`;
  const under = /^UNDERVOLTAGE_(\d)$/.exec(code);
  if (under) return `cell ${under[1]} < ${ALERT_THRESHOLDS.cellUndervoltage} V`;
  return 'unknown rule';
}

function AlertRow({ alert }: { alert: Alert }) {
  const critical = alert.severity === 'critical';
  return (
    <div
      className={`flex items-start justify-between gap-3 border-l-2 py-2 pl-2.5 ${
        critical ? 'border-l-brand-red bg-brand-red/5' : 'border-l-brand-amber bg-brand-amber/5'
      }`}
    >
      <div>
        <p
          className={`font-mono text-[11px] font-medium uppercase tracking-wider ${
            critical ? 'text-red-200' : 'text-amber-200'
          }`}
        >
          {alert.message}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-white/40">{ruleFor(alert.code)}</p>
      </div>
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-white/30">
        {alert.severity}
      </span>
    </div>
  );
}

export default function InsightsPage() {
  const { latest, history, metrics, alerts, now, lastFetchedAt } = useTelemetryContext();

  const rows = useMemo(() => trendRows(history), [history]);
  const imbalance = metrics.imbalanceV;

  const evaluated = [
    { label: 'High temperature', rule: `temp > ${ALERT_THRESHOLDS.tempWarn} °C`, fired: alerts.some((a) => a.code === 'HIGH_TEMP') },
    { label: 'Cell overvoltage', rule: `cell > ${ALERT_THRESHOLDS.cellOvervoltage} V`, fired: alerts.some((a) => a.code.startsWith('OVERVOLTAGE')) },
    { label: 'Cell undervoltage', rule: `cell < ${ALERT_THRESHOLDS.cellUndervoltage} V`, fired: alerts.some((a) => a.code.startsWith('UNDERVOLTAGE')) },
    { label: 'Cell imbalance', rule: `spread > ${ALERT_THRESHOLDS.cellImbalance} V`, fired: alerts.some((a) => a.code === 'CELL_IMBALANCE') },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-16 pt-3 sm:px-5 sm:pt-5">
      <PageHeader
        title="System insights"
        subtitle={
          latest
            ? `rules evaluated against ${localTime(latest.timestamp)} · ${metrics.sampleCount} samples`
            : undefined
        }
        source="DERIVED"
      />

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-2">
          {alerts.length > 0 ? `${alerts.length} active` : 'No active alerts'}
        </p>
        {alerts.length > 0 ? (
          <div className="space-y-1">
            {alerts.map((alert) => (
              <AlertRow key={alert.code} alert={alert} />
            ))}
          </div>
        ) : (
          <p className="font-mono text-[11px] text-white/40">
            Every rule below is currently satisfied.
          </p>
        )}
      </section>

      <section className="glass mt-4 p-3.5">
        <p className="label-xs mb-1">Rules evaluated</p>
        {evaluated.map((rule) => (
          <StatRow
            key={rule.label}
            label={rule.label}
            value={rule.fired ? 'FIRED' : 'ok'}
            hint={rule.rule}
          />
        ))}
      </section>

      {imbalance.summary.count > 0 ? (
        <section className="glass mt-4 p-3.5">
          <p className="label-xs mb-2">Imbalance over the window</p>
          <div className="h-44 w-full">
            <TrendChart
              rows={rows}
              series={[{ key: 'imbalanceV', name: 'V', color: '#f5a524' }]}
              unit="V"
            />
          </div>
          <div className="mt-2">
            <StatRow label="average" value={fmt(imbalance.summary.mean, 4)} unit="V" />
            <StatRow label="worst" value={fmt(imbalance.summary.max, 4)} unit="V" />
          </div>
        </section>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="no imbalance history"
            detail="Imbalance needs at least two measured cells, and this channel has not published two."
          />
        </div>
      )}

      <section className="mt-4">
        <EventFeed history={history} />
      </section>

      <div className="mt-4 space-y-2.5">
        <FormulaCard
          doc={FORMULAS.cellImbalance}
          inputs={[
            { label: 'current imbalance', value: fmt(imbalance.summary.last, 4), unit: 'V' },
            { label: 'threshold', value: String(ALERT_THRESHOLDS.cellImbalance), unit: 'V' },
          ]}
        />
        <FormulaCard
          doc={FORMULAS.connectionStatus}
          inputs={[
            { label: 'status', value: latest?.status ?? 'OFFLINE' },
            {
              label: 'last fetch',
              value: lastFetchedAt ? `${Math.round((now - lastFetchedAt) / 1000)}` : '—',
              unit: 's ago',
            },
          ]}
        />
      </div>
    </main>
  );
}
