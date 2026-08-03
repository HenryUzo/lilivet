CREATE TYPE "PetCarePublishingStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PetCareReviewStatus" AS ENUM ('NOT_REVIEWED', 'IN_REVIEW', 'MEDICALLY_REVIEWED');

CREATE TABLE "PetCareReviewer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "photoUrl" TEXT,
    "shortBio" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PetCareReviewer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PetCareArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "tags" TEXT[],
    "heroImageUrl" TEXT,
    "heroImageKey" TEXT,
    "heroImageFile" TEXT,
    "heroImageAlt" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" "PetCarePublishingStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewStatus" "PetCareReviewStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "reviewedAt" TIMESTAMP(3),
    "reviewDueAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "readingTimeMinutes" INTEGER NOT NULL,
    "relatedService" JSONB NOT NULL,
    "relatedArticleSlugs" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "seasonal" BOOLEAN NOT NULL DEFAULT false,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "keyTakeaways" JSONB NOT NULL,
    "monitorAtHome" JSONB NOT NULL,
    "warningCallout" TEXT,
    "vetQuote" TEXT,
    "faqs" JSONB NOT NULL,
    "references" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "submittedForReviewAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdByStaffUserId" TEXT,
    "updatedByStaffUserId" TEXT,
    "approvedByStaffUserId" TEXT,
    "publishedByStaffUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PetCareArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PetCareReviewer_slug_key" ON "PetCareReviewer"("slug");
CREATE INDEX "PetCareReviewer_isActive_idx" ON "PetCareReviewer"("isActive");
CREATE INDEX "PetCareReviewer_name_idx" ON "PetCareReviewer"("name");
CREATE UNIQUE INDEX "PetCareArticle_slug_key" ON "PetCareArticle"("slug");
CREATE INDEX "PetCareArticle_status_updatedAt_idx" ON "PetCareArticle"("status", "updatedAt");
CREATE INDEX "PetCareArticle_categorySlug_status_idx" ON "PetCareArticle"("categorySlug", "status");
CREATE INDEX "PetCareArticle_reviewerId_idx" ON "PetCareArticle"("reviewerId");
CREATE INDEX "PetCareArticle_reviewDueAt_idx" ON "PetCareArticle"("reviewDueAt");
CREATE INDEX "PetCareArticle_featured_status_idx" ON "PetCareArticle"("featured", "status");
ALTER TABLE "PetCareArticle" ADD CONSTRAINT "PetCareArticle_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "PetCareReviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
