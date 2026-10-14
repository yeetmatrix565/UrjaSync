'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { cx } from '@/lib/format';
import type { Alert } from '@/lib/telemetry/types';
import { cellAlertFlags } from '@/lib/telemetry/rules';
import type { LerpValues } from '@/hooks/useTelemetryLerp';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import { Pack } from './scene/Pack';

export interface BatterySceneProps {
  valuesRef: MutableRefObject<LerpValues>;
  alerts: Alert[];
  /** Number of cells the channel publishes; 0 renders an empty enclosure. */
  cellCount: number;
  selectedCell: number | null;
  onSelectCell: (index: number | null) => void;
  reducedMotion: boolean;
  /** Height utilities, so the same scene serves as a hero or a full screen. */
  heightClass?: string;
}

const CONTAINER_BASE =
  'relative w-full overflow-hidden rounded-3xl border border-white/10 bg-base';

const DEFAULT_HEIGHT = 'h-[45vh] min-h-[290px]';

const MOBILE_WIDTH_PX = 640;

/** Cheaper DPR on phones; both stay within the mobile GPU budget. */
const DPR_MOBILE = 1.5;
const DPR_DESKTOP = 2;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') ?? canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

function GradientFallback({ note }: { note: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.16),transparent_60%),radial-gradient(circle_at_50%_100%,rgba(139,92,246,0.14),transparent_55%)] text-center">
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-200/70">
        The Pack
      </span>
      <span className="max-w-[22ch] font-mono text-[11px] text-white/40">{note}</span>
    </div>
  );
}

/**
 * Canvas lifecycle only: DPR cap, render-loop pausing when hidden/off-screen,
 * WebGL detection + gradient fallback. The scene itself lives in `scene/Pack`,
 * so the dashboard keeps working even if 3D never starts.
 */
export default function BatteryScene({
  valuesRef,
  alerts,
  cellCount,
  selectedCell,
  onSelectCell,
  reducedMotion,
  heightClass,
}: BatterySceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerClass = cx(CONTAINER_BASE, heightClass ?? DEFAULT_HEIGHT);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    setWebgl(detectWebGL());
    const onResize = (): void => setIsSmall(window.innerWidth < MOBILE_WIDTH_PX);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = (): void => setVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const cellAlerts = useMemo(
    () => cellAlertFlags(alerts, cellCount),
    [alerts, cellCount],
  );
  const active = inView && visible;

  if (webgl === false) {
    return (
      <div ref={containerRef} className={containerClass}>
        <GradientFallback note="WebGL unavailable - telemetry panels below stay live." />
      </div>
    );
  }

  if (webgl === null) {
    return <div ref={containerRef} className={cx(containerClass, 'animate-pulse')} />;
  }

  return (
    <div ref={containerRef} className={containerClass} style={{ touchAction: 'pan-y' }}>
      <SceneErrorBoundary
        fallback={
          <GradientFallback note="3D renderer failed to start - telemetry panels below stay live." />
        }
      >
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={[1, isSmall ? DPR_MOBILE : DPR_DESKTOP]}
          // Adaptive quality: if the GPU cannot hold the frame rate, R3F
          // lowers the DPR toward 0.5 instead of dropping frames.
          performance={{ min: 0.5, max: 1, debounce: 200 }}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
          camera={{ position: [0, 1.7, 6.6], fov: 40, near: 0.1, far: 60 }}
          onPointerMissed={() => onSelectCell(null)}
        >
          <Pack
            valuesRef={valuesRef}
            cellAlerts={cellAlerts}
            cellCount={cellCount}
            anyAlert={alerts.length > 0}
            selectedCell={selectedCell}
            onSelectCell={onSelectCell}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </SceneErrorBoundary>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-base to-transparent" />
      {!active && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/45">
          paused
        </div>
      )}
    </div>
  );
}
