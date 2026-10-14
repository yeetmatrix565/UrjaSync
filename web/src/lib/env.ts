import { z } from 'zod';

/**
 * Server-only configuration. Both ThingSpeak values are optional - when either
 * is absent the API route serves demo telemetry instead of calling upstream, so
 * a fresh clone runs with zero configuration.
 *
 * Imported only from route handlers; never from a client component.
 */
const optionalNonEmpty = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const envSchema = z.object({
  THINGSPEAK_CHANNEL_ID: optionalNonEmpty,
  THINGSPEAK_READ_API_KEY: optionalNonEmpty,
});

export interface ServerEnv {
  channelId: string | null;
  readApiKey: string | null;
}

function readServerEnv(): ServerEnv {
  const parsed = envSchema.safeParse({
    THINGSPEAK_CHANNEL_ID: process.env.THINGSPEAK_CHANNEL_ID,
    THINGSPEAK_READ_API_KEY: process.env.THINGSPEAK_READ_API_KEY,
  });

  if (!parsed.success) return { channelId: null, readApiKey: null };

  return {
    channelId: parsed.data.THINGSPEAK_CHANNEL_ID ?? null,
    readApiKey: parsed.data.THINGSPEAK_READ_API_KEY ?? null,
  };
}

export const serverEnv = readServerEnv();

/** Credentials absent => the route serves synthetic telemetry. */
export const isDemoMode = serverEnv.channelId === null || serverEnv.readApiKey === null;
