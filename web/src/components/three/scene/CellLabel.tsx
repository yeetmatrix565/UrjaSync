'use client';

import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { fmt } from '@/lib/format';
import { cellLabel } from '@/lib/three/createPackScene';
import type { LerpValues } from '@/hooks/useTelemetryLerp';

interface CellLabelProps {
  index: number;
  valuesRef: MutableRefObject<LerpValues>;
  position: [number, number, number];
}

/**
 * Holographic voltage readout above a cell. Written straight to the DOM node in
 * useFrame so a live value never triggers a React render.
 */
export function CellLabel({ index, valuesRef, position }: CellLabelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = `${cellLabel(index)} ${fmt(valuesRef.current.cells[index], 2)}V`;
  });

  return (
    <Html
      position={position}
      center
      distanceFactor={7}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={ref}
        className="whitespace-nowrap rounded-md border border-cyan-300/25 bg-black/45 px-2 py-0.5 font-mono text-[11px] tracking-wider text-cyan-100 shadow-glowCyan backdrop-blur-sm"
      >
        {cellLabel(index)} {'\u2014'}V
      </div>
    </Html>
  );
}
