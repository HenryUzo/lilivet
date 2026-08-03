import { PetCarePublishingStatus, PetCareReviewStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import type { PetCareArticleInput } from "../validators/petCareArticleSchemas";

const articleInclude = { reviewer: true } as const;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function articleData(input: Partial<PetCareArticleInput>) {
  const data: Record<string, unknown> = { ...input };
  for (const field of ["relatedService", "keyTakeaways", "monitorAtHome", "faqs", "references", "sections"]) {
    if (field in data) data[field] = json(data[field]);
  }
  return data;
}

export async function listPublishedPetCareArticles(filters: { category?: string; search?: string }) {
  return prisma.petCareArticle.findMany({
    where: {
      status: PetCarePublishingStatus.PUBLISHED,
      ...(filters.category ? { categorySlug: filters.category } : {}),
      ...(filters.search ? {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" as const } },
          { excerpt: { contains: filters.search, mode: "insensitive" as const } },
          { tags: { has: filters.search.toLowerCase() } }
        ]
      } : {})
    },
    include: articleInclude,
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }]
  });
}

export async function getPublishedPetCareArticle(slug: string) {
  const article = await prisma.petCareArticle.findFirst({
    where: { slug, status: PetCarePublishingStatus.PUBLISHED },
    include: articleInclude
  });
  if (!article) throw new HttpError(404, "Pet care article not found");
  return article;
}

export async function listAdminPetCareArticles(filters: {
  status?: PetCarePublishingStatus;
  category?: string;
  reviewerId?: string;
  stale?: string;
  search?: string;
}) {
  const now = new Date();
  return prisma.petCareArticle.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { categorySlug: filters.category } : {}),
      ...(filters.reviewerId ? { reviewerId: filters.reviewerId } : {}),
      ...(filters.stale === "true" ? { reviewDueAt: { lt: now }, status: { not: PetCarePublishingStatus.ARCHIVED } } : {}),
      ...(filters.search ? { OR: [
        { title: { contains: filters.search, mode: "insensitive" as const } },
        { slug: { contains: filters.search, mode: "insensitive" as const } }
      ] } : {})
    },
    include: articleInclude,
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function getAdminPetCareArticle(id: string) {
  const article = await prisma.petCareArticle.findUnique({ where: { id }, include: articleInclude });
  if (!article) throw new HttpError(404, "Pet care article not found");
  return article;
}

export async function createPetCareArticle(input: PetCareArticleInput, staffUserId: string) {
  return prisma.petCareArticle.create({
    data: {
      ...(articleData(input) as Prisma.PetCareArticleUncheckedCreateInput),
      createdByStaffUserId: staffUserId,
      updatedByStaffUserId: staffUserId
    },
    include: articleInclude
  });
}

export async function updatePetCareArticle(id: string, input: Partial<PetCareArticleInput>, staffUserId: string) {
  const current = await getAdminPetCareArticle(id);
  if (current.status === PetCarePublishingStatus.ARCHIVED) {
    throw new HttpError(409, "Archived articles must be restored before editing");
  }
  return prisma.petCareArticle.update({
    where: { id },
    data: {
      ...(articleData(input) as Prisma.PetCareArticleUncheckedUpdateInput),
      updatedByStaffUserId: staffUserId,
      ...(current.status === PetCarePublishingStatus.APPROVED || current.status === PetCarePublishingStatus.PUBLISHED
        ? { status: PetCarePublishingStatus.DRAFT, reviewStatus: PetCareReviewStatus.NOT_REVIEWED, approvedAt: null }
        : {})
    },
    include: articleInclude
  });
}

export async function submitPetCareArticleForReview(id: string, staffUserId: string) {
  const article = await getAdminPetCareArticle(id);
  if (!article.reviewerId) throw new HttpError(400, "Assign a veterinary reviewer before submitting for review");
  return prisma.petCareArticle.update({
    where: { id },
    data: {
      status: PetCarePublishingStatus.IN_REVIEW,
      reviewStatus: PetCareReviewStatus.IN_REVIEW,
      submittedForReviewAt: new Date(),
      updatedByStaffUserId: staffUserId
    },
    include: articleInclude
  });
}

export async function approvePetCareArticle(id: string, staffUserId: string) {
  const article = await getAdminPetCareArticle(id);
  if (article.status !== PetCarePublishingStatus.IN_REVIEW || !article.reviewerId) {
    throw new HttpError(409, "Article must be in review with an assigned reviewer before approval");
  }
  const reviewedAt = new Date();
  const reviewDueAt = new Date(reviewedAt);
  reviewDueAt.setFullYear(reviewDueAt.getFullYear() + 1);
  return prisma.petCareArticle.update({
    where: { id },
    data: {
      status: PetCarePublishingStatus.APPROVED,
      reviewStatus: PetCareReviewStatus.MEDICALLY_REVIEWED,
      reviewedAt,
      reviewDueAt,
      approvedAt: reviewedAt,
      approvedByStaffUserId: staffUserId,
      updatedByStaffUserId: staffUserId
    },
    include: articleInclude
  });
}

export async function publishPetCareArticle(id: string, staffUserId: string) {
  const article = await getAdminPetCareArticle(id);
  if (article.status !== PetCarePublishingStatus.APPROVED || article.reviewStatus !== PetCareReviewStatus.MEDICALLY_REVIEWED) {
    throw new HttpError(409, "Only medically reviewed and approved articles can be published");
  }
  return prisma.petCareArticle.update({
    where: { id },
    data: {
      status: PetCarePublishingStatus.PUBLISHED,
      publishedAt: article.publishedAt ?? new Date(),
      publishedByStaffUserId: staffUserId,
      updatedByStaffUserId: staffUserId
    },
    include: articleInclude
  });
}

export async function archivePetCareArticle(id: string, staffUserId: string) {
  await getAdminPetCareArticle(id);
  return prisma.petCareArticle.update({
    where: { id },
    data: { status: PetCarePublishingStatus.ARCHIVED, archivedAt: new Date(), updatedByStaffUserId: staffUserId },
    include: articleInclude
  });
}

export async function listPetCareReviewers() {
  return prisma.petCareReviewer.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
}

export async function createPetCareReviewer(input: Prisma.PetCareReviewerCreateInput) {
  return prisma.petCareReviewer.create({ data: input });
}

export async function updatePetCareReviewer(id: string, input: Prisma.PetCareReviewerUpdateInput) {
  const existing = await prisma.petCareReviewer.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Veterinary reviewer not found");
  return prisma.petCareReviewer.update({ where: { id }, data: input });
}
