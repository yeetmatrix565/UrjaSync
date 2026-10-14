'use client';

import { memo, useId } from 'react';

export interface SparklineProps {
  data: Array<number | null>;
  color?: string;
  width?: number;
  height?: number;
  /**
   * Accessible name for the trend. When omitted the sparkline stays
   * decorative (aria-hidden) — callers that show it as the only trend for a
   * metric should pass one, e.g. "Voltage trend".
   */
  label?: string;
}

function SparklineBase({
  data,
  color = '#22d3ee',
  width = 104,
  height = 30,
  label,
}: SparklineProps) {
  const gradientId = useId();
  const finite = data.filter((v): v is number => v !== null && Number.isFinite(v));

  if (finite.length < 2) {
    return (
      <div
        className="rounded bg-white/5"
        style={{ width, height }}
        role={label ? 'img' : undefined}
        aria-label={label ? `${label}: not enough data` : undefined}
        aria-hidden={label ? undefined : true}
      />
    );
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const stepX = width / (finite.length - 1);
  const pad = 3;

  const points = finite.map((v, i) => {
    const x = i * stepX;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
      role={label ? 'img' : undefined}
      aria-label={
        label
          ? `${label}: from ${finite[0]} to ${finite[finite.length - 1]}, low ${min}, high ${max}`
          : undefined
      }
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const Sparkline = memo(SparklineBase);
