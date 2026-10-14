'use client';

import type { Alert } from '@/lib/telemetry/types';
import { cx } from '@/lib/format';

export interface AlertBannerProps {
  alerts: Alert[];
  visible: boolean;
  onDismiss: () => void;
}

export function AlertBanner({ alerts, visible, onDismiss }: AlertBannerProps) {
  if (!visible || alerts.length === 0) return null;

  const critical = alerts.some((a) => a.severity === 'critical');

  return (
    <div
      role="alert"
      className={cx(
        // No bottom margin: the dashboard <main> spaces children with space-y-4.
        'glass border-l-4 p-3.5 motion-reduce:animate-none animate-slideDown sm:p-4',
        critical
          ? 'border-l-brand-red bg-brand-red/[0.06] shadow-glowRed'
          : 'border-l-brand-amber bg-brand-amber/[0.05]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cx(
              'mt-1 h-2 w-2 shrink-0 rounded-full',
              critical
                ? 'bg-brand-red animate-pulseSoft motion-reduce:animate-none'
                : 'bg-brand-amber',
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p
              className={cx(
                'font-mono text-[11px] font-semibold uppercase tracking-[0.2em]',
                critical ? 'text-red-100' : 'text-amber-100',
              )}
            >
              {alerts.length} active alert{alerts.length > 1 ? 's' : ''}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {alerts.map((a) => (
                <li
                  key={a.code}
                  className={cx(
                    'num font-mono text-[11px] leading-relaxed',
                    a.severity === 'critical' ? 'text-red-100' : 'text-amber-100',
                  )}
                >
                  {a.message}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alerts"
          className="focus-ring min-h-8 shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:text-white active:scale-95"
        >
          dismiss
        </button>
      </div>
    </div>
  );
}
