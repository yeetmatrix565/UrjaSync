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

const FIELDS: Record<FieldKey, string> = {
  field1: 'Pack Voltage (V)',
  field2: 'Cell 1 (V)',
  field3: 'Cell 2 (V)',
  field4: 'Cell 3 (V)',
  field5: 'Temperature (C)',
  field6: 'Current (A)',
  field7: 'SOC (%)',
  field8: 'SOH (%)',
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

function buildMalformed(): RawFeed[] {
  const feeds = buildNormal();
  for (let i = 0; i < feeds.length; i++) {
    const f = feeds[i]!;
    if (i % 3 === 0) f.field2 = null;
    if (i % 3 === 1) f.field5 = 'abc';
    if (i % 3 === 2) {
      f.field1 = null;
      f.field7 = '';
    }
  }
  return feeds;
}

function wrap(feeds: RawFeed[]): RawChannel {
  return {
    channel: { id: 0, name: 'Urja Sync (demo)', ...FIELDS },
    feeds,
  };
}

/**
 * Produces a raw, ThingSpeak-shaped payload (fields as strings / null) so demo
 * data travels through the exact same zod parser as live data.
 */
export function buildMockRaw(scenario: Scenario = 'normal'): unknown {
  switch (scenario) {
    case 'empty':
      return wrap([]);
    case 'malformed':
      return wrap(buildMalformed());
    case 'stale':
      return wrap(buildNormal(150_000));
    case 'alert':
      return wrap(buildAlert());
    case 'normal':
    default:
      return wrap(buildNormal());
  }
}
