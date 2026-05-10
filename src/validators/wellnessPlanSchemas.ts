import { z } from "zod";

export const wellnessPlanKeySchema = z.enum([
  "PUPPY_ESSENTIAL",
  "PUPPY_COMPLETE",
  "ADULT_DOG_ESSENTIAL",
  "ADULT_DOG_COMPLETE",
  "KITTEN_ESSENTIAL",
  "KITTEN_COMPLETE",
  "ADULT_CAT_ESSENTIAL",
  "ADULT_CAT_COMPLETE"
]);

export const wellnessPlanKeyParamSchema = z.object({
  planKey: wellnessPlanKeySchema
});
