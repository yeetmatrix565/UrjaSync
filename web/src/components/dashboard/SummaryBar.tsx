'use client';

import { SettingsButton } from './SettingsButton';
import { StatusPill } from './StatusPill';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { relTime } from '@/lib/format';
import { formatDuration } from '@/lib/telemetry/derive';

/**
 * Identity and link state: who we are, whether the data is fresh, and how much
 * history the window covers. The pack's live numbers sit under the 3D view, and
 * everything deeper lives behind a card.
 *
 * A <header> (not a generic section): it is the dashboard's banner landmark,
 * and its h1 is the page's one top-level heading.
 */
export function SummaryBar() {
  const {
    status,
    lastFetchedAt,
    loading,
    latest,
    isDemo,
    metrics,
    now,
    refresh,
    hasCredentials,
  } = useTelemetryContext();

  const agoLabel = lastFetchedAt ? relTime(now - lastFetchedAt) : '—';
  const windowLabel = metrics.durationMs > 0 ? formatDuration(metrics.durationMs) : null;

  return (
    <header className="glass-strong px-4 py-3.5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="truncate text-lg font-semibold uppercase tracking-[0.16em] text-white sm:text-xl">
            Urja<span className="ml-1 text-cyan-300">Sync</span>
          </h1>
          {isDemo ? (
            <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest text-amber-200">
              demo
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Until the first poll settles we cannot know whether a channel is
              configured, so the pill stays neutral rather than claiming either. */}
          {loading || hasCredentials ? (
            <StatusPill
              status={status}
              onRefresh={refresh}
              loading={loading && !latest}
            />
          ) : (
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-inset ring-white/15">
              <span className="h-2 w-2 rounded-full bg-white/30" aria-hidden="true" />
              <span className="font-mono text-[11px] font-medium tracking-widest text-white/60">
                NO CHANNEL
              </span>
            </span>
          )}
          <SettingsButton connected={latest !== null} />
        </div>
      </div>

      <p className="mt-2.5 truncate font-mono text-[10px] uppercase tracking-widest text-white/50">
        {metrics.sampleCount} samples
        {windowLabel ? ` · ${windowLabel}` : ''} · updated {agoLabel}
      </p>
    </header>
  );
}
