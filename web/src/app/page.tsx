'use client';

import { memo, useMemo, useState } from 'react';
import BatteryScene from '@/components/three/BatteryScene';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { CellStrip } from '@/components/dashboard/CellStrip';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EventFeed } from '@/components/dashboard/EventFeed';
import { Graphs } from '@/components/dashboard/Graphs';
import { SectionHeading } from '@/components/dashboard/SectionHeading';
import { StatCard } from '@/components/dashboard/StatCard';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useTelemetryLerp } from '@/hooks/useTelemetryLerp';
import { fmt, fmtInt, relTime } from '@/lib/format';
import { POLL_INTERVAL_MS } from '@/lib/telemetry/constants';
import type { Status } from '@/lib/telemetry/types';

const MemoBatteryScene = memo(BatteryScene);
const POLL_SECONDS = POLL_INTERVAL_MS / 1000;

interface StatDefinition {
  id: string;
  label: string;
  value: string;
  unit: string;
  color: string;
  spark: number[];
  hint?: string;
}

export default function DashboardPage() {
  const { latest, history, lastFetchedAt, error, loading, isDemo, refresh } =
    useTelemetry();
  const reducedMotion = useReducedMotion();
  const { valuesRef, snapshot } = useTelemetryLerp(latest, reducedMotion);
  const now = useNow(1000);

  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  const alerts = useMemo(() => latest?.alerts ?? [], [latest]);
  const alertSig = useMemo(
    () =>
      alerts
        .map((a) => a.code)
        .sort()
        .join('|'),
    [alerts],
  );
  const bannerVisible = alerts.length > 0 && dismissedSig !== alertSig;

  // A transport error means the numbers on screen are no longer fresh, even
  // though the last payload we hold may have said LIVE.
  const status: Status = latest ? (error ? 'STALE' : latest.status) : 'OFFLINE';
  const agoLabel = lastFetchedAt ? relTime(now - lastFetchedAt) : '\u2014';

  const sparks = useMemo(
    () => ({
      packV: history.map((f) => f.packV),
      currentA: history.map((f) => f.currentA),
      powerW: history.map((f) => f.powerW),
      tempC: history.map((f) => f.tempC),
      soc: history.map((f) => f.soc),
      soh: history.map((f) => f.soh),
    }),
    [history],
  );

  const current = snapshot.currentA;
  const currentDir = !Number.isFinite(current)
    ? '\u2014'
    : current > 0.02
      ? 'discharging'
      : current < -0.02
        ? 'charging'
        : 'idle';
  const currentColor = !Number.isFinite(current)
    ? '#22d3ee'
    : current < -0.02
      ? '#22d3ee'
      : current > 0.02
        ? '#f97316'
        : '#94a3b8';

  const cards: StatDefinition[] = [
    {
      id: 'pack',
      label: 'Pack voltage',
      value: fmt(snapshot.packV, 2),
      unit: 'V',
      color: '#22d3ee',
      spark: sparks.packV,
      hint: `imbalance ${fmt(snapshot.imbalanceV, 3)} V`,
    },
    {
      id: 'current',
      label: 'Current',
      value: fmt(snapshot.currentA, 2),
      unit: 'A',
      color: currentColor,
      spark: sparks.currentA,
      hint: currentDir,
    },
    {
      id: 'power',
      label: 'Power',
      value: fmt(snapshot.powerW, 1),
      unit: 'W',
      color: '#a78bfa',
      spark: sparks.powerW,
      hint: 'packV x current',
    },
    {
      id: 'temp',
      label: 'Temperature',
      value: fmt(snapshot.tempC, 1),
      unit: '\u00b0C',
      color: '#e5484d',
      spark: sparks.tempC,
      hint: 'field5',
    },
    {
      id: 'soc',
      label: 'SOC',
      value: fmtInt(snapshot.soc),
      unit: '%',
      color: '#30d158',
      spark: sparks.soc,
      hint: 'state of charge',
    },
    {
      id: 'soh',
      label: 'SOH',
      value: fmtInt(snapshot.soh),
      unit: '%',
      color: '#8b5cf6',
      spark: sparks.soh,
      hint: 'state of health',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-24 pt-3 sm:px-5 sm:pt-5">
      <AlertBanner
        alerts={alerts}
        visible={bannerVisible}
        onDismiss={() => setDismissedSig(alertSig)}
      />

      <DashboardHeader
        status={status}
        agoLabel={agoLabel}
        isDemo={isDemo}
        loading={loading && !latest}
        onRefresh={refresh}
      />

      <section className="mt-3">
        <MemoBatteryScene
          valuesRef={valuesRef}
          alerts={alerts}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
          reducedMotion={reducedMotion}
        />
      </section>

      {error ? (
        <p className="mt-2 font-mono text-[10px] text-brand-amber/80">
          ! {error} - retrying every {POLL_SECONDS}s
        </p>
      ) : null}

      <section className="mt-4">
        <SectionHeading title="Telemetry" hint={`poll ${POLL_SECONDS}s · lerped`} />
        <div className="no-scrollbar snap-row -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {cards.map((card) => (
            <StatCard
              key={card.id}
              label={card.label}
              value={card.value}
              unit={card.unit}
              color={card.color}
              spark={card.spark}
              hint={card.hint}
            />
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SectionHeading title="Cells" hint="tap to focus" />
        <CellStrip
          cells={snapshot.cells}
          alerts={alerts}
          selected={selectedCell}
          onSelect={setSelectedCell}
        />
      </section>

      <section className="mt-4">
        <Graphs history={history} />
      </section>

      <section className="mt-4">
        <EventFeed history={history} />
      </section>

      <footer className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
        Urja Sync · ESP32 BMS · ThingSpeak
      </footer>
    </main>
  );
}
