/**
 * Prototype data for the sheets page.
 *
 *   npm run db:demo         → (re)create demo authors + approved demo sheets
 *   npm run db:demo:clear   → remove every demo record
 *
 * Demo authors use @connext-learning.invalid emails (they can never sign in) and
 * demo sheets use `demo/` pdf keys, so real data is never touched.
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Grade } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL!;
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const db = new PrismaClient({ adapter: isLocal ? new PrismaPg({ connectionString: url }) : new PrismaNeon({ connectionString: url }) });

const DEMO_DOMAIN = "connext-learning.invalid";

const AUTHORS = [
  "ปัณณวัฒน์ ใจดี",
  "ณัฐธิดา สุขใจ",
  "กิตติภัทร รักเรียน",
  "พิมพ์ชนก แก้วมณี",
  "ธนกฤต ศรีสมบูรณ์",
  "อรปรียา ทองดี",
];

type Demo = [title: string, subject: string, grade: Grade, semester: number, year: number, description: string];

const SHEETS: Demo[] = [
  ["สรุปเรื่องเซต และตรรกศาสตร์เบื้องต้น", "math", "M4", 1, 2569, "สรุปครบทุกหัวข้อ เซต สับเซต เพาเวอร์เซต การดำเนินการของเซต และตรรกศาสตร์เบื้องต้น พร้อมตัวอย่างข้อสอบ"],
  ["ลิมิตและความต่อเนื่องของฟังก์ชัน", "math", "M6", 1, 2568, "นิยามลิมิต ทฤษฎีบทลิมิต ความต่อเนื่อง และเทคนิคการหาลิมิตรูปแบบไม่กำหนด"],
  ["อัตราส่วนตรีโกณมิติ ม.3", "math", "M3", 2, 2568, "sin cos tan มุมพิเศษ 30 45 60 องศา และโจทย์การประยุกต์เรื่องมุมเงย มุมก้ม"],
  ["จำนวนเต็มและเลขยกกำลัง", "math", "M1", 1, 2569, "สมบัติของจำนวนเต็ม การบวก ลบ คูณ หาร และเลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็มบวก"],
  ["การเคลื่อนที่แนวตรง", "physics", "M4", 1, 2569, "ปริมาณสเกลาร์และเวกเตอร์ ความเร็ว ความเร่ง กราฟ s-t v-t และโจทย์ที่ออกสอบบ่อย"],
  ["ไฟฟ้าสถิตและไฟฟ้ากระแส", "physics", "M6", 1, 2568, "กฎของคูลอมบ์ สนามไฟฟ้า ศักย์ไฟฟ้า ตัวเก็บประจุ และวงจรไฟฟ้ากระแสตรง"],
  ["พันธะเคมี", "chemistry", "M4", 2, 2568, "พันธะไอออนิก พันธะโคเวเลนต์ พันธะโลหะ สรุปเป็นแผนภาพเข้าใจง่าย"],
  ["ปริมาณสารสัมพันธ์ (Stoichiometry)", "chemistry", "M5", 1, 2569, "โมล มวลโมเลกุล สูตรเอมพิริคัล การคำนวณจากสมการเคมี และสารกำหนดปริมาณ"],
  ["เซลล์และการแบ่งเซลล์", "biology", "M4", 1, 2568, "โครงสร้างเซลล์ ออร์แกเนลล์ ไมโทซิส ไมโอซิส สรุปพร้อมภาพประกอบ"],
  ["ระบบภูมิคุ้มกันของร่างกาย", "biology", "M5", 2, 2567, "ภูมิคุ้มกันก่อเองและรับมา เซลล์เม็ดเลือดขาว แอนติบอดี และวัคซีน"],
  ["ระบบสุริยะและวิวัฒนาการของดาว", "astronomy", "M6", 1, 2569, "กำเนิดระบบสุริยะ วิวัฒนาการของดาวฤกษ์ แผนภาพ H-R และกาแล็กซี"],
  ["เอกภพและกาแล็กซี", "astronomy", "M5", 2, 2568, "ทฤษฎีบิกแบง หลักฐานการขยายตัวของเอกภพ และโครงสร้างกาแล็กซีทางช้างเผือก"],
  ["สารและสมบัติของสาร", "science", "M1", 1, 2569, "สถานะของสาร การเปลี่ยนสถานะ สารบริสุทธิ์และสารผสม การแยกสาร"],
  ["แรงและการเคลื่อนที่ ม.2", "science", "M2", 1, 2568, "แรงลัพธ์ แรงเสียดทาน โมเมนต์ของแรง และงานกับพลังงาน"],
  ["ระบบนิเวศและความหลากหลายทางชีวภาพ", "science", "M3", 2, 2567, "องค์ประกอบของระบบนิเวศ ห่วงโซ่อาหาร สายใยอาหาร และการอนุรักษ์"],
  ["Present Simple vs Present Continuous", "english", "M1", 1, 2569, "Grammar summary with examples, signal words and common mistakes"],
  ["Reading Skills: Main Idea & Inference", "english", "M5", 1, 2568, "เทคนิคหาใจความสำคัญ การอนุมาน และคำศัพท์ที่มักพบในข้อสอบ"],
  ["Tenses ครบ 12 Tenses", "english", "M3", 2, 2568, "ตารางสรุปโครงสร้าง 12 tenses พร้อมตัวอย่างประโยคและการใช้งาน"],
  ["หลักภาษาไทย คำและชนิดของคำ", "thai", "M2", 2, 2567, "ชนิดของคำ 7 ชนิด หน้าที่ของคำ พร้อมแบบฝึกหัดท้ายบท"],
  ["วรรณคดี ขุนช้างขุนแผน", "thai", "M6", 1, 2568, "เรื่องย่อ ตัวละคร คุณค่าด้านวรรณศิลป์ และคำศัพท์สำคัญ"],
  ["ภูมิศาสตร์ทวีปยุโรป", "other-lower", "M3", 2, 2568, "ลักษณะภูมิประเทศ ภูมิอากาศ ทรัพยากร และประชากรของทวีปยุโรป"],
  ["ประวัติศาสตร์สุโขทัย", "other-lower", "M1", 2, 2569, "การสถาปนาอาณาจักร การเมืองการปกครอง เศรษฐกิจ และมรดกทางวัฒนธรรม"],
  ["ประวัติศาสตร์ไทยสมัยรัตนโกสินทร์", "other-upper", "M5", 1, 2566, "เหตุการณ์สำคัญ การปฏิรูปสมัยรัชกาลที่ 5 สรุปเป็นไทม์ไลน์"],
  ["เศรษฐศาสตร์เบื้องต้น อุปสงค์ อุปทาน", "other-upper", "M4", 2, 2568, "กฎอุปสงค์ อุปทาน ดุลยภาพตลาด และความยืดหยุ่น พร้อมกราฟประกอบ"],
];

async function clear() {
  const res = await db.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } }); // sheets cascade
  const orphan = await db.sheet.deleteMany({ where: { pdfKey: { startsWith: "demo/" } } });
  console.log(`Removed ${res.count} demo authors and their sheets (+${orphan.count} leftover demo sheets).`);
}

async function seed() {
  await clear();
  const authors = await Promise.all(
    AUTHORS.map((name, i) =>
      db.user.create({
        data: { id: `demo-user-${i + 1}`, name, email: `demo${i + 1}@${DEMO_DOMAIN}`, emailVerified: true },
      }),
    ),
  );
  const now = Date.now();
  for (const [i, [title, subjectId, grade, semester, academicYear, description]] of SHEETS.entries()) {
    // Spread dates (7 is coprime with 24) so the newest page mixes subjects
    const when = new Date(now - (((i * 7) % SHEETS.length) * 2.5 + 0.5) * 86_400_000);
    await db.sheet.create({
      data: {
        title,
        description,
        subjectId,
        grade,
        semester,
        academicYear,
        status: "APPROVED",
        pdfKey: `demo/${i + 1}.pdf`,
        pdfBytes: 1_500_000 + ((i * 377_000) % 3_000_000),
        pageCount: 6 + ((i * 7) % 20),
        viewCount: 40 + ((i * 97 + 53) % 460),
        authorId: authors[i % authors.length].id,
        publishedAt: when,
        createdAt: when,
      },
    });
  }
  console.log(`Created ${authors.length} demo authors and ${SHEETS.length} demo sheets.`);
}

(process.argv.includes("--clear") ? clear() : seed())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
