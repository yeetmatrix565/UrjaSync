/**
 * Documentation for every electrical value this app displays.
 *
 * `implementation` names the function that actually produces the number, so a
 * formula can never silently disagree with the engine: the drift-guard test in
 * `formulas.test.ts` fails if a calculation ships without an entry here.
 */
export interface FormulaDoc {
  id: string;
  title: string;
  /** What the quantity physically means. */
  meaning: string;
  /** Rendered with Unicode operators; no maths dependency needed. */
  formula: string;
  variables: ReadonlyArray<{ symbol: string; definition: string; unit?: string }>;
  assumptions: ReadonlyArray<string>;
  limitations: ReadonlyArray<string>;
  implementation: string;
}

export const FORMULAS = {
  packVoltage: {
    id: 'packVoltage',
    title: 'Pack voltage',
    meaning:
      'Total terminal voltage of the pack. When the channel publishes it, that measurement is used as-is; when it does not, it is the sum of the measured cell voltages.',
    formula: 'V_pack = Σ V_cell,i   (i = 1 … n)',
    variables: [
      { symbol: 'V_pack', definition: 'pack terminal voltage', unit: 'V' },
      { symbol: 'V_cell,i', definition: 'voltage of cell i', unit: 'V' },
      { symbol: 'n', definition: 'number of cells the channel publishes' },
    ],
    assumptions: [
      'A published pack voltage is preferred; the sum is only a fallback.',
      'The sum is computed only when every detected cell has a value, so a partially reported pack never yields a wrong total.',
      'Cells are treated as series-connected, which is how a BMS pack is wired.',
    ],
    limitations: [
      'The sum ignores wiring, connector and shunt losses, so it is slightly higher than a measurement taken at the terminals.',
      'Not computed for a single-cell pack: one cell is not a "sum".',
    ],
    implementation: 'mapFeed (lib/telemetry/parse.ts)',
  },

  cellImbalance: {
    id: 'cellImbalance',
    title: 'Cell imbalance',
    meaning:
      'Spread between the strongest and weakest cell. It is the standard early indicator of a weak cell or a failing balancing circuit.',
    formula: 'ΔV = max(V_cell,1 … V_cell,n) − min(V_cell,1 … V_cell,n)',
    variables: [
      { symbol: 'ΔV', definition: 'cell imbalance', unit: 'V' },
      { symbol: 'V_cell,i', definition: 'voltage of cell i', unit: 'V' },
    ],
    assumptions: [
      'Cells are compared at the same instant, from the same feed.',
      'Only measured cells are considered; missing cells are skipped rather than treated as 0 V.',
    ],
    limitations: [
      'Undefined for a pack with fewer than two cells - a single cell cannot be imbalanced.',
      'Says nothing about which cell is at fault, only how far apart they are.',
    ],
    implementation: 'mapFeed (lib/telemetry/parse.ts)',
  },

  instantaneousPower: {
    id: 'instantaneousPower',
    title: 'Instantaneous power',
    meaning:
      'Rate of energy transfer at a single sample. Positive means the pack is discharging; negative means it is charging.',
    formula: 'p(t) = v(t) · i(t)',
    variables: [
      { symbol: 'p(t)', definition: 'instantaneous power', unit: 'W' },
      { symbol: 'v(t)', definition: 'pack voltage at that sample', unit: 'V' },
      { symbol: 'i(t)', definition: 'current at that sample (+ = discharging)', unit: 'A' },
    ],
    assumptions: [
      'Voltage and current are sampled at the same instant, which they are: both come from one ThingSpeak feed.',
      'Steady-state DC, so the simple product is the whole answer.',
    ],
    limitations: [
      'Null when either voltage or current is missing - it is never assumed to be zero.',
      'The sign follows the firmware convention, so a reversed shunt would invert it.',
    ],
    implementation: 'mapFeed (lib/telemetry/parse.ts)',
  },

  averagePower: {
    id: 'averagePower',
    title: 'Average real power',
    meaning:
      'The mean rate of energy transfer across the sampled window. For DC this is simply the mean of the instantaneous products; the familiar AC form uses the cosine of the phase angle, which does not apply here.',
    formula: 'P = (1/N) Σ p_i   (equivalent to (1/T) ∫ p(t) dt for sampled data)',
    variables: [
      { symbol: 'P', definition: 'average real power', unit: 'W' },
      { symbol: 'p_i', definition: 'instantaneous power at sample i', unit: 'W' },
      { symbol: 'N', definition: 'number of finite samples' },
    ],
    assumptions: [
      'All samples are weighted equally, which holds for a regular 15 s cadence.',
      'Samples with no power value are excluded, not counted as zero.',
    ],
    limitations: [
      'An unweighted mean drifts if the sampling interval is irregular.',
      'Mixing charging and discharging cancels out, so pair this with the split energy figures.',
    ],
    implementation: 'summarise().mean (lib/electrical/stats.ts)',
  },

  energy: {
    id: 'energy',
    title: 'Energy',
    meaning:
      'Accumulated energy over the window, obtained by integrating power over time. Discharge and charge are accumulated separately because their sum would otherwise cancel misleadingly.',
    formula: 'E = ∫ p(t) dt ≈ Σ ((p_k + p_{k+1}) / 2) · Δt',
    variables: [
      { symbol: 'E', definition: 'energy', unit: 'Wh' },
      { symbol: 'p_k', definition: 'power at sample k', unit: 'W' },
      { symbol: 'Δt', definition: 'real time between samples k and k+1', unit: 's' },
    ],
    assumptions: [
      'Power is assumed to vary linearly between samples (trapezoidal rule).',
      'Real timestamps are used, not an assumed fixed interval.',
    ],
    limitations: [
      'A segment longer than 600 s is treated as missing time and skipped, so an outage is never integrated as if the pack held that power.',
      'Because ThingSpeak returns only the most recent feeds, this is energy over minutes, not a lifetime total.',
    ],
    implementation: 'integrateEnergy (lib/electrical/energy.ts)',
  },

  charge: {
    id: 'charge',
    title: 'Charge throughput',
    meaning:
      'Charge moved in or out of the pack over the window, split by direction. Reported in amp-hours, the unit battery capacity is quoted in.',
    formula: 'Q = (1 / 3600) Σ ((i_k + i_{k+1}) / 2) · Δt',
    variables: [
      { symbol: 'Q', definition: 'charge', unit: 'Ah' },
      { symbol: 'i_k', definition: 'current at sample k', unit: 'A' },
      { symbol: 'Δt', definition: 'real time between samples', unit: 's' },
    ],
    assumptions: [
      'Same trapezoidal, timestamp-driven integration as energy.',
      'Sign convention: positive = discharging, so charge delivered and charge returned are split by sign.',
    ],
    limitations: [
      'Throughput is not capacity: it says how much charge moved, not how much the pack can hold.',
      'Not the same as state of charge, which the firmware reports separately.',
    ],
    implementation: 'integrateEnergy (lib/electrical/energy.ts)',
  },

  samplingLimit: {
    id: 'samplingLimit',
    title: 'Sampling limit',
    meaning:
      'The highest signal frequency this data can represent. It is the reason no frequency, harmonic or distortion figure is shown for live telemetry: the data physically cannot carry one.',
    formula: 'f_Nyquist = 1 / (2 · 15 s) ≈ 0.033 Hz',
    variables: [
      { symbol: 'f_Nyquist', definition: 'Nyquist frequency', unit: 'Hz' },
      { symbol: '15 s', definition: 'ThingSpeak sampling interval', unit: 's' },
    ],
    assumptions: [
      'The channel updates at the ThingSpeak free-tier minimum of 15 s.',
      'Sampling is treated as uniform.',
    ],
    limitations: [
      'Any content above 0.033 Hz is aliased into the record and cannot be recovered.',
      'Consequently THD, harmonics and spectral analysis are only offered for synthesised signals, where the frequency is known by construction.',
    ],
    implementation: 'POLL_INTERVAL_MS (lib/telemetry/constants.ts)',
  },

  connectionStatus: {
    id: 'connectionStatus',
    title: 'Connection status',
    meaning:
      'How fresh the data is, derived purely from the age of the newest feed rather than a network probe.',
    formula: 'LIVE if age < 90 s · STALE if age < 300 s · OFFLINE otherwise',
    variables: [
      { symbol: 'age', definition: 'now − timestamp of the newest feed', unit: 's' },
    ],
    assumptions: [
      'The device clock and the phone clock agree closely (both are NTP-synced).',
      'A transport error downgrades LIVE to STALE, since the on-screen numbers are then no longer fresh.',
    ],
    limitations: [
      'A pack that is switched off reports OFFLINE, which is correct but indistinguishable from a network problem.',
      'A future-dated timestamp is treated as LIVE rather than a negative age.',
    ],
    implementation: 'computeStatus (lib/telemetry/rules.ts)',
  },
} as const satisfies Record<string, FormulaDoc>;

export type FormulaId = keyof typeof FORMULAS;

export function formulaFor(id: FormulaId): FormulaDoc {
  return FORMULAS[id];
}
