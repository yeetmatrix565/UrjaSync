import { detectMapping, extractFieldLabels } from './detect';
import { buildMockRaw } from './mock';
import { parseChannel } from './parse';
import type {
  ChannelCredentials,
  FieldMapping,
  Scenario,
  TelemetryResponse,
} from './types';

export interface TelemetryFetchResult {
  response: TelemetryResponse;
  /** True only when the payload is synthetic - a `?scenario=` override. */
  demo: boolean;
  /** Mapping actually used, so the UI can show what was detected. */
  mapping: FieldMapping;
  /** True when the mapping came from the channel labels rather than a fallback. */
  inferred: boolean;
}

export interface FetchOptions {
  scenario?: Scenario | null;
  signal?: AbortSignal;
  /** User override; skips label detection entirely when present. */
  mapping?: FieldMapping | null;
}

const THINGSPEAK_BASE = 'https://api.thingspeak.com';
const FEED_COUNT = 100;
const UPSTREAM_TIMEOUT_MS = 8_000;
const EMPTY_RESPONSE: TelemetryResponse = { latest: null, history: [] };

const SCENARIOS: readonly Scenario[] = [
  'normal',
  'alert',
  'stale',
  'empty',
  'malformed',
  'basic',
];

export function asScenario(value: string | null): Scenario | null {
  return value !== null && (SCENARIOS as readonly string[]).includes(value)
    ? (value as Scenario)
    : null;
}

export function feedsUrl(credentials: ChannelCredentials): string {
  return (
    `${THINGSPEAK_BASE}/channels/${encodeURIComponent(credentials.channelId)}` +
    `/feeds.json?api_key=${encodeURIComponent(credentials.readApiKey)}` +
    `&results=${FEED_COUNT}`
  );
}

/** Detect the field layout from the payload unless the user overrode it. */
function interpret(
  raw: unknown,
  override: FieldMapping | null | undefined,
): {
  response: TelemetryResponse;
  mapping: FieldMapping;
  inferred: boolean;
} {
  if (override) {
    return { response: parseChannel(raw, override), mapping: override, inferred: false };
  }

  const mapping = detectMapping(extractFieldLabels(raw));
  return { response: parseChannel(raw, mapping), mapping, inferred: true };
}

/**
 * Reads telemetry for the configured channel straight from ThingSpeak.
 *
 * ThingSpeak answers with `Access-Control-Allow-Origin: *`, so this works from a
 * browser and from the app's WebView alike with no proxy in between - which is
 * what lets the app run standalone.
 *
 * Failure contract: only a caller-initiated abort is re-thrown as-is. Every
 * other transient failure (HTTP error, network error, upstream timeout,
 * unparsable JSON) is thrown as an Error, NEVER collapsed into an empty
 * response. Collapsing failures into `{ latest: null, history: [] }` made the
 * caller wipe the last-known good data and reset `lastFetchedAt` on every
 * dropped packet, and hid the real error. Callers must keep last-known data on
 * throw and surface the error; only a successful fetch replaces state.
 *
 * The two non-error empty returns are deliberate: a `?scenario=` override
 * (synthetic data, asked for explicitly) and no credentials (nothing
 * configured - the UI shows ConnectPrompt, not invented numbers).
 */
export async function fetchTelemetry(
  credentials: ChannelCredentials | null,
  options: FetchOptions = {},
): Promise<TelemetryFetchResult> {
  // The `?scenario=` override is the only way to get synthetic data, and it has
  // to be asked for explicitly. Nothing falls back to it on its own.
  if (options.scenario) {
    return { ...interpret(buildMockRaw(options.scenario), options.mapping), demo: true };
  }

  // No channel configured: report no readings rather than inventing them. The UI
  // prompts for a channel instead, so the app never shows numbers that could be
  // mistaken for this pack's real measurements.
  if (!credentials) {
    return {
      response: EMPTY_RESPONSE,
      demo: false,
      mapping: options.mapping ?? detectMapping([]),
      inferred: false,
    };
  }

  const controller = new AbortController();
  const abortFromCaller = (): void => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller);
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(feedsUrl(credentials), {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`ThingSpeak request failed: HTTP ${res.status}`);
    }

    const raw: unknown = await res.json();
    return { ...interpret(raw, options.mapping), demo: false };
  } catch (err) {
    // Caller abort (unmount / credentials change): propagate unchanged so the
    // caller can swallow it as a non-error. Anything else is a real transient
    // failure and must surface - see the contract above.
    if (options.signal?.aborted) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      // The only remaining abort source is our own upstream timeout.
      throw new Error(
        `ThingSpeak request timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s`,
      );
    }
    if (err instanceof Error) throw err;
    throw new Error('ThingSpeak request failed');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}
