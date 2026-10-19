# Connext Learning

พื้นที่เรียนออนไลน์และระบบแชร์ชีทสรุปของโรงเรียนตราษตระการคุณ

**Stack:** Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Prisma 7 + Neon (Postgres) · Better Auth (Google) · Cloudflare R2 · Google Drive API

## ฟีเจอร์

| หน้า | สิทธิ์ | รายละเอียด |
| --- | --- | --- |
| `/` | ทุกคน | Landing page (static, cache ที่ CDN) |
| `/sheets` | ทุกคน | รวมชีทที่อนุมัติแล้ว · ตัวกรองระดับชั้น / วิชา / ภาคเรียน / ปีการศึกษา · ค้นหา · เรียงล่าสุด/ยอดนิยม |
| `/sheets/[id]` | ล็อกอิน | รายละเอียด + ปุ่มเปิดอ่านบน Google Drive + ตัวอย่างไฟล์ · นับผู้เข้าชม 1 ครั้งต่อคน |
| `/sheets/upload` | ล็อกอิน | อัปโหลด PDF/PNG/JPG หลายไฟล์ จัดลำดับได้ → ระบบรวมเป็น PDF → เก็บใน R2 + Google Drive → รอตรวจ |
| `/sheets/[id]#community` | ทุกคนดู · ล็อกอินเพื่อร่วม | ให้ดาว 1–5 (ให้ชีทตัวเองไม่ได้) · คอมเมนต์ (≤1,000 ตัวอักษร, 10 ครั้ง/10 นาที) · ผู้เขียนหรือแอดมินลบคอมเมนต์ได้ |
| `/u/[id]` | ทุกคน | โปรไฟล์ผู้จัดทำ: ชื่อ รูป ชีทที่เผยแพร่ ยอดเข้าชมรวม คะแนนเฉลี่ย (ไม่แสดงอีเมล · noindex) |
| `/my-sheets` | ล็อกอิน | ชีทของฉัน สถานะ และเหตุผลกรณีไม่อนุมัติ |
| `admin.…/` | แอดมิน | แดชบอร์ดสถิติ |
| `admin.…/sheets` | แอดมิน | คิวตรวจสอบ · อนุมัติ (เผยแพร่ลิงก์ Drive) / ไม่อนุมัติ (ถอดไฟล์จาก Drive) / ลบ · เปลี่ยนภาพปกรายชีท |
| `admin.…/covers` | แอดมิน | ภาพปก 16:9 แบบ "เหมือนกันทั้งหมด" หรือ "แยกตามวิชา" |

### โดเมน

| | URL |
| --- | --- |
| เว็บไซต์หลัก | `https://tratcouncil.com/connextlearning` |
| ผู้ดูแลระบบ | `https://tratcouncil.com/connextlearning/admin` |

แอปตั้ง `basePath` เป็น `/connextlearning` (ค่าอยู่ที่ `BASE_PATH` ใน `src/lib/urls.ts`) · ตอน dev เปิดที่ `http://localhost:3000/connextlearning`
`<Link>`, `router.push` และ `redirect()` เติม base path ให้เอง แต่ `<a>`, `<img>`, `<iframe>` และ callback ของ Better Auth ต้องครอบด้วย `withBase()`

ล็อกอินได้เฉพาะบัญชี Google `@tkschool.ac.th` (ตรวจทั้ง `hd` claim ของ Google และโดเมนอีเมลฝั่งเซิร์ฟเวอร์) · แอดมินกำหนดด้วย `ADMIN_EMAILS`

### ลำดับการอัปโหลด

1. เบราว์เซอร์ขอ presigned URL (server action ตรวจสิทธิ์ ชนิดไฟล์ ขนาด โควตา 20 ชีท/วัน)
2. เบราว์เซอร์อัปโหลดไฟล์ตรงไป R2 (`uploads/<userId>/…`) ไม่ผ่านเซิร์ฟเวอร์ → ไม่ติดลิมิต body size
3. เซิร์ฟเวอร์ตรวจ magic bytes จริงของไฟล์ · รวมเป็น PDF (รูปถูกย่อ/ลบ EXIF ด้วย sharp) · บันทึก `sheets/<uuid>.pdf` ใน R2 · อัปโหลดขึ้น Drive (ยังไม่แชร์) · ลบไฟล์ต้นฉบับ
4. แอดมินอนุมัติ → ตั้งสิทธิ์ Drive เป็น "ทุกคนที่มีลิงก์" (หรือเฉพาะโดเมนโรงเรียน) → แสดงในหน้าสาธารณะ

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
- Authorized JavaScript origins: `https://tratcouncil.com`, `http://localhost:3000`
- Authorized redirect URIs: `https://tratcouncil.com/connextlearning/api/auth/callback/google` และ `http://localhost:3000/connextlearning/api/auth/callback/google`
- OAuth consent screen: ตั้งเป็น **Internal** (จำกัดเฉพาะองค์กร tkschool.ac.th) ถ้าโปรเจกต์อยู่ใต้ Workspace ของโรงเรียน

### 3. Google Drive
**แบบ A – Service account (แนะนำ)**
1. เปิดใช้ Google Drive API · สร้าง Service account → Keys → JSON
2. สร้าง **Shared Drive** (service account ไม่มีพื้นที่เก็บของตัวเอง) → เพิ่มอีเมล service account เป็น *Content manager*
3. สร้างโฟลเดอร์ใน Shared Drive → คัดลอก ID จาก URL ใส่ `GOOGLE_DRIVE_FOLDER_ID`
4. ใส่ `client_email` และ `private_key` ลง `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

**แบบ B – บัญชีปกติ:** ขอ refresh token (scope `https://www.googleapis.com/auth/drive`) ด้วย OAuth client เดียวกัน แล้วใส่ `GOOGLE_DRIVE_REFRESH_TOKEN`

> ถ้าผู้ดูแล Workspace ปิดการแชร์ลิงก์ออกนอกองค์กร ให้ตั้ง `GOOGLE_DRIVE_SHARE_MODE="domain"`

### 4. Cloudflare R2
1. สร้าง bucket (ไม่ต้องเปิด public access) → R2 API token สิทธิ์ Object Read & Write เฉพาะ bucket นี้
2. **CORS** ของ bucket (ให้เบราว์เซอร์อัปโหลดตรงได้):
   ```json
   [{ "AllowedOrigins": ["https://tratcouncil.com", "http://localhost:3000"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
   ```
3. **Lifecycle rule:** ลบ object prefix `uploads/` อายุเกิน 1 วัน (กันไฟล์ค้างกรณีอัปโหลดไม่จบ)

ภาพปกที่แอดมินอัปโหลดถูกเสิร์ฟผ่าน `/media/covers/...` (อ่านจาก R2 แล้ว cache ที่ CDN แบบ immutable) ไฟล์อื่นใน bucket ไม่เปิดสาธารณะ

## Deploy (Vercel)

1. Import โปรเจกต์ → ใส่ environment variables ทั้งหมดจาก `.env.example`
   (ตัวแปร `NEXT_PUBLIC_*` ถูกฝังตอน build ต้องตั้งก่อน deploy)
2. ไม่ต้องผูกโดเมนกับโปรเจกต์นี้ ให้โปรเจกต์ของ tratcouncil.com ส่งต่อ path มาแทน โดยเพิ่มใน `vercel.json` ของโปรเจกต์นั้น
   (แทน `<connext>` ด้วยโดเมน `.vercel.app` ของโปรเจกต์นี้):
   ```json
   { "rewrites": [
     { "source": "/connextlearning", "destination": "https://<connext>.vercel.app/connextlearning" },
     { "source": "/connextlearning/:path*", "destination": "https://<connext>.vercel.app/connextlearning/:path*" }
   ] }
   ```
   Server Actions รับ Origin `tratcouncil.com` ได้แล้ว (`allowedOrigins` ใน `next.config.ts`)
3. Build command ค่าเริ่มต้น (`npm run build` จะ `prisma generate` ให้)
4. ครั้งแรกและทุกครั้งที่ schema เปลี่ยน: `npm run db:deploy`
5. ตรวจว่าโดเมนจริงอยู่ใน Google OAuth, R2 CORS และ `BETTER_AUTH_URL` แล้ว

## ความปลอดภัยและการรองรับผู้ใช้

- Security headers (CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy) ตั้งใน `next.config.ts`
- ทุก server action / route ตรวจสิทธิ์ซ้ำฝั่งเซิร์ฟเวอร์ · ตรวจ input ด้วย zod · Prisma ใช้ parameterized query
- Server Actions มีการตรวจ Origin (กัน CSRF) · Better Auth มี rate limit (เก็บใน DB)
- ลิงก์ Drive ถูกส่งให้เฉพาะผู้ที่ล็อกอิน · PDF ส่วนตัว (ก่อนอนุมัติ) ดูได้เฉพาะแอดมินและเจ้าของ
- รองรับ ~2,500 คนพร้อมกัน: หน้าแรกเป็น static · รายการชีท/ตัวกรอง cache 60 วินาที (ล้างทันทีเมื่อแอดมินอนุมัติ) · session อ่านจาก cookie cache ส่วนใหญ่ไม่แตะ DB · ไฟล์ไปตรง R2/Drive ไม่ผ่านเซิร์ฟเวอร์ · Neon ใช้ pooled connection

## คำสั่ง

| คำสั่ง | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | build / รัน production |
| `npm run lint` · `npm run typecheck` | ตรวจโค้ด |
| `npm run db:migrate` | สร้าง migration ใหม่หลังแก้ `prisma/schema.prisma` |
| `npm run db:deploy` · `npm run db:seed` | apply migration · ใส่ข้อมูลเริ่มต้น |

รูปภาพ Landing page อยู่ใน `public/img` (แทนที่ `public/img/sheets/*` ได้โดยใช้ชื่อเดิม) · ภาพปกเริ่มต้นรายวิชาอยู่ใน `public/covers`
