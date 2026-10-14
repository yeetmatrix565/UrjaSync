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
    <section className="glass p-4 sm:p-5" aria-labelledby="connect-heading">
      <h2 id="connect-heading" className="label-xs">
        No channel connected
      </h2>

      <p className="mt-2.5 text-[13px] leading-relaxed text-white/70">
        The app reads your own ThingSpeak channel directly. Until one is connected it has
        nothing to show - and it invents nothing in the meantime.
      </p>

      <ol className="mt-3.5 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-white/65">
        <li>
          On thingspeak.com open your channel, then{' '}
          <span className="text-white/85">Channel Settings &#8594; API Keys</span>.
        </li>
        <li>
          Copy the <span className="text-white/85">Channel ID</span> and the
          channel&rsquo;s <span className="text-white/85">Read</span> API key.
        </li>
        <li>Enter both below - the dashboard switches to live data on its next poll.</li>
      </ol>

      {native ? (
        <button
          type="button"
          onClick={openSettings}
          className="focus-ring mt-4 min-h-11 w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-3 font-mono text-[11px] font-medium uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-300/15 active:scale-[0.99]"
        >
          Connect channel
        </button>
      ) : (
        <p className="mt-4 font-mono text-[11px] leading-relaxed text-white/50">
          Credentials are entered in the phone app, on the settings screen behind the gear
          icon. A browser has no access to them, so this page stays empty by design.
        </p>
      )}
    </section>
  );
}
