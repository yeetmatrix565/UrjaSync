'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG_CHANGED_EVENT, readCredentials } from '@/lib/telemetry/bridge';
import { asScenario, fetchTelemetry } from '@/lib/telemetry/client';
import { keepsPreviousReadings, pollDelayMs } from '@/lib/telemetry/polling';
import type {
  ChannelCredentials,
  FieldMapping,
  Status,
  Telemetry,
} from '@/lib/telemetry/types';

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
 *
 * The cadence follows the data's freshness (see `pollDelayMs`): every 15s while
 * the device is posting, backing off to five minutes once it has gone quiet. A
 * device that posts every few hours does not need asking every 15 seconds, and
 * the last known readings stay on screen throughout.
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
  /** Whether anything is on screen worth preserving across a quiet period. */
  const hasReadings = useRef(false);

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
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    const scenario = asScenario(
      new URLSearchParams(window.location.search).get('scenario'),
    );

    /**
     * One timer at a time: a finishing poll and the visibility handler can both
     * want to schedule, and two live timers would mean two overlapping poll
     * loops - the duplicate-request problem all over again.
     */
    const schedule = (ms: number): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void poll();
      }, ms);
    };

    const poll = async (): Promise<void> => {
      // While hidden we neither fetch nor schedule; becoming visible polls
      // immediately, so nothing is missed by going quiet in the background.
      if (cancelled || inFlight.current || document.hidden) return;

      inFlight.current = true;
      let nextStatus: Status = 'OFFLINE';

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

        if (keepsPreviousReadings(response, hasReadings.current)) {
          // The device is offline, or the channel momentarily has nothing: hold
          // the last known readings rather than blanking every card. The error
          // surfaces why, and the provider downgrades the status to STALE.
          setError('channel returned no readings - showing last known values');
        } else {
          setLatest(response.latest ?? null);
          setHistory(response.history);
          setError(null);
          hasReadings.current = response.history.length > 0;
        }

        // No credentials and no scenario is the intentional "not configured"
        // state, not a fetch: no data arrived, so there is nothing to date. The
        // old timestamp must not go on implying freshness after a disconnect.
        setLastFetchedAt(credentials === null && scenario === null ? null : Date.now());
        setIsDemo(demo);
        setMapping(usedMapping);
        nextStatus = response.latest?.status ?? 'OFFLINE';
      } catch (err) {
        if (cancelled) return;
        // Only a caller-initiated abort is a non-error. fetchTelemetry
        // re-throws caller aborts unchanged, so an AbortError here with our own
        // signal aborted is a cleanup.
        if (
          err instanceof DOMException &&
          err.name === 'AbortError' &&
          controller.signal.aborted
        ) {
          return;
        }
        // Transient failure: keep last-known latest/history/lastFetchedAt
        // untouched and surface the error, so the UI keeps showing the last good
        // readings (downgraded to STALE by the provider) instead of wiping to
        // dashes on every dropped packet.
        setError(err instanceof Error ? err.message : 'request failed');
      } finally {
        inFlight.current = false;
        if (!cancelled) {
          setLoading(false);
          // Ask again according to how fresh what we now hold is.
          schedule(pollDelayMs(nextStatus));
        }
      }
    };

    void poll();

    // Returning to the app should check straight away rather than wait out a
    // backoff that may be minutes long.
    const onVisibility = (): void => {
      if (!document.hidden) void poll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      controller.abort();
      // The aborted request is finished with, so release the in-flight guard.
      // Without this, React's StrictMode double-invoke (mount, cleanup, mount
      // again) leaves the second effect seeing a stale `true` and never
      // fetching - the dashboard then stays empty until the first backoff ends.
      inFlight.current = false;
      if (timer) clearTimeout(timer);
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
