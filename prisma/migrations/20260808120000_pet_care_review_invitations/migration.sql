ALTER TABLE "PetCareReviewer" ADD COLUMN "email" TEXT;

ALTER TABLE "PetCarePreviewShare"
ADD COLUMN "invitationRecipient" TEXT,
ADD COLUMN "invitationSentAt" TIMESTAMP(3);

CREATE INDEX "PetCareReviewer_email_idx" ON "PetCareReviewer"("email");
CREATE INDEX "PetCarePreviewShare_invitationSentAt_idx" ON "PetCarePreviewShare"("invitationSentAt");
