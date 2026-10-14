import type { ChannelCredentials } from './types';

/** Dispatched by the native shell (and by us) when credentials change. */
export const CONFIG_CHANGED_EVENT = 'urja:config-changed';

/**
 * The Kotlin object exposed through `addJavascriptInterface(bridge, "UrjaApp")`.
 * Only these two methods exist; anything else the page needs it already has.
 */
interface UrjaNativeBridge {
  /** JSON string, e.g. `{"channelId":"123","readApiKey":"abc"}`, or `""`. */
  getConfig(): string;
  openSettings(): void;
}

declare global {
  interface Window {
    UrjaApp?: UrjaNativeBridge;
  }
}

/**
 * True once we are mounted inside the Android shell. Client-only and never
 * window-safe on the server, so callers must gate rendering on mount to avoid a
 * hydration mismatch against the prerendered HTML.
 */
export function isNativeShell(): boolean {
  return typeof window !== 'undefined' && typeof window.UrjaApp?.getConfig === 'function';
}

/** Credentials entered in the native settings screen; null when unset or in a browser. */
export function readCredentials(): ChannelCredentials | null {
  if (!isNativeShell()) return null;

  try {
    const raw = window.UrjaApp?.getConfig() ?? '';
    if (raw.length === 0) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { channelId, readApiKey } = parsed as Record<string, unknown>;
    if (typeof channelId !== 'string' || typeof readApiKey !== 'string') return null;

    const trimmedChannel = channelId.trim();
    const trimmedKey = readApiKey.trim();
    if (trimmedChannel.length === 0 || trimmedKey.length === 0) return null;

    return { channelId: trimmedChannel, readApiKey: trimmedKey };
  } catch {
    return null;
  }
}

/** Opens the native settings screen; a no-op in a browser. */
export function openSettings(): void {
  if (typeof window === 'undefined') return;
  window.UrjaApp?.openSettings();
}
