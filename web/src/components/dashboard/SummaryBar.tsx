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
 */
export function SummaryBar() {
  const { status, lastFetchedAt, loading, latest, isDemo, metrics, now, refresh, hasCredentials } =
    useTelemetryContext();

  const agoLabel = lastFetchedAt ? relTime(now - lastFetchedAt) : '—';
  const windowLabel = metrics.durationMs > 0 ? formatDuration(metrics.durationMs) : null;

  return (
    <section className="glass p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-semibold uppercase tracking-[0.16em] text-white">
            Urja<span className="ml-1 text-cyan-300">Sync</span>
          </h1>
          {isDemo ? (
            <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-200">
              demo
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Until the first poll settles we cannot know whether a channel is
              configured, so the pill stays neutral rather than claiming either. */}
          {loading || hasCredentials ? (
            <StatusPill status={status} onRefresh={refresh} loading={loading && !latest} />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-inset ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              <span className="font-mono text-[11px] font-medium tracking-widest text-white/50">
                NO CHANNEL
              </span>
            </span>
          )}
          <SettingsButton connected={latest !== null} />
        </div>
      </div>

      <p className="mt-2.5 truncate font-mono text-[9px] uppercase tracking-widest text-white/25">
        {metrics.sampleCount} samples
        {windowLabel ? ` · ${windowLabel} window` : ''} · updated {agoLabel}
      </p>
    </section>
  );
}
