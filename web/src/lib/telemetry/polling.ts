import { POLL_INTERVAL_MS } from './constants';
import type { Status, Telemetry } from './types';

/**
 * Poll cadence, chosen by how fresh the data we already hold is.
 *
 * Polling every 15s only makes sense when the device is actively posting. A pack
 * whose newest feed is hours old will not have new data 15s from now, so asking
 * that often wastes the phone's battery and eats into ThingSpeak's rate limits
 * for nothing - while still being ready to notice the device coming back within
 * a few minutes.
 */
export const POLL_BACKOFF_MS: Record<Status, number> = {
  /** Fresh: the device is posting at the expected cadence. */
  LIVE: POLL_INTERVAL_MS,
  /** Possibly a blip; check again reasonably soon. */
  STALE: 60_000,
  /** Long silence; check occasionally so a returning device is picked up. */
  OFFLINE: 300_000,
};

/** How long to wait before the next poll, given the freshness of what we hold. */
export function pollDelayMs(status: Status): number {
  return POLL_BACKOFF_MS[status] ?? POLL_INTERVAL_MS;
}

/**
 * Whether an incoming response should replace the readings on screen.
 *
 * A successful but empty channel response is not a reason to blank the
 * dashboard: a device that is merely offline (or a momentary gap in the channel)
 * must leave the last known readings visible, clearly downgraded to stale - the
 * alternative is every card flickering to dashes while the pack is simply asleep.
 * The one exception is having no readings at all yet, where empty is genuinely
 * all we know and must be shown as such.
 */
export function keepsPreviousReadings(
  incoming: Pick<{ latest: Telemetry | null; history: Telemetry[] }, 'latest' | 'history'>,
  hasReadings: boolean,
): boolean {
  return hasReadings && incoming.history.length === 0 && incoming.latest === null;
}
