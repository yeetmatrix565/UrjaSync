import type { ReactNode } from 'react';

/**
 * Shared 24x24 stroke icons, so every card and screen uses the same visual
 * language without pulling in an icon dependency.
 */

interface IconProps {
  className?: string;
}

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? 'h-4 w-4'}
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </Svg>
  );
}

export function CurrentIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 12h4l2.5-6 3 12 2.5-6h6" />
    </Svg>
  );
}

export function PowerIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3v9" />
      <path d="M6.5 6.5a8 8 0 1 0 11 0" />
    </Svg>
  );
}

export function EnergyIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="7" width="15" height="10" rx="2" />
      <path d="M21 10v4" />
      <path d="M6.5 10.5h4L8.5 14h4" />
    </Svg>
  );
}

export function TempIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z" />
    </Svg>
  );
}

export function HealthIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7 3c0 4.8-7 9.4-7 9.4Z" />
    </Svg>
  );
}

export function PackIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Z" />
      <path d="M3 7l9 4.5L21 7" />
      <path d="M12 11.5v10" />
    </Svg>
  );
}

export function WaveIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 12c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-6 5-6 2.5 3 5 3" />
    </Svg>
  );
}

export function InsightsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20V8" />
    </Svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Svg>
  );
}
