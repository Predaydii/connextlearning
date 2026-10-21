-- CreateTable
CREATE TABLE "NewsCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsCategory_name_key" ON "NewsCategory"("name");


-- Start with the categories the app used to have built in
INSERT INTO "NewsCategory" ("id", "name", "sortOrder") VALUES
  (gen_random_uuid()::text, 'ประกาศ', 1),
  (gen_random_uuid()::text, 'กิจกรรม', 2),
  (gen_random_uuid()::text, 'การสอบ', 3),
  (gen_random_uuid()::text, 'ทุนการศึกษา', 4),
  (gen_random_uuid()::text, 'แนะแนว / ศึกษาต่อ', 5),
  (gen_random_uuid()::text, 'อื่น ๆ', 6)
ON CONFLICT ("name") DO NOTHING;
