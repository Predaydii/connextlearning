-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('STUDENT', 'ALUMNI');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "gradYear" INTEGER,
ADD COLUMN     "grade" "Grade",
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "memberType" "MemberType",
ADD COLUMN     "prefix" TEXT,
ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "room" INTEGER,
ADD COLUMN     "studentNo" INTEGER;

-- CreateTable
CREATE TABLE "SiteVisit" (
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("day")
);

