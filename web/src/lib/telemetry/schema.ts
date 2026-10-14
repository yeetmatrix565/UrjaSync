import { z } from 'zod';

/**
 * ThingSpeak sends every field as a string, or null/absent when the channel has
 * nothing to report.
 *
 * `toNumberOrNull` is deliberately total: a field that is missing, null, empty
 * or unparseable becomes null instead of rejecting the whole feed. Whether a
 * feed is *usable* is a question for the field mapping in `parse.ts`, not this
 * module - a 2S pack that publishes no SOH is perfectly valid.
 */
export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const field = z.unknown().transform(toNumberOrNull);

export const feedSchema = z.object({
  created_at: z.string(),
  entry_id: z.union([z.number(), z.string()]).optional(),
  field1: field,
  field2: field,
  field3: field,
  field4: field,
  field5: field,
  field6: field,
  field7: field,
  field8: field,
});

export type ParsedFeed = z.infer<typeof feedSchema>;

/** Only `feeds` is inspected here; channel metadata feeds the label detector. */
export const channelResponseSchema = z.object({
  feeds: z.array(z.unknown()).optional(),
});
