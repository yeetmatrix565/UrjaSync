export function fmt(
  v: number | null | undefined,
  digits = 2,
  fallback = '\u2014',
): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return fallback;
  return v.toFixed(digits);
}

export function fmtInt(v: number | null | undefined, fallback = '\u2014'): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return fallback;
  return Math.round(v).toString();
}

export function localTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function relTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '\u2014';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
