'use client';

import { SettingsButton } from './SettingsButton';
import { StatusPill } from './StatusPill';
import type { Status } from '@/lib/telemetry/types';

export interface DashboardHeaderProps {
  status: Status;
  agoLabel: string;
  isDemo: boolean;
  connected: boolean;
  loading: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({
  status,
  agoLabel,
  isDemo,
  connected,
  loading,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold uppercase tracking-[0.22em] text-white sm:text-lg">
          Urja<span className="ml-1 text-cyan-300">Sync</span>
        </h1>
        {isDemo ? (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-200">
            demo
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <StatusPill
          status={status}
          agoLabel={agoLabel}
          onRefresh={onRefresh}
          loading={loading}
        />
        <SettingsButton connected={connected} />
      </div>
    </header>
  );
}
