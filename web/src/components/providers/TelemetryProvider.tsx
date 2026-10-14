'use client';

import {
  createContext,
  useContext,
  useMemo,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useTelemetryLerp, type LerpValues } from '@/hooks/useTelemetryLerp';
import type { EnergySummary } from '@/lib/electrical/energy';
import { windowEnergy, windowMetrics, type WindowMetrics } from '@/lib/telemetry/derive';
import type { Alert, FieldMapping, Status, Telemetry } from '@/lib/telemetry/types';

export interface TelemetryContextValue {
  latest: Telemetry | null;
  history: Telemetry[];
  /** Alerts on the newest feed; empty when nothing has fired. */
  alerts: Alert[];
  /** Per-metric series and summaries over the ThingSpeak window. */
  metrics: WindowMetrics;
  energy: EnergySummary;
  /** Smoothed values for animated readouts; the 3D scene reads `valuesRef`. */
  snapshot: LerpValues;
  valuesRef: MutableRefObject<LerpValues>;
  status: Status;
  lastFetchedAt: number | null;
  error: string | null;
  loading: boolean;
  /** Showing synthetic fixtures rather than a live channel. */
  isDemo: boolean;
  hasCredentials: boolean;
  /** Field layout in use; tells the UI whether a metric was measured or derived. */
  mapping: FieldMapping | null;
  reducedMotion: boolean;
  now: number;
  refresh: () => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

/**
 * One poll for the whole app.
 *
 * Every route reads this provider instead of calling useTelemetry itself, so
 * navigating between screens neither restarts the poll timer nor re-fetches the
 * channel - which matters against ThingSpeak's rate limits, and keeps the cards
 * and the detail screens showing identical numbers.
 */
export function TelemetryProvider({ children }: { children: ReactNode }) {
  const {
    latest,
    history,
    lastFetchedAt,
    error,
    loading,
    isDemo,
    hasCredentials,
    mapping,
    refresh,
  } = useTelemetry();
  const reducedMotion = useReducedMotion();
  const { valuesRef, snapshot } = useTelemetryLerp(latest, reducedMotion);
  const now = useNow(1000);

  // Recomputed when a poll lands, never per render or per animation frame.
  const metrics = useMemo(() => windowMetrics(history), [history]);
  const energy = useMemo(() => windowEnergy(history), [history]);
  // Stable identity so consumers that memo on `alerts` don't churn every render.
  const alerts = useMemo(() => latest?.alerts ?? [], [latest]);

  // A transport error means what's on screen is no longer fresh, even if the
  // last payload we hold said LIVE. Deliberately STALE, not OFFLINE and not
  // a wipe: useTelemetry keeps last-known latest/history on transient
  // failure, so the provider must keep deriving from them (metrics, energy,
  // alerts) and only downgrade the status until the next successful poll.
  const status: Status = latest ? (error ? 'STALE' : latest.status) : 'OFFLINE';

  const value = useMemo<TelemetryContextValue>(
    () => ({
      latest,
      history,
      alerts,
      metrics,
      energy,
      snapshot,
      valuesRef,
      status,
      lastFetchedAt,
      error,
      loading,
      isDemo,
      hasCredentials,
      mapping,
      reducedMotion,
      now,
      refresh,
    }),
    [
      latest,
      history,
      alerts,
      metrics,
      energy,
      snapshot,
      valuesRef,
      status,
      lastFetchedAt,
      error,
      loading,
      isDemo,
      hasCredentials,
      mapping,
      reducedMotion,
      now,
      refresh,
    ],
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetryContext(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used inside <TelemetryProvider>');
  }
  return context;
}
