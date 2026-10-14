'use client';

import { useEffect, useState } from 'react';
import { isNativeShell, openSettings } from '@/lib/telemetry/bridge';
import { cx } from '@/lib/format';

/**
 * Opens the native settings screen where the ThingSpeak channel and read key
 * are entered. Renders nothing in a browser, and nothing during the first
 * client render so the prerendered HTML still matches (no hydration mismatch).
 */
export function SettingsButton({ connected }: { connected: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !isNativeShell()) return null;

  return (
    <button
      type="button"
      onClick={openSettings}
      aria-label="ThingSpeak channel settings"
      title={connected ? 'ThingSpeak settings' : 'Connect a ThingSpeak channel'}
      className={cx(
        'grid h-7 w-7 place-items-center rounded-full border bg-white/5 transition',
        'hover:border-cyan-300/40 hover:text-cyan-200 active:scale-95',
        connected
          ? 'border-white/10 text-white/60'
          : 'border-amber-300/40 text-amber-200',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="3" strokeLinecap="round" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H8a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
