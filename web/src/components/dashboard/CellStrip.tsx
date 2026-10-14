'use client';

import { clamp, cx, fmt } from '@/lib/format';
import { voltColor } from '@/lib/colors';
import { VOLT_USABLE } from '@/lib/telemetry/constants';
import { alertedCellIndexes } from '@/lib/telemetry/rules';
import type { Alert, CellVoltages } from '@/lib/telemetry/types';

export interface CellStripProps {
  cells: CellVoltages;
  alerts: Alert[];
  selected: number | null;
  onSelect: (index: number | null) => void;
}

/**
 * Renders however many cells the channel publishes - a 1S pack shows one card,
 * an 8S pack shows eight - instead of assuming three.
 *
 * Layout: a wrapping flex row with a 76px minimum tile, so an 8S pack wraps
 * to two rows on a phone instead of squeezing eight unreadable columns into
 * 320px. Each tile is a toggle button with aria-pressed for its selected
 * state, and a full text label for screen readers (the dot alone is not a
 * status indicator).
 */
export function CellStrip({ cells, alerts, selected, onSelect }: CellStripProps) {
  const flagged = new Set(alertedCellIndexes(alerts));
  const span = VOLT_USABLE.max - VOLT_USABLE.min;

  if (cells.length === 0) {
    return (
      <p
        className="glass p-4 text-center font-mono text-[11px] text-white/50"
        role="status"
      >
        no cell voltages published by this channel
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Cells">
      {cells.map((v, i) => {
        const hasValue = v !== null && Number.isFinite(v);
        const pct = hasValue ? clamp((v - VOLT_USABLE.min) / span, 0, 1) * 100 : 0;
        const hasAlert = flagged.has(i);
        const isActive = selected === i;
        const color = hasAlert ? '#e5484d' : voltColor(v ?? NaN);

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(isActive ? null : i)}
            aria-pressed={isActive}
            aria-label={`Cell ${i + 1}, ${fmt(v, 2)} volts${hasAlert ? ', alert' : ''}${isActive ? ', selected' : ''}`}
            className={cx(
              'glass focus-ring flex min-w-[76px] flex-1 basis-[76px] flex-col gap-2 p-2.5 text-left transition active:scale-[0.98] sm:min-w-[92px] sm:basis-[92px] sm:p-3',
              isActive && 'border-cyan-300/50 ring-1 ring-cyan-300/30',
              hasAlert && !isActive && 'border-brand-red/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="label-xs">C{i + 1}</span>
              {hasAlert ? (
                <span
                  className="h-2 w-2 rounded-full bg-brand-red animate-pulseSoft motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
              )}
            </div>

            <span className="num font-mono text-base leading-none text-white sm:text-lg">
              {fmt(v, 2)}
              <span className="ml-0.5 text-[10px] text-white/55">V</span>
            </span>

            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              role="img"
              aria-label={`Cell ${i + 1} charge within ${VOLT_USABLE.min.toFixed(1)} to ${VOLT_USABLE.max.toFixed(1)} volts: ${Math.round(pct)} percent`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}`,
                }}
              />
            </div>

            <span className="font-mono text-[9px] text-white/45">
              {VOLT_USABLE.min.toFixed(1)}-{VOLT_USABLE.max.toFixed(1)}V
            </span>
          </button>
        );
      })}
    </div>
  );
}
