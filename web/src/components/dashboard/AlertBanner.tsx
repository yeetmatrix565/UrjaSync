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
        'animate-slideDown glass mb-3 border-l-2 p-3',
        critical ? 'border-l-brand-red shadow-glowRed' : 'border-l-brand-amber',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span
            className={cx(
              'mt-0.5 h-2 w-2 shrink-0 rounded-full',
              critical ? 'bg-brand-red animate-pulseSoft' : 'bg-brand-amber',
            )}
          />
          <div>
            <p
              className={cx(
                'font-mono text-[11px] font-medium uppercase tracking-[0.2em]',
                critical ? 'text-brand-red' : 'text-brand-amber',
              )}
            >
              {alerts.length} active alert{alerts.length > 1 ? 's' : ''}
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {alerts.map((a) => (
                <li
                  key={a.code}
                  className={cx(
                    'num font-mono text-[11px]',
                    a.severity === 'critical' ? 'text-red-200' : 'text-amber-200',
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
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/50 transition hover:text-white/80"
        >
          dismiss
        </button>
      </div>
    </div>
  );
}
