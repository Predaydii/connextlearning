# Connext Learning

พื้นที่เรียนออนไลน์และระบบแชร์ชีทสรุปของโรงเรียนตราษตระการคุณ

**Stack:** Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Prisma 7 + Neon (Postgres) · Better Auth (Google) · Cloudflare R2

## ฟีเจอร์

| หน้า | สิทธิ์ | รายละเอียด |
| --- | --- | --- |
| `/` | ทุกคน | Landing page (static, cache ที่ CDN) |
| `/sheets` | ทุกคน | รวมชีทที่อนุมัติแล้ว · ตัวกรองระดับชั้น / วิชา / ภาคเรียน / ปีการศึกษา · ค้นหา · เรียงล่าสุด/ยอดนิยม |
| `/sheets/[id]` | ล็อกอิน | รายละเอียด + ปุ่มอ่านชีท (เปิด PDF จาก R2 ผ่านลิงก์ที่ใช้ได้ 5 นาที) · นับผู้เข้าชม 1 ครั้งต่อคน |
| `/sheets/upload` | ล็อกอิน | อัปโหลด PDF/PNG/JPG หลายไฟล์ จัดลำดับได้ → ระบบรวมเป็น PDF → เก็บใน R2 (ส่วนตัว) → รอตรวจ |
| `/sheets/[id]#community` | ทุกคนดู · ล็อกอินเพื่อร่วม | ให้ดาว 1–5 (ให้ชีทตัวเองไม่ได้) · คอมเมนต์ (≤1,000 ตัวอักษร, 10 ครั้ง/10 นาที) · ผู้เขียนหรือแอดมินลบคอมเมนต์ได้ |
| `/u/[id]` | ทุกคน | โปรไฟล์ผู้จัดทำ: ชื่อ รูป ชีทที่เผยแพร่ ยอดเข้าชมรวม คะแนนเฉลี่ย (ไม่แสดงอีเมล · noindex) |
| `/my-sheets` | ล็อกอิน | ชีทของฉัน สถานะ และเหตุผลกรณีไม่อนุมัติ |
| `admin.…/` | แอดมิน | แดชบอร์ดสถิติ |
| `admin.…/sheets` | แอดมิน | คิวตรวจสอบ · อนุมัติ (เผยแพร่) / ไม่อนุมัติ (ซ่อนทันที) / ลบ · เปลี่ยนภาพปกรายชีท |
| `admin.…/covers` | แอดมิน | ภาพปก 16:9 แบบ "เหมือนกันทั้งหมด" หรือ "แยกตามวิชา" |

### โดเมน

| | URL |
| --- | --- |
| เว็บไซต์หลัก | `https://connextlearning.tratcouncil.com` |
| ผู้ดูแลระบบ | `https://connextlearning.tratcouncil.com/admin` |

แอปมีโดเมนของตัวเองและเสิร์ฟที่ root (`BASE_PATH = ""` ใน `src/lib/urls.ts`) · ตอน dev เปิดที่ `http://localhost:3000`
ลิงก์เก่า `tratcouncil.com/connextlearning/…` ถูก redirect (308) ไปหน้าเดียวกันบนโดเมนใหม่ (`redirects()` ใน `next.config.ts`) ตราบที่เว็บ tratcouncil.com ยังส่งต่อ path นี้มา

ล็อกอินได้เฉพาะบัญชี Google `@tkschool.ac.th` (ตรวจทั้ง `hd` claim ของ Google และโดเมนอีเมลฝั่งเซิร์ฟเวอร์) · แอดมินกำหนดด้วย `ADMIN_EMAILS`

### ลำดับการอัปโหลด

1. เบราว์เซอร์ขอ presigned URL (server action ตรวจสิทธิ์ ชนิดไฟล์ ขนาด โควตา 20 ชีท/วัน)
2. เบราว์เซอร์อัปโหลดไฟล์ตรงไป R2 (`uploads/<userId>/…`) ไม่ผ่านเซิร์ฟเวอร์ → ไม่ติดลิมิต body size
3. เซิร์ฟเวอร์ตรวจ magic bytes จริงของไฟล์ · รวมเป็น PDF (รูปถูกย่อ/ลบ EXIF ด้วย sharp) · บันทึก `sheets/<uuid>.pdf` ใน R2 · ลบไฟล์ต้นฉบับ
4. แอดมินอนุมัติ → แสดงในหน้าสาธารณะ · ปุ่ม "อ่านชีท" ต้องล็อกอิน แล้ว redirect ไปลิงก์ R2 แบบ signed อายุ 5 นาที (bucket ไม่เปิดสาธารณะ)

## ตั้งค่าครั้งแรก

```bash
npm install
cp .env.example .env   # แล้วกรอกค่า
npm run db:deploy      # สร้างตาราง
npm run db:seed        # ใส่รายชื่อวิชาและค่าเริ่มต้น
npm run dev
```

### 1. Neon
สร้างโปรเจกต์ (แนะนำ region Singapore) → คัดลอก connection string แบบ **pooled** ใส่ `DATABASE_URL` และแบบ **direct** ใส่ `DIRECT_URL`

### 2. Google OAuth (ล็อกอิน)
Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application)
- Authorized JavaScript origins: `https://connextlearning.tratcouncil.com`, `http://localhost:3000`
- Authorized redirect URIs: `https://connextlearning.tratcouncil.com/api/auth/callback/google` และ `http://localhost:3000/api/auth/callback/google`
- OAuth consent screen: ตั้งเป็น **Internal** ถ้าโปรเจกต์อยู่ใต้ Workspace ของโรงเรียน ไม่อย่างนั้นต้อง **Publish app** (สถานะ In production) ไม่เช่นนั้นล็อกอินได้เฉพาะ Test users

### 3. Cloudflare R2
1. สร้าง bucket (ไม่ต้องเปิด public access) → R2 API token สิทธิ์ Object Read & Write เฉพาะ bucket นี้
2. **CORS** ของ bucket (ให้เบราว์เซอร์อัปโหลดตรงได้):
   ```json
   [{ "AllowedOrigins": ["https://connextlearning.tratcouncil.com", "http://localhost:3000"], "AllowedMethods": ["PUT", "GET", "HEAD"], "AllowedHeaders": ["content-type"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3600 }]
   ```
3. **Lifecycle rule:** ลบ object prefix `uploads/` อายุเกิน 1 วัน (กันไฟล์ค้างกรณีอัปโหลดไม่จบ)

ภาพปกที่แอดมินอัปโหลดถูกเสิร์ฟผ่าน `/media/covers/...` (อ่านจาก R2 แล้ว cache ที่ CDN แบบ immutable) ไฟล์อื่นใน bucket ไม่เปิดสาธารณะ

## Deploy (Vercel)

1. Import โปรเจกต์ → ใส่ environment variables ทั้งหมดจาก `.env.example`
   (ตัวแปร `NEXT_PUBLIC_*` ถูกฝังตอน build ต้องตั้งก่อน deploy)
2. Domains → เพิ่ม `connextlearning.tratcouncil.com` แล้วตั้ง DNS: `CNAME connextlearning → cname.vercel-dns.com`
   ตั้ง `BETTER_AUTH_URL=https://connextlearning.tratcouncil.com`
3. Build command ค่าเริ่มต้น (`npm run build` จะ `prisma generate` ให้)
4. ครั้งแรกและทุกครั้งที่ schema เปลี่ยน: `npm run db:deploy`
5. ตรวจว่าโดเมนจริงอยู่ใน Google OAuth, R2 CORS และ `BETTER_AUTH_URL` แล้ว

## ความปลอดภัยและการรองรับผู้ใช้

- Security headers (CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy) ตั้งใน `next.config.ts`
- ทุก server action / route ตรวจสิทธิ์ซ้ำฝั่งเซิร์ฟเวอร์ · ตรวจ input ด้วย zod · Prisma ใช้ parameterized query
- Server Actions มีการตรวจ Origin (กัน CSRF) · Better Auth มี rate limit (เก็บใน DB)
- ลิงก์ PDF ออกให้เฉพาะผู้ที่ล็อกอิน และหมดอายุใน 5 นาที · PDF ส่วนตัว (ก่อนอนุมัติ) ดูได้เฉพาะแอดมินและเจ้าของ
- รองรับ ~2,500 คนพร้อมกัน: หน้าแรกเป็น static · รายการชีท/ตัวกรอง cache 60 วินาที (ล้างทันทีเมื่อแอดมินอนุมัติ) · session อ่านจาก cookie cache ส่วนใหญ่ไม่แตะ DB · ไฟล์อัปโหลด/อ่านตรงกับ R2 ไม่ผ่านเซิร์ฟเวอร์ (R2 ไม่คิดค่า egress) · Neon ใช้ pooled connection

## คำสั่ง

| คำสั่ง | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | build / รัน production |
| `npm run lint` · `npm run typecheck` | ตรวจโค้ด |
| `npm run db:migrate` | สร้าง migration ใหม่หลังแก้ `prisma/schema.prisma` |
| `npm run db:deploy` · `npm run db:seed` | apply migration · ใส่ข้อมูลเริ่มต้น |

รูปภาพ Landing page อยู่ใน `public/img` (แทนที่ `public/img/sheets/*` ได้โดยใช้ชื่อเดิม) · ภาพปกเริ่มต้นรายวิชาอยู่ใน `public/covers`
