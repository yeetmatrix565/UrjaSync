'use client';

import { useEffect, useState } from 'react';
import { isNativeShell, openSettings } from '@/lib/telemetry/bridge';

/**
 * Shown instead of the card grid until a ThingSpeak channel is connected.
 *
 * The app has no fallback to synthetic data, so without a channel there is
 * genuinely nothing to display - this says so, and says what to do about it,
 * rather than leaving an empty screen or inventing readings.
 */
export function ConnectPrompt() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Client-only check, so the prerendered HTML stays identical (no mismatch).
  const native = mounted && isNativeShell();

  return (
    <section className="glass p-3.5">
      <p className="label-xs">No channel connected</p>

      <p className="mt-2 text-[11px] leading-relaxed text-white/55">
        The app reads your own ThingSpeak channel directly. Until one is connected it has
        nothing to show - and it invents nothing in the meantime.
      </p>

      <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-white/50">
        <li>
          On thingspeak.com open your channel, then{' '}
          <span className="text-white/70">Channel Settings &#8594; API Keys</span>.
        </li>
        <li>
          Copy the <span className="text-white/70">Channel ID</span> and the channel&rsquo;s{' '}
          <span className="text-white/70">Read</span> API key.
        </li>
        <li>Enter both below - the dashboard switches to live data on its next poll.</li>
      </ol>

      {native ? (
        <button
          type="button"
          onClick={openSettings}
          className="mt-3 w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-300/15 active:scale-[0.99]"
        >
          Connect channel
        </button>
      ) : (
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-white/35">
          Credentials are entered in the phone app, on the settings screen behind the gear
          icon. A browser has no access to them, so this page stays empty by design.
        </p>
      )}
    </section>
  );
}
