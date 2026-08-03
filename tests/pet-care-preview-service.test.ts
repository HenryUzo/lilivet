import { PetCarePreviewShareType, PetCarePublishingStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { shareFindUnique, articleUpdate, shareUpdate, transaction } = vi.hoisted(() => ({
  shareFindUnique: vi.fn(), articleUpdate: vi.fn(), shareUpdate: vi.fn(), transaction: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    petCarePreviewShare: { findUnique: shareFindUnique },
    petCarePreviewComment: { create: vi.fn() },
    $transaction: transaction
  }
}));

import { approvePetCarePreview, getPetCarePreview } from "../src/services/petCarePreviewService";

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
});
