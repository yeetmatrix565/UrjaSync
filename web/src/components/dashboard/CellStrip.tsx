'use client';

import { clamp, cx, fmt } from '@/lib/format';
import { voltColor } from '@/lib/colors';
import { VOLT_USABLE } from '@/lib/telemetry/constants';
import { alertedCellIndexes } from '@/lib/telemetry/rules';
import type { Alert } from '@/lib/telemetry/types';

export interface CellStripProps {
  cells: [number, number, number];
  alerts: Alert[];
  selected: number | null;
  onSelect: (index: number | null) => void;
}

export function CellStrip({ cells, alerts, selected, onSelect }: CellStripProps) {
  const flagged = new Set(alertedCellIndexes(alerts));
  const span = VOLT_USABLE.max - VOLT_USABLE.min;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cells.map((v, i) => {
        const pct = Number.isFinite(v)
          ? clamp((v - VOLT_USABLE.min) / span, 0, 1) * 100
          : 0;
        const hasAlert = flagged.has(i);
        const isActive = selected === i;
        const color = hasAlert ? '#e5484d' : voltColor(v);

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(isActive ? null : i)}
            className={cx(
              'glass flex flex-col gap-2 p-3 text-left transition active:scale-[0.98]',
              isActive && 'border-cyan-300/50 ring-1 ring-cyan-300/30',
              hasAlert && !isActive && 'border-brand-red/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="label-xs">C{i + 1}</span>
              {hasAlert ? (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-red animate-pulseSoft" />
              ) : (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
            </div>

            <span className="num font-mono text-lg leading-none text-white">
              {fmt(v, 2)}
              <span className="ml-0.5 text-[10px] text-white/40">V</span>
            </span>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}`,
                }}
              />
            </div>

            <span className="font-mono text-[9px] text-white/30">
              {VOLT_USABLE.min.toFixed(1)}-{VOLT_USABLE.max.toFixed(1)}V
            </span>
          </button>
        );
      })}
    </div>
  );
}
