-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "faviconKey" TEXT,
ADD COLUMN     "ogImageKey" TEXT;

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "category" TEXT;

