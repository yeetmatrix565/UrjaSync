'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Telemetry } from '@/lib/telemetry/types';

export interface LerpValues {
  packV: number;
  cells: [number, number, number];
  tempC: number;
  currentA: number;
  powerW: number;
  soc: number;
  soh: number;
  imbalanceV: number;
}

function blank(): LerpValues {
  return {
    packV: NaN,
    cells: [NaN, NaN, NaN],
    tempC: NaN,
    currentA: NaN,
    powerW: NaN,
    soc: NaN,
    soh: NaN,
    imbalanceV: NaN,
  };
}

function toValues(t: Telemetry | null): LerpValues {
  if (!t) return blank();
  return {
    packV: t.packV,
    cells: [t.cells[0], t.cells[1], t.cells[2]],
    tempC: t.tempC,
    currentA: t.currentA,
    powerW: t.powerW,
    soc: t.soc,
    soh: t.soh,
    imbalanceV: t.imbalanceV,
  };
}

/** NaN target means "no data" -> keep showing an em dash. */
function approach(cur: number, tgt: number, k: number): number {
  if (!Number.isFinite(tgt)) return NaN;
  if (!Number.isFinite(cur)) return tgt;
  return cur + (tgt - cur) * k;
}

function clone(v: LerpValues): LerpValues {
  return { ...v, cells: [v.cells[0], v.cells[1], v.cells[2]] };
}

const SPEED = 6;
const SNAPSHOT_MS = 0.12;

export interface UseTelemetryLerpResult {
  valuesRef: MutableRefObject<LerpValues>;
  snapshot: LerpValues;
}

/**
 * Smoothly interpolates displayed telemetry toward the latest target so the UI
 * feels live between polls. Writes into a ref for the 3D scene (no per-frame
 * React work) and emits a low-frequency snapshot for 2D readouts. Snaps
 * instantly when reduced motion is requested.
 */
export function useTelemetryLerp(
  target: Telemetry | null,
  reducedMotion: boolean,
): UseTelemetryLerpResult {
  const valuesRef = useRef<LerpValues>(blank());
  const targetRef = useRef<LerpValues>(blank());
  const [snapshot, setSnapshot] = useState<LerpValues>(() => blank());

  useEffect(() => {
    targetRef.current = toValues(target);
  }, [target]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = SNAPSHOT_MS;

    const tick = (now: number): void => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;

      const tgt = targetRef.current;
      const cur = valuesRef.current;
      const k = reducedMotion ? 1 : Math.min(1, SPEED * dt);

      cur.packV = approach(cur.packV, tgt.packV, k);
      cur.tempC = approach(cur.tempC, tgt.tempC, k);
      cur.currentA = approach(cur.currentA, tgt.currentA, k);
      cur.powerW = approach(cur.powerW, tgt.powerW, k);
      cur.soc = approach(cur.soc, tgt.soc, k);
      cur.soh = approach(cur.soh, tgt.soh, k);
      cur.imbalanceV = approach(cur.imbalanceV, tgt.imbalanceV, k);
      cur.cells = [
        approach(cur.cells[0], tgt.cells[0], k),
        approach(cur.cells[1], tgt.cells[1], k),
        approach(cur.cells[2], tgt.cells[2], k),
      ];

      acc += dt;
      if (acc >= SNAPSHOT_MS) {
        acc = 0;
        setSnapshot(clone(cur));
      }

      raf = requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = (): void => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = (): void => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reducedMotion]);

  return { valuesRef, snapshot };
}
