import { z } from "zod";

const optionalTrackingValue = z.string().trim().max(500).optional().nullable();

export const attributionSchema = z.object({
  gclid: optionalTrackingValue,
  gbraid: optionalTrackingValue,
  wbraid: optionalTrackingValue,
  utmSource: optionalTrackingValue,
  utmMedium: optionalTrackingValue,
  utmCampaign: optionalTrackingValue,
  utmTerm: optionalTrackingValue,
  utmContent: optionalTrackingValue,
  landingPage: z.string().trim().max(2000).optional().nullable(),
  referrer: z.string().trim().max(2000).optional().nullable(),
  capturedAt: z.string().datetime().optional().nullable()
}).strict();

export type AttributionInput = z.infer<typeof attributionSchema>;

export function attributionData(input?: AttributionInput | null) {
  if (!input) return {};
  return {
    gclid: input.gclid || undefined,
    gbraid: input.gbraid || undefined,
    wbraid: input.wbraid || undefined,
    utmSource: input.utmSource || undefined,
    utmMedium: input.utmMedium || undefined,
    utmCampaign: input.utmCampaign || undefined,
    utmTerm: input.utmTerm || undefined,
    utmContent: input.utmContent || undefined,
    landingPage: input.landingPage || undefined,
    referrer: input.referrer || undefined,
    attributionCapturedAt: input.capturedAt ? new Date(input.capturedAt) : undefined
  };
}
