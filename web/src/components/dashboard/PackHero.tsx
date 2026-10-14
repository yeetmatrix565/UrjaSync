'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/icons';
import { LazyBatteryScene } from '@/components/three/LazyBatteryScene';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';

/**
 * Compact version of the pack scene for the dashboard.
 *
 * Deliberately not a link: the canvas handles its own pointer events, so an
 * explicit button opens the full Pack Explorer instead of making the whole hero
 * clickable and swallowing cell taps. The 3D scene itself is untouched — only
 * its frame (rounded glass border, labelled region) lives here.
 */
export function PackHero() {
  const { valuesRef, latest, metrics, reducedMotion } = useTelemetryContext();

  const cellCount = metrics.cells.length;
  const alerts = latest?.alerts ?? [];

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-glass"
      aria-label={`Battery pack 3D view, ${cellCount} ${cellCount === 1 ? 'cell' : 'cells'}`}
    >
      <div className="h-[26vh] min-h-[190px] sm:h-[30vh] sm:min-h-[220px]">
        <LazyBatteryScene
          valuesRef={valuesRef}
          alerts={alerts}
          cellCount={cellCount}
          selectedCell={null}
          onSelectCell={() => undefined}
          reducedMotion={reducedMotion}
          heightClass="h-full"
        />
      </div>

      <Link
        href="/pack"
        className="focus-ring absolute bottom-3 right-3 flex min-h-9 items-center gap-1 rounded-full border border-white/15 bg-black/55 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-white/85 backdrop-blur transition hover:border-cyan-300/40 hover:text-cyan-200 active:scale-95"
      >
        explore pack
        <ChevronRightIcon className="h-3 w-3" />
      </Link>
    </section>
  );
}
