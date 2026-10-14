import { deriveAlerts, computeStatus } from './rules';
import { channelResponseSchema, feedSchema, type ParsedFeed } from './schema';
import type { Status, Telemetry, TelemetryResponse } from './types';

/** A validated feed plus its parsed timestamp. */
export function mapFeed(feed: ParsedFeed, status: Status): Telemetry {
  const cells: [number, number, number] = [feed.field2, feed.field3, feed.field4];
  const imbalanceV = Math.max(...cells) - Math.min(...cells);

  return {
    timestamp: new Date(feed.created_at).toISOString(),
    packV: feed.field1,
    cells,
    tempC: feed.field5,
    currentA: feed.field6,
    soc: feed.field7,
    soh: feed.field8,
    powerW: feed.field1 * feed.field6,
    imbalanceV,
    status,
    alerts: deriveAlerts(cells, feed.field5, imbalanceV),
  };
}

/**
 * Validates a raw ThingSpeak payload feed-by-feed, dropping any row with a
 * missing / malformed critical field. Never lets NaN reach the client, and any
 * unexpected shape yields an empty, non-throwing response.
 */
export function parseChannel(raw: unknown): TelemetryResponse {
  try {
    const outer = channelResponseSchema.safeParse(raw);
    if (!outer.success) return { latest: null, history: [] };

    const parsed: Array<{ ts: number; feed: ParsedFeed }> = [];
    for (const entry of outer.data.feeds ?? []) {
      const result = feedSchema.safeParse(entry);
      if (!result.success) continue;

      const ts = new Date(result.data.created_at).getTime();
      if (!Number.isFinite(ts)) continue;

      parsed.push({ ts, feed: result.data });
    }

    if (parsed.length === 0) return { latest: null, history: [] };

    parsed.sort((a, b) => a.ts - b.ts);

    const newest = parsed[parsed.length - 1]!;
    const status = computeStatus(newest.ts);
    const history = parsed.map((p) => mapFeed(p.feed, status));
    const latest = history[history.length - 1] ?? null;

    return { latest, history };
  } catch {
    return { latest: null, history: [] };
  }
}
