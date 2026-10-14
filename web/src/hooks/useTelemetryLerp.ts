'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { CellVoltages, Telemetry } from '@/lib/telemetry/types';

/**
 * Mirrors Telemetry but keeps "not published" distinguishable from zero. The 3D
 * scene reads this ref directly; the 2D panels consume the low-frequency snapshot.
 */
export interface LerpValues {
  packV: number | null;
  cells: CellVoltages;
  tempC: number | null;
  currentA: number | null;
  powerW: number | null;
  soc: number | null;
  soh: number | null;
  imbalanceV: number | null;
}

function blank(): LerpValues {
  return {
    packV: null,
    cells: [],
    tempC: null,
    currentA: null,
    powerW: null,
    soc: null,
    soh: null,
    imbalanceV: null,
  };
}

function toValues(t: Telemetry | null): LerpValues {
  if (!t) return blank();
  return {
    packV: t.packV,
    cells: [...t.cells],
    tempC: t.tempC,
    currentA: t.currentA,
    powerW: t.powerW,
    soc: t.soc,
    soh: t.soh,
    imbalanceV: t.imbalanceV,
  };
}

/** A null target means "not published" and keeps the dash on screen. */
function approach(cur: number | null, tgt: number | null, k: number): number | null {
  if (tgt === null || !Number.isFinite(tgt)) return null;
  if (cur === null || !Number.isFinite(cur)) return tgt;
  return cur + (tgt - cur) * k;
}

/** Cell counts only change when the mapping does, so snapping is fine there. */
function approachCells(cur: CellVoltages, tgt: CellVoltages, k: number): CellVoltages {
  if (cur.length !== tgt.length) return [...tgt];
  return tgt.map((target, i) => approach(cur[i] ?? null, target, k));
}

function clone(v: LerpValues): LerpValues {
  return { ...v, cells: [...v.cells] };
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
      cur.cells = approachCells(cur.cells, tgt.cells, k);

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
