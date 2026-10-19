import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SUBJECTS } from "../src/lib/constants";

const url = process.env.DATABASE_URL!;
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const db = new PrismaClient({ adapter: isLocal ? new PrismaPg({ connectionString: url }) : new PrismaNeon({ connectionString: url }) });

async function main() {
  for (const [i, s] of SUBJECTS.entries()) {
    await db.subject.upsert({
      where: { id: s.id },
      create: { id: s.id, name: s.name, sortOrder: i },
      update: { name: s.name, sortOrder: i },
    });
  }
  await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  console.log(`Seeded ${SUBJECTS.length} subjects and site settings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
