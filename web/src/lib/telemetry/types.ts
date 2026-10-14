export type Status = 'LIVE' | 'STALE' | 'OFFLINE';

export interface Alert {
  code: string;
  message: string;
  severity: 'warn' | 'critical';
}

export interface Telemetry {
  timestamp: string;
  packV: number;
  cells: [number, number, number];
  tempC: number;
  currentA: number;
  soc: number;
  soh: number;
  powerW: number;
  imbalanceV: number;
  status: Status;
  alerts: Alert[];
}

export interface TelemetryResponse {
  latest: Telemetry | null;
  history: Telemetry[];
}

/** Demo/test payload shapes served by the telemetry route. */
export type Scenario = 'normal' | 'alert' | 'stale' | 'empty' | 'malformed';
