-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "igAccessToken" TEXT,
ADD COLUMN     "igTokenExpiresAt" TIMESTAMP(3);
