/**
 * Single source of truth for every telemetry threshold, scale and cadence.
 * Rules, colour mapping and the UI all read from here so a threshold can never
 * drift between the server and the client.
 */

/** Usable cell-voltage window rendered by the bars/gauges. */
export const VOLT_USABLE = { min: 3.0, max: 4.2 } as const;

export interface VoltColorStop {
  v: number;
  rgb: [number, number, number];
}

/** Cell voltage -> colour, interpolated (deep red -> amber -> green). */
export const VOLT_COLOR_STOPS: VoltColorStop[] = [
  { v: 3.3, rgb: [229, 72, 77] },
  { v: 3.6, rgb: [245, 165, 36] },
  { v: 4.0, rgb: [48, 209, 88] },
];

export const ALERT_THRESHOLDS = {
  tempWarn: 32,
  tempCritical: 40,
  cellOvervoltage: 4.25,
  cellUndervoltage: 3.0,
  cellImbalance: 0.1,
} as const;

/** Age of the newest feed before the channel is considered stale/offline. */
export const STATUS_WINDOWS = {
  liveMs: 90_000,
  staleMs: 300_000,
} as const;

/** Client poll cadence - ThingSpeak's free tier floor is 15s. */
export const POLL_INTERVAL_MS = 15_000;
