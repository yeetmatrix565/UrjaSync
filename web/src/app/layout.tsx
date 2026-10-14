import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import { TelemetryProvider } from '@/components/providers/TelemetryProvider';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Urja Sync — Battery Management Dashboard',
  description:
    'Real-time 3D dashboard for an ESP32 smart battery management system, powered by ThingSpeak telemetry.',
};

export const viewport: Viewport = {
  themeColor: '#05070a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-base font-display antialiased">
        {/*
          One poll for the whole app: every route reads this provider, so moving
          between screens neither restarts the poll timer nor re-fetches the
          channel, and the cards stay consistent with the detail screens.
        */}
        <TelemetryProvider>{children}</TelemetryProvider>
      </body>
    </html>
  );
}
