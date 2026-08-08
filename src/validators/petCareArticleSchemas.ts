import { PetCarePreviewShareType, PetCarePublishingStatus } from "@prisma/client";
import { z } from "zod";

export const slugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const textItemSchema = z.string().trim().min(1).max(5000);
const stringListSchema = z.array(textItemSchema).max(30);

export const relatedServiceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  path: z.string().trim().min(1).max(240).regex(/^\//)
});

export const articleSectionSchema = z.object({
  id: slugSchema,
  title: z.string().trim().min(1).max(180),
  type: z.enum(["CONTENT", "IMAGE"]).default("CONTENT"),
  content: z.array(textItemSchema).max(20).default([]),
  bullets: z.array(textItemSchema).max(30).optional(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  imageAlt: z.string().trim().max(240).nullable().optional(),
  caption: z.string().trim().max(500).nullable().optional()
}).superRefine((section, context) => {
  if (section.type === "CONTENT" && section.content.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Add section content", path: ["content"] });
  }

  if (section.type === "IMAGE") {
    if (!section.imageUrl) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Upload a section image", path: ["imageUrl"] });
    }
    if (!section.imageAlt || section.imageAlt.length < 5) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Describe the section image", path: ["imageAlt"] });
    }
  }
});

export const articleFaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(3000)
});

export const articleReferenceSchema = z.object({
  label: z.string().trim().min(1).max(300),
  url: z.string().url().max(1000).optional()
});

export const petCareArticleInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(180),
  seoTitle: z.string().trim().min(3).max(70),
  seoDescription: z.string().trim().min(20).max(170),
  excerpt: z.string().trim().min(20).max(600),
  summary: z.string().trim().min(20).max(2000),
  categorySlug: slugSchema,
  categoryLabel: z.string().trim().min(2).max(100),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  heroImageUrl: z.string().trim().min(1).max(1000).nullable().optional(),
  heroImageKey: z.string().trim().min(1).max(160).nullable().optional(),
  heroImageFile: z.string().trim().min(1).max(500).nullable().optional(),
  heroImageAlt: z.string().trim().min(5).max(240),
  authorName: z.string().trim().min(2).max(160).default("Lili Veterinary Hospital Care Team"),
  authorRole: z.string().trim().min(2).max(120).default("Veterinary Care Team"),
  reviewerId: z.string().cuid().nullable().optional(),
  reviewDueAt: z.coerce.date().nullable().optional(),
  readingTimeMinutes: z.coerce.number().int().min(1).max(120),
  relatedService: relatedServiceSchema,
  relatedArticleSlugs: z.array(slugSchema).max(20),
  featured: z.boolean().default(false),
  seasonal: z.boolean().default(false),
  popular: z.boolean().default(false),
  keyTakeaways: stringListSchema,
  monitorAtHome: stringListSchema,
  warningCallout: z.string().trim().max(3000).nullable().optional(),
  vetQuote: z.string().trim().max(3000).nullable().optional(),
  faqs: z.array(articleFaqSchema).max(30),
  references: z.array(articleReferenceSchema).max(50),
  sections: z.array(articleSectionSchema).min(1).max(40)
}).refine(
  (article) => Boolean(article.heroImageUrl || article.heroImageKey || article.heroImageFile),
  { message: "Provide a hero image URL or an existing website image reference", path: ["heroImageUrl"] }
);

export const petCareArticleUpdateSchema = petCareArticleInputSchema._def.schema.partial();

export const petCareArticleListQuerySchema = z.object({
  status: z.nativeEnum(PetCarePublishingStatus).optional(),
  category: slugSchema.optional(),
  reviewerId: z.string().cuid().optional(),
  stale: z.enum(["true", "false"]).optional(),
  search: z.string().trim().max(120).optional()
});

export const publicPetCareArticleListQuerySchema = z.object({
  category: slugSchema.optional(),
  search: z.string().trim().max(120).optional()
});

export const reviewerInputSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  credentials: z.string().trim().min(1).max(80),
  role: z.string().trim().min(2).max(120),
  photoUrl: z.string().trim().max(1000).nullable().optional(),
  shortBio: z.string().trim().min(20).max(2000),
  isActive: z.boolean().default(true)
});

export const reviewerUpdateSchema = reviewerInputSchema.partial();

export const previewShareInputSchema = z.object({
  shareType: z.nativeEnum(PetCarePreviewShareType),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7)
});

export const previewTokenParamsSchema = z.object({ token: z.string().length(64).regex(/^[a-f0-9]+$/) });

export const previewCommentInputSchema = z.object({
  authorName: z.string().trim().min(2).max(100),
  comment: z.string().trim().min(2).max(3000)
});

export type PetCareArticleInput = z.infer<typeof petCareArticleInputSchema>;
