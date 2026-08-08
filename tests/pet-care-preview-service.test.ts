import { PetCarePreviewShareType, PetCarePublishingStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { shareFindUnique, shareCreate, articleFindUnique, articleUpdate, shareUpdate, transaction, sendEmail } = vi.hoisted(() => ({
  shareFindUnique: vi.fn(), shareCreate: vi.fn(), articleFindUnique: vi.fn(), articleUpdate: vi.fn(), shareUpdate: vi.fn(), transaction: vi.fn(), sendEmail: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    petCarePreviewShare: { findUnique: shareFindUnique, create: shareCreate, update: shareUpdate },
    petCareArticle: { findUnique: articleFindUnique },
    petCarePreviewComment: { create: vi.fn() },
    $transaction: transaction
  }
}));

vi.mock("../src/integrations/brevo/brevoClient", () => ({
  sendBrevoTransactionalEmail: sendEmail
}));

import { approvePetCarePreview, getPetCarePreview, sendPetCareReviewInvitation } from "../src/services/petCarePreviewService";

function share(overrides: Record<string, unknown> = {}) {
  return {
    id: "share-1",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    shareType: PetCarePreviewShareType.REVIEWER,
    comments: [],
    article: {
      id: "article-1",
      reviewerId: "reviewer-1",
      status: PetCarePublishingStatus.IN_REVIEW,
      reviewer: { id: "reviewer-1", name: "Dr. Reviewer" }
    },
    ...overrides
  };
}

describe("Pet Care private review links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation((callback) => callback({
      petCareArticle: { update: articleUpdate },
      petCarePreviewShare: { update: shareUpdate }
    }));
  });

  it("rejects expired preview links", async () => {
    shareFindUnique.mockResolvedValue(share({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(getPetCarePreview("a".repeat(64))).rejects.toMatchObject({ statusCode: 404 });
  });

  it("does not allow a comment-only link to approve", async () => {
    shareFindUnique.mockResolvedValue(share({ shareType: PetCarePreviewShareType.COMMENT }));
    await expect(approvePetCarePreview("b".repeat(64))).rejects.toMatchObject({ statusCode: 403 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("records veterinarian approval and revokes the one-time approval link", async () => {
    shareFindUnique.mockResolvedValue(share());
    articleUpdate.mockResolvedValue({ id: "article-1", status: "APPROVED" });
    shareUpdate.mockResolvedValue({});
    await expect(approvePetCarePreview("c".repeat(64))).resolves.toMatchObject({ status: "APPROVED" });
    expect(articleUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "APPROVED", reviewStatus: "MEDICALLY_REVIEWED" })
    }));
    expect(shareUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { revokedAt: expect.any(Date) } }));
  });

  it("sends a review invitation and records its recipient and timestamp", async () => {
    articleFindUnique.mockResolvedValue({
      id: "article-1",
      title: "Safe pet care",
      reviewerId: "reviewer-1",
      status: PetCarePublishingStatus.IN_REVIEW,
      reviewer: { id: "reviewer-1", name: "Dr. Reviewer", credentials: "DVM", email: "vet@example.com" }
    });
    shareCreate.mockResolvedValue({ id: "share-1", expiresAt: new Date(Date.now() + 86_400_000) });
    shareUpdate.mockResolvedValue({});
    sendEmail.mockResolvedValue({ ok: true });

    await expect(sendPetCareReviewInvitation("article-1", "staff-1")).resolves.toMatchObject({ recipient: "vet@example.com" });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: { email: "vet@example.com", name: "Dr. Reviewer, DVM" } }));
    expect(shareUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ invitationRecipient: "vet@example.com", invitationSentAt: expect.any(Date) })
    }));
  });

  it("revokes the approval link when Brevo delivery fails", async () => {
    articleFindUnique.mockResolvedValue({
      id: "article-1",
      title: "Safe pet care",
      reviewerId: "reviewer-1",
      status: PetCarePublishingStatus.IN_REVIEW,
      reviewer: { id: "reviewer-1", name: "Dr. Reviewer", credentials: "DVM", email: "vet@example.com" }
    });
    shareCreate.mockResolvedValue({ id: "share-2", expiresAt: new Date(Date.now() + 86_400_000) });
    shareUpdate.mockResolvedValue({});
    sendEmail.mockResolvedValue({ ok: false, status: 500, bodyText: "delivery failed" });

    await expect(sendPetCareReviewInvitation("article-1", "staff-1")).rejects.toMatchObject({ statusCode: 502 });
    expect(shareUpdate).toHaveBeenCalledWith({ where: { id: "share-2" }, data: { revokedAt: expect.any(Date) } });
  });
});
