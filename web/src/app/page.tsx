'use client';

import { useMemo, useState } from 'react';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { CardGrid } from '@/components/dashboard/CardGrid';
import { ConnectPrompt } from '@/components/dashboard/ConnectPrompt';
import { HeadlineStats } from '@/components/dashboard/HeadlineStats';
import { MetricCard, type MetricCardProps } from '@/components/dashboard/MetricCard';
import { PackHero } from '@/components/dashboard/PackHero';
import { SummaryBar } from '@/components/dashboard/SummaryBar';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import {
  BoltIcon,
  CurrentIcon,
  EnergyIcon,
  HealthIcon,
  InsightsIcon,
  PowerIcon,
  TempIcon,
} from '@/components/ui/icons';
import type { DataSource } from '@/components/ui/DataSourceBadge';
import type { MetricStatus } from '@/components/ui/StatusDot';
import { fmt, fmtInt } from '@/lib/format';
import { cumulativeEnergyWh } from '@/lib/electrical/energy';
import { hasFinite } from '@/lib/electrical/numeric';
import { ADVISORY_THRESHOLDS, ALERT_THRESHOLDS } from '@/lib/telemetry/constants';
import { formatDuration } from '@/lib/telemetry/derive';

type CardDefinition = Omit<MetricCardProps, 'source' | 'status'> & {
  available: boolean;
  source: DataSource;
  status: MetricStatus;
};

function temperatureStatus(tempC: number | null): MetricStatus {
  if (tempC === null) return 'unknown';
  if (tempC > ALERT_THRESHOLDS.tempCritical) return 'critical';
  if (tempC > ALERT_THRESHOLDS.tempWarn) return 'warn';
  return 'ok';
}

export default function DashboardPage() {
  const {
    latest,
    metrics,
    energy,
    snapshot,
    status,
    mapping,
    alerts,
    history,
    error,
    loading,
    hasCredentials,
    isDemo,
  } = useTelemetryContext();

  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  const alertSig = useMemo(
    () =>
      alerts
        .map((a) => a.code)
        .sort()
        .join('|'),
    [alerts],
  );
  const bannerVisible = alerts.length > 0 && dismissedSig !== alertSig;

  const cellAlerts = alerts.some((a) => /OVERVOLTAGE|UNDERVOLTAGE/.test(a.code));
  const advisoryHealth =
    (snapshot.soc !== null && snapshot.soc < ADVISORY_THRESHOLDS.socLow) ||
    (snapshot.soh !== null && snapshot.soh < ADVISORY_THRESHOLDS.sohEndOfLife);

  // A pack voltage that the channel does not publish is summed from the cells,
  // so it is derived rather than measured - and labelled that way.
  const packVoltageSource: DataSource = mapping?.packV === undefined ? 'DERIVED' : 'LIVE';

  const currentDir =
    snapshot.currentA === null
      ? '—'
      : snapshot.currentA > 0.02
        ? 'discharging'
        : snapshot.currentA < -0.02
          ? 'charging'
          : 'idle';

  const energyTrend = useMemo(() => {
    const samples = history
      .map((entry) => ({
        t: Date.parse(entry.timestamp),
        powerW: entry.powerW,
        currentA: entry.currentA,
      }))
      .filter((sample) => Number.isFinite(sample.t));
    return cumulativeEnergyWh(samples);
  }, [history]);

  const cards: CardDefinition[] = [
    {
      title: 'Voltage',
      href: '/voltage',
      icon: <BoltIcon />,
      value: fmt(snapshot.packV, 2),
      unit: 'V',
      hint: `imbalance ${fmt(snapshot.imbalanceV, 3)} V`,
      spark: metrics.packV.values,
      sparkColor: '#22d3ee',
      available: hasFinite(metrics.packV.values) || metrics.cells.length > 0,
      source: packVoltageSource,
      status: cellAlerts ? 'critical' : latest ? 'ok' : 'unknown',
    },
    {
      title: 'Current',
      href: '/current',
      icon: <CurrentIcon />,
      value: fmt(snapshot.currentA, 2),
      unit: 'A',
      hint: currentDir,
      spark: metrics.currentA.values,
      sparkColor: '#a78bfa',
      available: hasFinite(metrics.currentA.values),
      source: 'LIVE',
      status: latest ? 'ok' : 'unknown',
    },
    {
      title: 'Power',
      href: '/power',
      icon: <PowerIcon />,
      value: fmt(snapshot.powerW, 1),
      unit: 'W',
      hint: `avg ${fmt(metrics.powerW.summary.mean, 1)} W`,
      spark: metrics.powerW.values,
      sparkColor: '#f97316',
      available: hasFinite(metrics.powerW.values),
      source: 'DERIVED',
      status: latest ? 'ok' : 'unknown',
    },
    {
      title: 'Energy',
      href: '/energy',
      icon: <EnergyIcon />,
      value: fmt(energy.netWh, 2),
      unit: 'Wh',
      hint: `${formatDuration(energy.durationMs)} · ${fmt(energy.dischargedAh, 2)} Ah out`,
      spark: energyTrend,
      sparkColor: '#30d158',
      available: energy.powerSamples > 0,
      source: 'DERIVED',
      status: latest ? 'ok' : 'unknown',
    },
    {
      title: 'Temperature',
      href: '/temperature',
      icon: <TempIcon />,
      value: fmt(snapshot.tempC, 1),
      unit: '\u00b0C',
      hint: `warn above ${ALERT_THRESHOLDS.tempWarn}\u00b0C`,
      spark: metrics.tempC.values,
      sparkColor: '#e5484d',
      available: hasFinite(metrics.tempC.values),
      source: 'LIVE',
      status: temperatureStatus(snapshot.tempC),
    },
    {
      title: 'Cell health',
      href: '/health',
      icon: <HealthIcon />,
      value: fmtInt(snapshot.soc),
      unit: '%',
      hint: `SOH ${fmtInt(snapshot.soh)}% · advisory limits`,
      spark: metrics.soc.values,
      sparkColor: '#8b5cf6',
      available: hasFinite(metrics.soc.values) || hasFinite(metrics.soh.values),
      source: 'LIVE',
      status: advisoryHealth ? 'warn' : latest ? 'ok' : 'unknown',
    },
    {
      title: 'Insights',
      href: '/insights',
      icon: <InsightsIcon />,
      value: fmtInt(alerts.length),
      unit: alerts.length === 1 ? 'alert' : 'alerts',
      hint: alerts.length > 0 ? 'tap for the rules that fired' : 'no active alerts',
      spark: metrics.imbalanceV.values,
      sparkColor: '#f5a524',
      available: true,
      source: 'DERIVED',
      status: alerts.some((a) => a.severity === 'critical')
        ? 'critical'
        : alerts.length > 0
          ? 'warn'
          : latest
            ? 'ok'
            : 'unknown',
    },
  ];

  // While the first poll is in flight we cannot yet know which metrics the
  // channel publishes, so every card is shown with a dash. Once data lands, only
  // the ones the channel actually provides stay - a permanent metric is hidden
  // rather than padded with zeros, and an absent one disappears.
  const visible = loading ? cards : cards.filter((card) => card.available);

  // No channel and no explicit scenario means there is genuinely nothing to
  // show, so the grid gives way to a prompt rather than an empty screen.
  const notConfigured = !loading && !hasCredentials && !isDemo;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
    >
      <AlertBanner
        alerts={alerts}
        visible={bannerVisible}
        onDismiss={() => setDismissedSig(alertSig)}
      />

      <SummaryBar />

      {error ? (
        <p
          className="font-mono text-[11px] leading-relaxed text-amber-200/90"
          role="status"
        >
          ! {error}
        </p>
      ) : null}

      <section aria-label="Battery pack 3D view">
        <PackHero />
      </section>

      <section aria-label="Headline readings">
        <HeadlineStats />
      </section>

      <section aria-labelledby="analysis-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="analysis-heading" className="label-xs">
            Analysis
          </h2>
          <span
            className="font-mono text-[10px] uppercase tracking-widest text-white/50"
            aria-live="polite"
          >
            {notConfigured
              ? 'not connected'
              : loading
                ? 'loading…'
                : `${visible.length} of ${cards.length} available`}
          </span>
        </div>

        {notConfigured ? (
          <ConnectPrompt />
        ) : (
          <CardGrid>
            {visible.map((card) => (
              <MetricCard
                key={card.href}
                title={card.title}
                href={card.href}
                icon={card.icon}
                value={card.value}
                unit={card.unit}
                hint={card.hint}
                spark={card.spark}
                sparkColor={card.sparkColor}
                source={card.source}
                status={card.status}
              />
            ))}
          </CardGrid>
        )}
      </section>

      <p className="font-mono text-[10px] leading-relaxed text-white/45">
        Cards without data from this channel are hidden rather than filled with zeros.
        Every value is labelled by origin: live, derived or simulated.
      </p>

      <footer className="pt-2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
        {status} · Urja Sync
      </footer>
    </main>
  );
}
