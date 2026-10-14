'use client';

import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { cx, fmt } from '@/lib/format';
import { cellLabel } from '@/lib/three/createPackScene';
import type { LerpValues } from '@/hooks/useTelemetryLerp';

interface CellLabelProps {
  index: number;
  valuesRef: MutableRefObject<LerpValues>;
  position: [number, number, number];
  /** The focused cell gets a brighter chip so it reads at a glance. */
  selected?: boolean;
}

/**
 * Holographic voltage readout above a cell. Written straight to the DOM node in
 * useFrame so a live value never triggers a React render — and only when the
 * formatted string actually changed, so a steady voltage costs no DOM writes.
 *
 * Kept deliberately small (10px, tight padding, slight scale-down via
 * distanceFactor) so the chips stay legible without overlapping on an 8-cell
 * pack: adjacent cells sit ~0.78 world units apart.
 */
export function CellLabel({
  index,
  valuesRef,
  position,
  selected = false,
}: CellLabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastText = useRef<string>('');

  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const text = `${cellLabel(index)} ${fmt(valuesRef.current.cells[index], 2)}V`;
    if (text !== lastText.current) {
      lastText.current = text;
      el.textContent = text;
    }
  });

  return (
    <Html
      position={position}
      center
      distanceFactor={6}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={ref}
        className={cx(
          'whitespace-nowrap rounded-md border bg-black/45 px-1.5 py-0.5 font-mono text-[10px] tracking-wider shadow-glowCyan backdrop-blur-sm',
          selected
            ? 'border-cyan-300/70 text-cyan-50'
            : 'border-cyan-300/25 text-cyan-100',
        )}
      >
        {cellLabel(index)} {'\u2014'}V
      </div>
    </Html>
  );
}
