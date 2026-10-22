-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "siteName" TEXT;

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

