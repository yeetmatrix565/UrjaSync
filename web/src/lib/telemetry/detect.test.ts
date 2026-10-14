import { describe, expect, it } from 'vitest';
import { DEFAULT_FIELD_MAPPING } from './constants';
import { detectMapping, extractFieldLabels } from './detect';

/** Labels padded to eight fields, mirroring a real ThingSpeak channel. */
function labels(...values: string[]): string[] {
  const out = new Array<string>(8).fill('');
  values.forEach((value, i) => {
    out[i] = value;
  });
  return out;
}

const EMPTY_LABELS = new Array<string>(8).fill('');

describe('extractFieldLabels', () => {
  it('reads channel.field1..field8, treating missing fields as empty', () => {
    const raw = { channel: { field1: 'Pack Voltage', field3: 'Current' }, feeds: [] };
    expect(extractFieldLabels(raw)).toEqual([
      'Pack Voltage',
      '',
      'Current',
      '',
      '',
      '',
      '',
      '',
    ]);
  });

  it('is safe on malformed payloads', () => {
    expect(extractFieldLabels(null)).toEqual(EMPTY_LABELS);
    expect(extractFieldLabels({ channel: 'nope' })).toEqual(EMPTY_LABELS);
    expect(extractFieldLabels({ channel: { field1: 42 } })).toEqual(EMPTY_LABELS);
  });
});

describe('detectMapping', () => {
  it('maps the reference UrjaSync firmware layout', () => {
    expect(
      detectMapping(
        labels(
          'Pack Voltage (V)',
          'Cell 1 (V)',
          'Cell 2 (V)',
          'Cell 3 (V)',
          'Temperature (C)',
          'Current (A)',
          'SOC (%)',
          'SOH (%)',
        ),
      ),
    ).toEqual({
      packV: 1,
      cellV: [2, 3, 4],
      tempC: 5,
      tempUnit: 'C',
      currentA: 6,
      soc: 7,
      soh: 8,
    });
  });

  it('handles short labels (c1, v2)', () => {
    const mapping = detectMapping(labels('c1', 'c2', 'pack'));
    expect(mapping.cellV).toEqual([1, 2]);
    expect(mapping.packV).toBe(3);
  });

  it('orders cells by their declared index, not field order', () => {
    expect(detectMapping(labels('Cell 3 (V)', 'Cell 1 (V)', 'Cell 2 (V)')).cellV).toEqual(
      [2, 3, 1],
    );
  });

  it('reads a 2S pack that publishes no SOH or temperature', () => {
    const mapping = detectMapping(
      labels('Cell 1 Voltage (V)', 'Cell 2 Voltage (V)', 'Current (A)'),
    );
    expect(mapping.cellV).toEqual([1, 2]);
    expect(mapping.currentA).toBe(3);
    expect(mapping.soh).toBeUndefined();
    expect(mapping.tempC).toBeUndefined();
  });

  it('detects Fahrenheit', () => {
    expect(detectMapping(labels('Temperature (F)')).tempUnit).toBe('F');
    expect(detectMapping(labels('Temperature (C)')).tempUnit).toBe('C');
  });

  it('copes with non-English labels', () => {
    expect(detectMapping(labels('Temperatura (\u00b0C)')).tempC).toBe(1);
  });

  it('falls back to the reference layout when nothing is recognisable', () => {
    expect(detectMapping(EMPTY_LABELS)).toEqual(DEFAULT_FIELD_MAPPING);
    expect(detectMapping(labels('Anzahl Pulse', 'Pulsdauer [ms]'))).toEqual(
      DEFAULT_FIELD_MAPPING,
    );
    expect(detectMapping(labels('Wind Speed', 'Wind Power (Watts)'))).toEqual(
      DEFAULT_FIELD_MAPPING,
    );
  });

  it('does not assign one field to two metrics', () => {
    const mapping = detectMapping(labels('SOC (%)', 'SOC (%)'));
    expect(mapping.soc).toBe(1);
    expect(mapping.soh).toBeUndefined();
  });

  it('treats a bare voltage label as the pack total', () => {
    expect(detectMapping(labels('Cell 1 (V)', 'Voltage (V)'))).toEqual({
      cellV: [1],
      packV: 2,
      tempUnit: 'C',
    });
  });

  it('ignores empty and whitespace-only labels', () => {
    expect(detectMapping(labels('Cell 1 (V)', '   ', ''))).toEqual({
      cellV: [1],
      tempUnit: 'C',
    });
  });
});
