import type { Request, Response } from "express";
import { pipeline } from "stream/promises";
import { z } from "zod";
import {
  approvePetCareArticle,
  archivePetCareArticle,
  createPetCareArticle,
  createPetCareReviewer,
  getAdminPetCareArticle,
  getPublishedPetCareArticle,
  listAdminPetCareArticles,
  listPetCareReviewers,
  listPublishedPetCareArticles,
  publishPetCareArticle,
  submitPetCareArticleForReview,
  updatePetCareArticle,
  updatePetCareReviewer
} from "../services/petCareArticleService";
import { asyncHandler } from "../utils/asyncHandler";
import { openPublicPetCareImage, savePetCareHeroImage } from "../services/petCareImageService";
import {
  petCareArticleInputSchema,
  petCareArticleListQuerySchema,
  petCareArticleUpdateSchema,
  publicPetCareArticleListQuerySchema,
  reviewerInputSchema,
  reviewerUpdateSchema,
  slugSchema
} from "../validators/petCareArticleSchemas";
import {
  addPetCarePreviewComment,
  approvePetCarePreview,
  createPetCarePreviewShare,
  getPetCarePreview,
  sendPetCareReviewInvitation,
  updatePetCarePreviewReviewerQuote
} from "../services/petCarePreviewService";
import {
  previewCommentInputSchema,
  previewReviewerQuoteInputSchema,
  previewShareInputSchema,
  previewTokenParamsSchema
} from "../validators/petCareArticleSchemas";

const idParamsSchema = z.object({ id: z.string().cuid() });
const slugParamsSchema = z.object({ slug: slugSchema });

function staffUserId(req: Request) {
  return req.staffUser!.id;
}

export const listPublishedArticles = asyncHandler(async (req: Request, res: Response) => {
  const filters = publicPetCareArticleListQuerySchema.parse(req.query);
  res.json({ items: await listPublishedPetCareArticles(filters) });
});

export const getPublishedArticle = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = slugParamsSchema.parse(req.params);
  res.json(await getPublishedPetCareArticle(slug));
});

export const listAdminArticles = asyncHandler(async (req: Request, res: Response) => {
  const filters = petCareArticleListQuerySchema.parse(req.query);
  res.json({ items: await listAdminPetCareArticles(filters) });
});

export const getAdminArticle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await getAdminPetCareArticle(id));
});

export const uploadAdminHeroImage = asyncHandler(async (req: Request, res: Response) => {
  const apiBaseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(201).json(await savePetCareHeroImage(req.file, apiBaseUrl));
});

export const getPublicPetCareImage = asyncHandler(async (req: Request, res: Response) => {
  const { payload, target } = await openPublicPetCareImage(String(req.params.token ?? ""));
  res.type(payload.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(payload.fileName)}`);

  if (target.kind === "local") {
    res.sendFile(target.absolutePath);
    return;
  }

  if (target.sizeBytes) {
    res.setHeader("Content-Length", String(target.sizeBytes));
  }
  await pipeline(target.stream as NodeJS.ReadableStream, res);
});

export const createAdminArticle = asyncHandler(async (req: Request, res: Response) => {
  const input = petCareArticleInputSchema.parse(req.body);
  res.status(201).json(await createPetCareArticle(input, staffUserId(req)));
});

export const updateAdminArticle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  const input = petCareArticleUpdateSchema.parse(req.body);
  res.json(await updatePetCareArticle(id, input, staffUserId(req)));
});

export const submitAdminArticleForReview = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await submitPetCareArticleForReview(id, staffUserId(req)));
});

export const approveAdminArticle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await approvePetCareArticle(id, staffUserId(req)));
});

export const publishAdminArticle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await publishPetCareArticle(id, staffUserId(req)));
});

export const archiveAdminArticle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await archivePetCareArticle(id, staffUserId(req)));
});

export const listAdminReviewers = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ items: await listPetCareReviewers() });
});

export const createAdminReviewer = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await createPetCareReviewer(reviewerInputSchema.parse(req.body)));
});

export const updateAdminReviewer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await updatePetCareReviewer(id, reviewerUpdateSchema.parse(req.body)));
});

export const createAdminPreviewShare = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  const input = previewShareInputSchema.parse(req.body);
  res.status(201).json(await createPetCarePreviewShare(id, input.shareType, input.expiresInDays, staffUserId(req)));
});

export const sendAdminReviewInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamsSchema.parse(req.params);
  res.status(201).json(await sendPetCareReviewInvitation(id, staffUserId(req)));
});

export const getPublicPreview = asyncHandler(async (req: Request, res: Response) => {
  const { token } = previewTokenParamsSchema.parse(req.params);
  res.json(await getPetCarePreview(token));
});

export const createPublicPreviewComment = asyncHandler(async (req: Request, res: Response) => {
  const { token } = previewTokenParamsSchema.parse(req.params);
  const input = previewCommentInputSchema.parse(req.body);
  res.status(201).json(await addPetCarePreviewComment(token, input.authorName, input.comment));
});

export const updatePublicPreviewReviewerQuote = asyncHandler(async (req: Request, res: Response) => {
  const { token } = previewTokenParamsSchema.parse(req.params);
  const { quote } = previewReviewerQuoteInputSchema.parse(req.body);
  res.json(await updatePetCarePreviewReviewerQuote(token, quote));
});

export const approvePublicPreview = asyncHandler(async (req: Request, res: Response) => {
  const { token } = previewTokenParamsSchema.parse(req.params);
  res.json(await approvePetCarePreview(token));
});
