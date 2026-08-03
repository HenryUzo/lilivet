CREATE TYPE "PetCarePreviewShareType" AS ENUM ('COMMENT', 'REVIEWER');

CREATE TABLE "PetCarePreviewShare" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "shareType" "PetCarePreviewShareType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByStaffUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PetCarePreviewShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PetCarePreviewComment" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PetCarePreviewComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PetCarePreviewShare_tokenHash_key" ON "PetCarePreviewShare"("tokenHash");
CREATE INDEX "PetCarePreviewShare_articleId_createdAt_idx" ON "PetCarePreviewShare"("articleId", "createdAt");
CREATE INDEX "PetCarePreviewShare_expiresAt_idx" ON "PetCarePreviewShare"("expiresAt");
CREATE INDEX "PetCarePreviewComment_shareId_createdAt_idx" ON "PetCarePreviewComment"("shareId", "createdAt");
ALTER TABLE "PetCarePreviewShare" ADD CONSTRAINT "PetCarePreviewShare_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "PetCareArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetCarePreviewComment" ADD CONSTRAINT "PetCarePreviewComment_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "PetCarePreviewShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
