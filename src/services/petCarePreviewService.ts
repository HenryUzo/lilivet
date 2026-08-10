import { createHash, randomBytes } from "node:crypto";
import { PetCarePreviewShareType, PetCarePublishingStatus, PetCareReviewStatus } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import { env } from "../config/env";
import { sendBrevoTransactionalEmail } from "../integrations/brevo/brevoClient";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function resolveShare(token: string) {
  const share = await prisma.petCarePreviewShare.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      article: {
        include: {
          reviewer: {
            select: {
              id: true,
              slug: true,
              name: true,
              credentials: true,
              role: true,
              photoUrl: true,
              shortBio: true
            }
          }
        }
      },
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

export async function sendPetCareReviewInvitation(articleId: string, staffUserId: string) {
  const article = await prisma.petCareArticle.findUnique({
    where: { id: articleId },
    include: { reviewer: true }
  });
  if (!article) throw new HttpError(404, "Pet care article not found");
  if (article.status !== PetCarePublishingStatus.IN_REVIEW) {
    throw new HttpError(409, "Submit the article for review before sending an invitation");
  }
  if (!article.reviewer?.email) {
    throw new HttpError(400, "Add an email address for the assigned veterinarian before sending an invitation");
  }

  const share = await createPetCarePreviewShare(
    articleId,
    PetCarePreviewShareType.REVIEWER,
    7,
    staffUserId
  );
  const previewUrl = `${env.PUBLIC_WEBSITE_URL.replace(/\/$/, "")}/pet-care/preview/${share.token}`;
  const reviewerName = `${article.reviewer.name}, ${article.reviewer.credentials}`;
  const safeTitle = escapeHtml(article.title);
  const safeReviewer = escapeHtml(reviewerName);
  const result = await sendBrevoTransactionalEmail({
    to: { email: article.reviewer.email, name: reviewerName },
    subject: `Veterinary review requested: ${article.title}`,
    textContent: `Hello ${reviewerName},\n\nLili Veterinary Hospital has assigned “${article.title}” to you for medical review. Review and approve the article using this private link within seven days:\n${previewUrl}\n\nIf you were not expecting this request, you can ignore this email.`,
    htmlContent: `<div style="font-family:Arial,sans-serif;color:#123b2d;line-height:1.6;max-width:620px;margin:auto"><h1 style="color:#087c48;font-size:26px">Veterinary review requested</h1><p>Hello ${safeReviewer},</p><p>Lili Veterinary Hospital has assigned <strong>${safeTitle}</strong> to you for medical review.</p><p><a href="${previewUrl}" style="display:inline-block;background:#087c48;color:#fff;text-decoration:none;padding:13px 20px;border-radius:6px;font-weight:700">Review article</a></p><p>This private approval link expires in seven days. You can review the article, leave comments, and approve it from the preview page.</p><p style="color:#60736b;font-size:13px">If you were not expecting this request, you can ignore this email.</p></div>`
  });

  if (!result.ok) {
    await prisma.petCarePreviewShare.update({ where: { id: share.id }, data: { revokedAt: new Date() } });
    console.error(JSON.stringify({
      event: "pet_care_review_invitation_failed",
      articleId,
      reviewerId: article.reviewer.id,
      status: result.status,
      error: result.errorMessage ?? result.bodyText
    }));
    throw new HttpError(502, "The review invitation could not be delivered. Check Brevo configuration and try again.");
  }

  const invitationSentAt = new Date();
  await prisma.petCarePreviewShare.update({
    where: { id: share.id },
    data: { invitationRecipient: article.reviewer.email, invitationSentAt }
  });
  return { recipient: article.reviewer.email, invitationSentAt, expiresAt: share.expiresAt };
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

export async function updatePetCarePreviewReviewerQuote(token: string, quote: string) {
  const share = await resolveShare(token);
  if (share.shareType !== PetCarePreviewShareType.REVIEWER) {
    throw new HttpError(403, "This preview link does not include veterinarian review access");
  }
  if (!share.article.reviewerId || share.article.status !== PetCarePublishingStatus.IN_REVIEW) {
    throw new HttpError(409, "Article must be in review with an assigned veterinarian");
  }

  return prisma.petCareArticle.update({
    where: { id: share.article.id },
    data: { vetQuote: quote }
  });
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
