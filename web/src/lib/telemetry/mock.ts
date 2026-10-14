import type { Scenario } from './types';

interface RawFeed {
  created_at: string;
  entry_id: number;
  field1: string | null;
  field2: string | null;
  field3: string | null;
  field4: string | null;
  field5: string | null;
  field6: string | null;
  field7: string | null;
  field8: string | null;
}

type FieldKey =
  'field1' | 'field2' | 'field3' | 'field4' | 'field5' | 'field6' | 'field7' | 'field8';

interface RawChannel {
  channel: { id: number; name: string } & Partial<Record<FieldKey, string>>;
  feeds: RawFeed[];
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Channel labels exactly as the reference UrjaSync firmware sets them. */
const URJA_FIELDS: Record<FieldKey, string> = {
  field1: 'Pack Voltage (V)',
  field2: 'Cell 1 (V)',
  field3: 'Cell 2 (V)',
  field4: 'Cell 3 (V)',
  field5: 'Temperature (C)',
  field6: 'Current (A)',
  field7: 'SOC (%)',
  field8: 'SOH (%)',
};

/**
 * A bare-minimum 2S pack: two cells and a current shunt, no temperature, no SOC,
 * no SOH and no pack total. Exercises label detection, variable cell count and
 * the derived pack voltage.
 */
const BASIC_FIELDS: Partial<Record<FieldKey, string>> = {
  field1: 'Cell 1 Voltage (V)',
  field2: 'Cell 2 Voltage (V)',
  field3: 'Current (A)',
  field4: '',
  field5: '',
};

const COUNT = 100;
const STEP_MS = 15_000;

/** Stable per-feed jitter so history reads as one coherent series. */
function jitter(index: number): { a: number; b: number; c: number } {
  const r = seeded(0x9e3779b9 ^ Math.imul(index + 1, 2654435761));
  return { a: (r() - 0.5) * 0.02, b: (r() - 0.5) * 0.014, c: (r() - 0.5) * 0.022 };
}

function str(v: number, digits = 3): string {
  return v.toFixed(digits);
}

/**
 * Values are a function of each feed's absolute timestamp, so history is
 * coherent AND successive polls produce slightly different numbers - the demo
 * advances on its own rather than repeating a frozen snapshot.
 */
function buildNormal(newestAgeMs = 0): RawFeed[] {
  const now = Date.now();
  const feeds: RawFeed[] = [];

  for (let i = 0; i < COUNT; i++) {
    const ts = now - newestAgeMs - (COUNT - 1 - i) * STEP_MS;
    const tSec = ts / 1000;

    const current = 0.35 + 1.45 * Math.sin(tSec / 90);
    const soc = 77 + 8.5 * Math.sin(tSec / 600 + 0.6);
    const temp = 28.6 + 1.0 * Math.sin(tSec / 260) + 0.3 * Math.sin(tSec / 41);
    const base = 3.87 + 0.05 * Math.sin(tSec / 55 + 1.1);
    const j = jitter(i);

    const c1 = base + j.a;
    const c2 = base + j.b;
    const c3 = base + j.c;

    feeds.push({
      created_at: new Date(ts).toISOString(),
      entry_id: 1_000_000 + i,
      field1: str(c1 + c2 + c3, 2),
      field2: str(c1, 3),
      field3: str(c2, 3),
      field4: str(c3, 3),
      field5: str(temp, 1),
      field6: str(current, 3),
      field7: str(soc, 1),
      field8: str(96.4 - 0.3 * Math.sin(tSec / 900), 1),
    });
  }

  return feeds;
}

/** Two cells plus current; every other field is deliberately null. */
function buildBasic(newestAgeMs = 0): RawFeed[] {
  const now = Date.now();
  const feeds: RawFeed[] = [];

  for (let i = 0; i < COUNT; i++) {
    const ts = now - newestAgeMs - (COUNT - 1 - i) * STEP_MS;
    const tSec = ts / 1000;
    const j = jitter(i);

    feeds.push({
      created_at: new Date(ts).toISOString(),
      entry_id: 2_000_000 + i,
      field1: str(3.92 + j.a, 3),
      field2: str(3.88 + j.b, 3),
      field3: str(0.6 + 0.5 * Math.sin(tSec / 120), 3),
      field4: null,
      field5: null,
      field6: null,
      field7: null,
      field8: null,
    });
  }

  return feeds;
}

function buildAlert(): RawFeed[] {
  const feeds = buildNormal();
  const hot = (i: number): boolean => i > COUNT - 12;

  for (let i = 0; i < feeds.length; i++) {
    const f = feeds[i]!;
    if (!hot(i)) continue;
    const heat = 35.2 + (i - (COUNT - 12)) * 0.06;
    f.field5 = str(heat, 1);
    f.field2 = str(4.28, 3);
    f.field3 = str(3.9, 3);
    f.field4 = str(3.6, 3);
    f.field1 = str(4.28 + 3.9 + 3.6, 2);
  }

  return feeds;
}

/**
 * Every field unusable in every row. The parser is deliberately forgiving now,
 * so this scenario proves the "nothing readable" path rather than schema
 * rejection: the dashboard must degrade to OFFLINE instead of throwing.
 */
function buildMalformed(): RawFeed[] {
  const feeds = buildNormal();
  for (const f of feeds) {
    f.field1 = null;
    f.field2 = 'abc';
    f.field3 = '';
    f.field4 = null;
    f.field5 = 'not-a-number';
    f.field6 = null;
    f.field7 = null;
    f.field8 = null;
  }
  return feeds;
}

function wrap(feeds: RawFeed[], labels: Partial<Record<FieldKey, string>>): RawChannel {
  return {
    channel: { id: 0, name: 'Urja Sync (demo)', ...labels },
    feeds,
  };
}

/**
 * Produces a raw, ThingSpeak-shaped payload (fields as strings / null) so demo
 * data travels through the exact same zod parser and label detector as live data.
 */
export function buildMockRaw(scenario: Scenario = 'normal'): unknown {
  switch (scenario) {
    case 'empty':
      return wrap([], URJA_FIELDS);
    case 'malformed':
      return wrap(buildMalformed(), URJA_FIELDS);
    case 'stale':
      return wrap(buildNormal(150_000), URJA_FIELDS);
    case 'alert':
      return wrap(buildAlert(), URJA_FIELDS);
    case 'basic':
      return wrap(buildBasic(), BASIC_FIELDS);
    case 'normal':
    default:
      return wrap(buildNormal(), URJA_FIELDS);
  }
}
