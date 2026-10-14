import { z } from 'zod';

/**
 * ThingSpeak returns every field as a STRING or null. We accept a numeric
 * string or a number, and reject null / empty / non-numeric / non-finite, so a
 * malformed value can never surface as NaN.
 */
export const numeric = z
  .union([
    z
      .string()
      .trim()
      .min(1)
      .transform((s) => Number(s)),
    z.number(),
  ])
  .pipe(z.number().finite());

export const feedSchema = z.object({
  created_at: z.string(),
  entry_id: z.union([z.number(), z.string()]).optional(),
  field1: numeric,
  field2: numeric,
  field3: numeric,
  field4: numeric,
  field5: numeric,
  field6: numeric,
  field7: numeric,
  field8: numeric,
});

export type ParsedFeed = z.infer<typeof feedSchema>;

/**
 * Only `feeds` is inspected; channel metadata is irrelevant to the dashboard
 * and unknown extra keys are stripped by zod.
 */
export const channelResponseSchema = z.object({
  feeds: z.array(z.unknown()).optional(),
});
