import { NextResponse } from 'next/server';
import { isDemoMode, serverEnv } from '@/lib/env';
import { buildMockRaw } from '@/lib/telemetry/mock';
import { parseChannel } from '@/lib/telemetry/parse';
import type { Scenario } from '@/lib/telemetry/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UPSTREAM_TIMEOUT_MS = 8_000;
const FEED_COUNT = 100;
const DEMO_HEADERS = { 'x-urja-demo': '1' } as const;

const SCENARIOS: readonly Scenario[] = ['normal', 'alert', 'stale', 'empty', 'malformed'];

function asScenario(value: string | null): Scenario | null {
  return value !== null && (SCENARIOS as readonly string[]).includes(value)
    ? (value as Scenario)
    : null;
}

/** Demo payloads travel through the same parser as live data. */
function demoResponse(scenario: Scenario): NextResponse {
  return NextResponse.json(parseChannel(buildMockRaw(scenario)), {
    headers: DEMO_HEADERS,
  });
}

/** Upstream failure is a normal, non-throwing outcome: the UI shows OFFLINE. */
function offlineResponse(): NextResponse {
  return NextResponse.json({ latest: null, history: [] });
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const scenario = asScenario(searchParams.get('scenario'));

  if (scenario) return demoResponse(scenario);
  if (isDemoMode) return demoResponse('normal');

  const { channelId, readApiKey } = serverEnv;

  try {
    const url =
      `https://api.thingspeak.com/channels/${encodeURIComponent(channelId!)}` +
      `/feeds.json?api_key=${encodeURIComponent(readApiKey!)}&results=${FEED_COUNT}`;

    const upstream = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) return offlineResponse();

    const raw: unknown = await upstream.json();
    return NextResponse.json(parseChannel(raw));
  } catch {
    return offlineResponse();
  }
}
