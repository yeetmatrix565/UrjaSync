'use client';

import { memo, useMemo } from 'react';
import type { Telemetry } from '@/lib/telemetry/types';
import { cx, fmt, fmtInt, localTime } from '@/lib/format';

interface FeedEvent {
  id: string;
  ts: string;
  kind: 'alert' | 'beat';
  severity: 'warn' | 'critical' | null;
  text: string;
}

const MAX_EVENTS = 60;

function EventFeedBase({ history }: { history: Telemetry[] }) {
  const events = useMemo<FeedEvent[]>(() => {
    const out: FeedEvent[] = [];
    for (let i = history.length - 1; i >= 0 && out.length < MAX_EVENTS; i--) {
      const f = history[i];
      if (!f) continue;

      for (const a of f.alerts) {
        out.push({
          id: `alert-${f.timestamp}-${a.code}`,
          ts: f.timestamp,
          kind: 'alert',
          severity: a.severity,
          text: a.message,
        });
      }

      out.push({
        id: `beat-${f.timestamp}`,
        ts: f.timestamp,
        kind: 'beat',
        severity: null,
        text: `${fmt(f.packV, 2)}V · ${fmt(f.currentA, 2)}A · ${fmtInt(f.soc)}% SOC · ${fmt(f.tempC, 1)}°C`,
      });
    }
    return out.slice(0, MAX_EVENTS);
  }, [history]);

  return (
    <section className="glass p-3.5 sm:p-4" aria-labelledby="feed-heading">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 id="feed-heading" className="label-xs">
          Live feed
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/45">
          newest first
        </span>
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center font-mono text-[11px] text-white/50" role="status">
          no telemetry yet
        </p>
      ) : (
        <ul
          className="max-h-64 space-y-0.5 overflow-y-auto pr-1"
          role="log"
          aria-label="Telemetry events, newest first"
        >
          {events.map((e) => (
            <li
              key={e.id}
              className={cx(
                'flex items-start gap-2 rounded-lg px-2 py-1 font-mono text-[11px] leading-relaxed',
                e.kind === 'alert' &&
                  (e.severity === 'critical'
                    ? 'border-l-2 border-l-brand-red bg-brand-red/10 text-red-100'
                    : 'border-l-2 border-l-brand-amber bg-brand-amber/10 text-amber-100'),
              )}
            >
              <span className="shrink-0 tabular-nums text-white/55">
                {localTime(e.ts)}
              </span>
              <span className="text-white/40" aria-hidden="true">
                {'\u2014'}
              </span>
              <span className="num min-w-0 flex-1">
                {e.kind === 'alert' ? (
                  <span className="font-medium uppercase tracking-wider">{e.text}</span>
                ) : (
                  <span className="text-white/70">{e.text}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const EventFeed = memo(EventFeedBase);
