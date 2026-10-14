export type Status = 'LIVE' | 'STALE' | 'OFFLINE';

export interface Alert {
  code: string;
  message: string;
  severity: 'warn' | 'critical';
}

/** Cell voltages in order; an entry is null when that cell wasn't published. */
export type CellVoltages = (number | null)[];

export type TempUnit = 'C' | 'F';

/**
 * Which ThingSpeak field (1-8) carries each metric. An absent key means the
 * channel doesn't publish it, and `cellV` is empty when there are no cells.
 */
export interface FieldMapping {
  packV?: number;
  cellV: number[];
  tempC?: number;
  /** How to read `tempC`; defaults to Celsius. */
  tempUnit?: TempUnit;
  currentA?: number;
  soc?: number;
  soh?: number;
}

/**
 * Every metric except the timestamp is nullable: a basic pack may publish three
 * fields or eight, and the UI renders whatever is actually there rather than
 * inventing the rest.
 */
export interface Telemetry {
  timestamp: string;
  packV: number | null;
  cells: CellVoltages;
  tempC: number | null;
  currentA: number | null;
  soc: number | null;
  soh: number | null;
  powerW: number | null;
  imbalanceV: number | null;
  status: Status;
  alerts: Alert[];
}

export interface TelemetryResponse {
  latest: Telemetry | null;
  history: Telemetry[];
}

/** ThingSpeak channel + read key entered in the native settings screen. */
export interface ChannelCredentials {
  channelId: string;
  readApiKey: string;
}

/** Demo/test payload shapes produced by the mock fixtures. */
export type Scenario = 'normal' | 'alert' | 'stale' | 'empty' | 'malformed' | 'basic';
