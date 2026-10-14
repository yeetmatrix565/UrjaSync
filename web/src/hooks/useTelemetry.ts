'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG_CHANGED_EVENT, readCredentials } from '@/lib/telemetry/bridge';
import { asScenario, fetchTelemetry } from '@/lib/telemetry/client';
import { POLL_INTERVAL_MS } from '@/lib/telemetry/constants';
import type { ChannelCredentials, FieldMapping, Telemetry } from '@/lib/telemetry/types';

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
  /** True while showing synthetic data (a `?scenario=` override only). */
  isDemo: boolean;
  hasCredentials: boolean;
  /** Field layout in use, so the UI can tell a measured value from a derived one. */
  mapping: FieldMapping | null;
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
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
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
        const {
          response,
          demo,
          mapping: usedMapping,
        } = await fetchTelemetry(credentials, {
          scenario,
          signal: controller.signal,
        });
        if (cancelled) return;

        // No credentials and no scenario is the intentional "not configured"
        // state, not a fetch: clear the (now stale) previous channel's data
        // and reset lastFetchedAt to null - no data was received, and the
        // old timestamp must not keep implying freshness after disconnect.
        // Every other successful return replaces state, including a
        // successful-but-empty channel (latest null, history []), which is
        // real information that the channel currently has no feeds.
        setLatest(response.latest ?? null);
        setHistory(response.history);
        if (credentials === null && scenario === null) {
          setLastFetchedAt(null);
        } else {
          setLastFetchedAt(Date.now());
        }
        setIsDemo(demo);
        setMapping(usedMapping);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        // Only a caller-initiated abort is a non-error. fetchTelemetry
        // re-throws caller aborts unchanged, so an AbortError here with our
        // own signal aborted is a cleanup; an AbortError with our signal
        // still live is the client's upstream timeout, which must surface.
        // (fetchTelemetry already converts that case to a timeout Error, so
        // this branch is defence-in-depth, not the primary path.)
        if (
          err instanceof DOMException &&
          err.name === 'AbortError' &&
          controller.signal.aborted
        ) {
          return;
        }
        // Transient failure: keep last-known latest/history/lastFetchedAt
        // untouched and surface the error, so the UI keeps showing the last
        // good readings (downgraded to STALE by the provider) instead of
        // wiping to dashes on every dropped packet.
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
      // The aborted request is finished with, so release the in-flight guard.
      // Without this, React's StrictMode double-invoke (mount, cleanup, mount
      // again) leaves the second effect seeing a stale `true` and never
      // fetching - the dashboard then stays empty until the poll interval fires.
      inFlight.current = false;
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
    mapping,
    refresh,
  };
}
