import { PetCarePublishingStatus, PetCareReviewStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findUnique, findFirst, create, update } = vi.hoisted(() => ({
  findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    petCareArticle: { findMany, findUnique, findFirst, create, update },
    petCareReviewer: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }
  }
}));

import {
  approvePetCareArticle, listPublishedPetCareArticles, publishPetCareArticle,
  submitPetCareArticleForReview, updatePetCareArticle
} from "../src/services/petCareArticleService";

const baseArticle = {
  id: "article-1", reviewerId: "reviewer-1", status: PetCarePublishingStatus.DRAFT,
  reviewStatus: PetCareReviewStatus.NOT_REVIEWED, publishedAt: null
};

describe("Pet Care publishing lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only exposes published records through the public query", async () => {
    findMany.mockResolvedValue([]);
    await listPublishedPetCareArticles({});
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: PetCarePublishingStatus.PUBLISHED })
    }));
  });

  it("requires an assigned veterinary reviewer before review", async () => {
    findUnique.mockResolvedValue({ ...baseArticle, reviewerId: null });
    await expect(submitPetCareArticleForReview("article-1", "staff-1")).rejects.toMatchObject({ statusCode: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  it("records medical approval and a one-year review deadline", async () => {
    findUnique.mockResolvedValue({ ...baseArticle, status: PetCarePublishingStatus.IN_REVIEW });
    update.mockImplementation(({ data }) => Promise.resolve({ ...baseArticle, ...data }));
    const approved = await approvePetCareArticle("article-1", "staff-1");
    expect(approved.status).toBe(PetCarePublishingStatus.APPROVED);
    expect(approved.reviewStatus).toBe(PetCareReviewStatus.MEDICALLY_REVIEWED);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      approvedByStaffUserId: "staff-1", reviewDueAt: expect.any(Date)
    }) }));
  });

  it("does not publish an article before medical approval", async () => {
    findUnique.mockResolvedValue(baseArticle);
    await expect(publishPetCareArticle("article-1", "staff-1")).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns edited published content to draft review status", async () => {
    findUnique.mockResolvedValue({ ...baseArticle, status: PetCarePublishingStatus.PUBLISHED });
    update.mockResolvedValue({});
    await updatePetCareArticle("article-1", { title: "Updated clinical guidance" }, "staff-1");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      status: PetCarePublishingStatus.DRAFT,
      reviewStatus: PetCareReviewStatus.NOT_REVIEWED,
      approvedAt: null
    }) }));
  });
});
