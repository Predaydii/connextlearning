-- Stars and comments are gone
DROP TABLE "Rating";
DROP TABLE "Comment";

-- Cover modes: "same cover for every sheet" becomes "first page of the sheet"
UPDATE "SiteSetting" SET "coverMode" = 'SUBJECT' WHERE "coverMode" = 'UNIFORM';
ALTER TYPE "CoverMode" RENAME VALUE 'UNIFORM' TO 'FIRST_PAGE';
ALTER TABLE "SiteSetting" DROP COLUMN "uniformCoverKey";
ALTER TABLE "Sheet" ADD COLUMN "pageCoverKey" TEXT;

-- Pop-up messages from admins
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_active_createdAt_idx" ON "Announcement"("active", "createdAt" DESC);
