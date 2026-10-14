import { DEFAULT_FIELD_MAPPING, MAX_FIELD_NUMBER } from './constants';
import type { FieldMapping, TempUnit } from './types';

/**
 * Works out which ThingSpeak field carries which metric from the channel's own
 * field labels, so the app is not tied to one firmware's field order.
 *
 * Real-world labels are free text in any language and carry units:
 *   'Pack Voltage (V)', 'Cell 1 (V)', 'Temperatura (\u00b0C)', 'Anzahl Pulse'
 * Unused fields come through as empty strings.
 */

export type FieldLabels = string[];

/** Pulls `channel.field1..field8` out of a raw payload; missing => ''. */
export function extractFieldLabels(raw: unknown): FieldLabels {
  const channel = (raw as { channel?: unknown } | null)?.channel;
  const record =
    typeof channel === 'object' && channel !== null
      ? (channel as Record<string, unknown>)
      : {};

  const labels: FieldLabels = [];
  for (let n = 1; n <= MAX_FIELD_NUMBER; n++) {
    const value = record[`field${n}`];
    labels.push(typeof value === 'string' ? value : '');
  }
  return labels;
}

const UNIT_PATTERN = /[[(][^)\]]*[)\]]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
// Tested against the raw label, so units inside brackets survive - hence the
// case-insensitive flags, since 'Temperature (F)' is not lowercase.
const FAHRENHEIT = /\bf\b|fahrenheit/i;
const CELSIUS = /\bc\b|celsius|centigrade/i;

function normalise(label: string): string {
  return label
    .toLowerCase()
    .replace(UNIT_PATTERN, ' ')
    .replace(NON_ALPHANUMERIC, ' ')
    .trim();
}

type MetricKey = 'soh' | 'soc' | 'tempC' | 'currentA' | 'packV';

/** Ordered most-specific first: 'state of health' must win over 'health'. */
const METRIC_RULES: Array<{ key: MetricKey; test: RegExp }> = [
  { key: 'soh', test: /\bsoh\b|state of health|battery health/ },
  { key: 'soc', test: /\bsoc\b|state of charge|battery level|charge level/ },
  {
    key: 'tempC',
    test: /\btemp\b|temperature|temperatur|temperatura|thermistor|\bntc\b/,
  },
  { key: 'currentA', test: /\bcurrent\b|\bamps?\b|ampere|amperage/ },
  { key: 'packV', test: /\bpack\b|\btotal\b|battery voltage|\bvbat\b|pack voltage/ },
];

const CELL_PATTERNS = [/\bcell\s*(\d+)\b/, /\bc\s*(\d+)\b/, /\bv\s*(\d+)\b/];

function detectCellIndex(normalised: string): number | null {
  for (const pattern of CELL_PATTERNS) {
    const match = pattern.exec(normalised);
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

function detectTempUnit(normalised: string): TempUnit {
  if (FAHRENHEIT.test(normalised) && !CELSIUS.test(normalised)) return 'F';
  return 'C';
}

function isVoltageLabel(normalised: string): boolean {
  return /\bvolt/.test(normalised) || /^v$/.test(normalised);
}

function assignedFields(mapping: FieldMapping): Set<number> {
  const used = new Set<number>(mapping.cellV);
  for (const field of [
    mapping.packV,
    mapping.tempC,
    mapping.currentA,
    mapping.soc,
    mapping.soh,
  ]) {
    if (field !== undefined) used.add(field);
  }
  return used;
}

/** Heuristic mapping; falls back to the reference firmware layout. */
export function detectMapping(labels: FieldLabels): FieldMapping {
  const mapping: FieldMapping = { cellV: [], tempUnit: 'C' };
  const cellCandidates: Array<{ index: number; field: number }> = [];

  labels.forEach((label, i) => {
    const field = i + 1;
    const text = normalise(label);
    if (text.length === 0) return;

    const cellIndex = detectCellIndex(text);
    if (cellIndex !== null) {
      cellCandidates.push({ index: cellIndex, field });
      return;
    }

    const rule = METRIC_RULES.find(
      (candidate) => mapping[candidate.key] === undefined && candidate.test.test(text),
    );
    if (!rule) return;

    mapping[rule.key] = field;
    if (rule.key === 'tempC') mapping.tempUnit = detectTempUnit(label);
  });

  if (cellCandidates.length > 0) {
    cellCandidates.sort((a, b) => a.index - b.index || a.field - b.field);
    mapping.cellV = cellCandidates.map((candidate) => candidate.field);
  }

  // A remaining voltage-ish label is the pack total.
  if (mapping.packV === undefined) {
    const used = assignedFields(mapping);
    const index = labels.findIndex(
      (label, i) => !used.has(i + 1) && isVoltageLabel(normalise(label)),
    );
    if (index >= 0) mapping.packV = index + 1;
  }

  const detectedSomething =
    mapping.packV !== undefined ||
    mapping.cellV.length > 0 ||
    mapping.tempC !== undefined ||
    mapping.currentA !== undefined ||
    mapping.soc !== undefined ||
    mapping.soh !== undefined;

  return detectedSomething ? mapping : DEFAULT_FIELD_MAPPING;
}
