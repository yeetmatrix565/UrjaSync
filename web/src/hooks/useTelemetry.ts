'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS } from '@/lib/telemetry/constants';
import type { Telemetry, TelemetryResponse } from '@/lib/telemetry/types';

export interface UseTelemetryResult {
  latest: Telemetry | null;
  history: Telemetry[];
  lastFetchedAt: number | null;
  error: string | null;
  loading: boolean;
  isDemo: boolean;
  refresh: () => void;
}

export function useTelemetry(): UseTelemetryResult {
  const [latest, setLatest] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [nonce, setNonce] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async (): Promise<void> => {
      if (inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const url = new URL('/api/telemetry', window.location.origin);
        const scenario = new URLSearchParams(window.location.search).get('scenario');
        if (scenario) url.searchParams.set('scenario', scenario);

        const res = await fetch(url.toString(), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as TelemetryResponse;
        if (cancelled) return;
        setLatest(data.latest ?? null);
        setHistory(Array.isArray(data.history) ? data.history : []);
        setLastFetchedAt(Date.now());
        setIsDemo(res.headers.get('x-urja-demo') === '1');
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
  }, [nonce]);

  return { latest, history, lastFetchedAt, error, loading, isDemo, refresh };
}
