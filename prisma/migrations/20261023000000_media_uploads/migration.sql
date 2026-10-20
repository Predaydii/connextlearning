-- AlterTable
-- "newsVideoId" (YouTube) is no longer used; it is dropped in a later migration so the
-- currently deployed code keeps working until this release is live.
ALTER TABLE "SiteSetting" ADD COLUMN     "homeVideoKey" TEXT,
ADD COLUMN     "newsVideoKey" TEXT;

-- CreateTable
CREATE TABLE "HomeImage" (
    "slot" INTEGER NOT NULL,
    "imageKey" TEXT NOT NULL,

    CONSTRAINT "HomeImage_pkey" PRIMARY KEY ("slot")
);
