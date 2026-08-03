import { createHash, randomBytes } from "node:crypto";
import { PetCarePreviewShareType, PetCarePublishingStatus, PetCareReviewStatus } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function resolveShare(token: string) {
  const share = await prisma.petCarePreviewShare.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      article: { include: { reviewer: true } },
      comments: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!share || share.revokedAt || share.expiresAt <= new Date()) {
    throw new HttpError(404, "Preview link is invalid or has expired");
  }
  return share;
}

export async function createPetCarePreviewShare(
  articleId: string,
  shareType: PetCarePreviewShareType,
  expiresInDays: number,
  staffUserId: string
) {
  const article = await prisma.petCareArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new HttpError(404, "Pet care article not found");
  if (shareType === PetCarePreviewShareType.REVIEWER && !article.reviewerId) {
    throw new HttpError(400, "Assign a veterinary reviewer before creating an approval link");
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  const share = await prisma.petCarePreviewShare.create({
    data: { articleId, shareType, expiresAt, tokenHash: hashToken(token), createdByStaffUserId: staffUserId }
  });
  return { id: share.id, token, shareType, expiresAt };
}

export async function getPetCarePreview(token: string) {
  const share = await resolveShare(token);
  return {
    article: share.article,
    comments: share.comments,
    shareType: share.shareType,
    expiresAt: share.expiresAt,
    canApprove: share.shareType === PetCarePreviewShareType.REVIEWER &&
      share.article.status === PetCarePublishingStatus.IN_REVIEW
  };
}

export async function addPetCarePreviewComment(token: string, authorName: string, comment: string) {
  const share = await resolveShare(token);
  return prisma.petCarePreviewComment.create({ data: { shareId: share.id, authorName, comment } });
}

export async function approvePetCarePreview(token: string) {
  const share = await resolveShare(token);
  if (share.shareType !== PetCarePreviewShareType.REVIEWER) {
    throw new HttpError(403, "This preview link does not include veterinary approval access");
  }
  if (!share.article.reviewerId || share.article.status !== PetCarePublishingStatus.IN_REVIEW) {
    throw new HttpError(409, "Article must be in review with an assigned veterinarian");
  }
  const reviewedAt = new Date();
  const reviewDueAt = new Date(reviewedAt);
  reviewDueAt.setFullYear(reviewDueAt.getFullYear() + 1);
  return prisma.$transaction(async (tx) => {
    const article = await tx.petCareArticle.update({
      where: { id: share.article.id },
      data: {
        status: PetCarePublishingStatus.APPROVED,
        reviewStatus: PetCareReviewStatus.MEDICALLY_REVIEWED,
        reviewedAt,
        reviewDueAt,
        approvedAt: reviewedAt,
        approvedByStaffUserId: null
      },
      include: { reviewer: true }
    });
    await tx.petCarePreviewShare.update({ where: { id: share.id }, data: { revokedAt: reviewedAt } });
    return article;
  });
}
