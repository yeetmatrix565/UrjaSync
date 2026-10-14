'use client';

import { useState } from 'react';
import { CellStrip } from '@/components/dashboard/CellStrip';
import { useTelemetryContext } from '@/components/providers/TelemetryProvider';
import { LazyBatteryScene } from '@/components/three/LazyBatteryScene';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatRow } from '@/components/ui/StatRow';
import { fmt } from '@/lib/format';

/**
 * Full-screen pack view. Tapping a cell in the strip eases the camera to that
 * cell, which is what the strip on the dashboard deliberately does not do.
 */
export default function PackPage() {
  const { valuesRef, metrics, snapshot, alerts, reducedMotion } = useTelemetryContext();
  const [selected, setSelected] = useState<number | null>(null);

  const cellCount = metrics.cells.length;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6"
    >
      <PageHeader
        title="Pack explorer"
        subtitle={`${cellCount} ${cellCount === 1 ? 'cell' : 'cells'} · drag to orbit, pinch to zoom, tap a cell`}
        source="LIVE"
      />

      <section className="mt-5">
        <LazyBatteryScene
          valuesRef={valuesRef}
          alerts={alerts}
          cellCount={cellCount}
          selectedCell={selected}
          onSelectCell={setSelected}
          reducedMotion={reducedMotion}
          heightClass="h-[52vh] min-h-[320px]"
        />
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="label-xs">Cells</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            tap to focus in 3D
          </span>
        </div>
        <CellStrip
          cells={snapshot.cells}
          alerts={alerts}
          selected={selected}
          onSelect={setSelected}
        />
      </section>

      <section className="glass mt-5 p-4 sm:p-5">
        <h2 className="label-xs mb-1">Build</h2>
        <StatRow label="cells detected" value={String(cellCount)} />
        <StatRow label="pack voltage" value={fmt(snapshot.packV, 3)} unit="V" />
        <StatRow label="cell imbalance" value={fmt(snapshot.imbalanceV, 3)} unit="V" />
        {metrics.cells.map((cell, index) => (
          <StatRow
            key={index}
            label={`C${index + 1} now`}
            value={fmt(cell.values[cell.values.length - 1] ?? null, 3)}
            unit="V"
            hint={`range ${fmt(cell.summary.min, 3)} – ${fmt(cell.summary.max, 3)}`}
          />
        ))}
      </section>

      {cellCount === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="no cells to display"
            detail="The scene still renders the enclosure, but this channel publishes no individual cell voltages."
          />
        </div>
      ) : null}
    </main>
  );
}
