'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG_CHANGED_EVENT, readCredentials } from '@/lib/telemetry/bridge';
import { asScenario, fetchTelemetry } from '@/lib/telemetry/client';
import { POLL_INTERVAL_MS } from '@/lib/telemetry/constants';
import type { ChannelCredentials, Telemetry } from '@/lib/telemetry/types';

/** readCredentials() builds a fresh object every call, so compare by value. */
function sameCredentials(
  a: ChannelCredentials | null,
  b: ChannelCredentials | null,
): boolean {
  if (a === null || b === null) return a === b;
  return a.channelId === b.channelId && a.readApiKey === b.readApiKey;
}

export interface UseTelemetryResult {
  latest: Telemetry | null;
  history: Telemetry[];
  lastFetchedAt: number | null;
  error: string | null;
  loading: boolean;
  /** True while showing synthetic data (no credentials, or a scenario override). */
  isDemo: boolean;
  hasCredentials: boolean;
  refresh: () => void;
}

/**
 * Polls the configured ThingSpeak channel directly from the client. Credentials
 * come from the native shell and are re-read whenever the app says they changed
 * (returning from the settings screen), so connecting a channel takes effect
 * without a restart.
 */
export function useTelemetry(): UseTelemetryResult {
  const [credentials, setCredentials] = useState<ChannelCredentials | null>(null);
  const [latest, setLatest] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [nonce, setNonce] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    // Only replace state when the values actually differ: otherwise every focus
    // event would restart the polling effect and fire a duplicate request, which
    // ThingSpeak's rate limits will not thank us for.
    const sync = (): void => {
      const next = readCredentials();
      setCredentials((prev) => (sameCredentials(prev, next) ? prev : next));
    };

    sync();
    window.addEventListener(CONFIG_CHANGED_EVENT, sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.removeEventListener(CONFIG_CHANGED_EVENT, sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const scenario = asScenario(
      new URLSearchParams(window.location.search).get('scenario'),
    );

    const load = async (): Promise<void> => {
      if (inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const { response, demo } = await fetchTelemetry(credentials, {
          scenario,
          signal: controller.signal,
        });
        if (cancelled) return;

        setLatest(response.latest ?? null);
        setHistory(response.history);
        setLastFetchedAt(Date.now());
        setIsDemo(demo);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'request failed');
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);

    const onVisibility = (): void => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [credentials, nonce]);

  return {
    latest,
    history,
    lastFetchedAt,
    error,
    loading,
    isDemo,
    hasCredentials: credentials !== null,
    refresh,
  };
}
