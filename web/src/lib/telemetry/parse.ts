import { DEFAULT_FIELD_MAPPING, MAX_FIELD_NUMBER } from './constants';
import { computeStatus, deriveAlerts } from './rules';
import { channelResponseSchema, feedSchema, type ParsedFeed } from './schema';
import type {
  CellVoltages,
  FieldMapping,
  Status,
  Telemetry,
  TelemetryResponse,
} from './types';

const EMPTY: TelemetryResponse = { latest: null, history: [] };

/** field1..field8 as a 0-indexed array of numbers (null where not published). */
function toFieldValues(feed: ParsedFeed): Array<number | null> {
  return [
    feed.field1,
    feed.field2,
    feed.field3,
    feed.field4,
    feed.field5,
    feed.field6,
    feed.field7,
    feed.field8,
  ];
}

function valueAt(values: Array<number | null>, field: number | undefined): number | null {
  if (field === undefined || field < 1 || field > MAX_FIELD_NUMBER) return null;
  return values[field - 1] ?? null;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Maps one validated feed onto the app's metrics. Returns null when the feed
 * carries nothing this mapping recognises, so unusable rows are dropped rather
 * than rendered as a wall of dashes.
 */
export function mapFeed(
  feed: ParsedFeed,
  status: Status,
  mapping: FieldMapping,
): Telemetry | null {
  const values = toFieldValues(feed);

  const cells: CellVoltages = mapping.cellV.map((field) => valueAt(values, field));
  const measured = cells.filter((v): v is number => v !== null);

  const tempRaw = valueAt(values, mapping.tempC);
  const tempC =
    tempRaw === null
      ? null
      : mapping.tempUnit === 'F'
        ? ((tempRaw - 32) * 5) / 9
        : tempRaw;

  const currentA = valueAt(values, mapping.currentA);
  const soc = valueAt(values, mapping.soc);
  const soh = valueAt(values, mapping.soh);
  const publishedPackV = valueAt(values, mapping.packV);

  const hasAnything =
    publishedPackV !== null ||
    measured.length > 0 ||
    tempC !== null ||
    currentA !== null ||
    soc !== null ||
    soh !== null;

  if (!hasAnything) return null;

  // When a channel publishes every cell but no pack total, the total is
  // arithmetic over real measurements rather than something invented.
  const allCellsPresent = cells.length > 0 && measured.length === cells.length;
  const packV =
    publishedPackV ??
    (measured.length >= 2 && allCellsPresent
      ? round(measured.reduce((sum, v) => sum + v, 0))
      : null);

  const imbalanceV =
    measured.length >= 2 ? round(Math.max(...measured) - Math.min(...measured)) : null;

  const powerW = packV !== null && currentA !== null ? round(packV * currentA) : null;

  return {
    timestamp: new Date(feed.created_at).toISOString(),
    packV,
    cells,
    tempC,
    currentA,
    soc,
    soh,
    powerW,
    imbalanceV,
    status,
    alerts: deriveAlerts({ cells, tempC, imbalanceV }),
  };
}

/**
 * Validates a raw ThingSpeak payload feed-by-feed. Rows without a usable
 * timestamp are dropped, then rows the mapping cannot interpret are dropped.
 * Never throws and never lets NaN through.
 */
export function parseChannel(
  raw: unknown,
  mapping: FieldMapping = DEFAULT_FIELD_MAPPING,
): TelemetryResponse {
  try {
    const outer = channelResponseSchema.safeParse(raw);
    if (!outer.success) return EMPTY;

    const parsed: Array<{ ts: number; feed: ParsedFeed }> = [];
    for (const entry of outer.data.feeds ?? []) {
      const result = feedSchema.safeParse(entry);
      if (!result.success) continue;

      const ts = new Date(result.data.created_at).getTime();
      if (!Number.isFinite(ts)) continue;

      parsed.push({ ts, feed: result.data });
    }

    if (parsed.length === 0) return EMPTY;

    parsed.sort((a, b) => a.ts - b.ts);

    const newest = parsed[parsed.length - 1]!;
    const status = computeStatus(newest.ts);
    const history = parsed
      .map((entry) => mapFeed(entry.feed, status, mapping))
      .filter((entry): entry is Telemetry => entry !== null);

    if (history.length === 0) return EMPTY;

    return { latest: history[history.length - 1] ?? null, history };
  } catch {
    return EMPTY;
  }
}
