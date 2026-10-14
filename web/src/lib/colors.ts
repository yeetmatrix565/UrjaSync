import { clamp } from './format';
import { VOLT_COLOR_STOPS, VOLT_USABLE } from './telemetry/constants';

const RED = VOLT_COLOR_STOPS[0]!.rgb.map((c) => c / 255) as [number, number, number];

function toUnit(rgb: [number, number, number]): [number, number, number] {
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

/** Linearly interpolated cell voltage -> colour across the configured stops. */
export function voltColorRGB(v: number): [number, number, number] {
  if (!Number.isFinite(v)) return RED;

  const first = VOLT_COLOR_STOPS[0]!;
  const last = VOLT_COLOR_STOPS[VOLT_COLOR_STOPS.length - 1]!;
  if (v <= first.v) return toUnit(first.rgb);
  if (v >= last.v) return toUnit(last.rgb);

  for (let i = 0; i < VOLT_COLOR_STOPS.length - 1; i++) {
    const a = VOLT_COLOR_STOPS[i]!;
    const b = VOLT_COLOR_STOPS[i + 1]!;
    if (v >= a.v && v <= b.v) {
      const t = (v - a.v) / (b.v - a.v);
      return [
        (a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t) / 255,
        (a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t) / 255,
        (a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t) / 255,
      ];
    }
  }

  return toUnit(last.rgb);
}

export function voltColor(v: number): string {
  const [r, g, b] = voltColorRGB(v);
  const to255 = (c: number): number => Math.round(clamp(c, 0, 1) * 255);
  return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
}

/** 0..1 charge intensity used to drive emissive brightness. */
export function voltIntensity(v: number): number {
  if (!Number.isFinite(v)) return 0.2;
  const span = VOLT_USABLE.max - VOLT_USABLE.min;
  return clamp((v - VOLT_USABLE.min) / span, 0.12, 1);
}
