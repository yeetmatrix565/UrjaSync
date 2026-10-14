'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[urja-sync] dashboard render failed', error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="glass max-w-sm p-6 text-center">
        <h1 className="font-mono text-sm uppercase tracking-[0.3em] text-brand-red">
          Urja Sync
        </h1>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-white/50">
          Something went wrong rendering the dashboard.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 transition hover:border-cyan-300/40 hover:text-cyan-200"
        >
          retry
        </button>
      </div>
    </main>
  );
}
