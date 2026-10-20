-- AlterEnum
ALTER TYPE "MemberType" ADD VALUE 'TEACHER';

-- AlterEnum
ALTER TYPE "SheetStatus" ADD VALUE 'HIDDEN';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "department" TEXT,
ADD COLUMN     "teachGrades" "Grade"[];

