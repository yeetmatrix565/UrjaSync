'use client';

import dynamic from 'next/dynamic';

/**
 * Three.js is lazy-loaded so the dashboard, the detail screens and the waveform
 * laboratory never pay to parse it - only screens that actually show the pack do.
 */
export const LazyBatteryScene = dynamic(() => import('./BatteryScene'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-3xl border border-white/10 bg-white/5" />
  ),
});
