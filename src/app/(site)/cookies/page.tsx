import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "นโยบายคุกกี้ (Cookie Policy)" };

const COOKIES = [
  { name: "__Secure-better-auth.session_token", use: "จำว่าคุณเข้าสู่ระบบอยู่", age: "7 วัน (ต่ออายุเมื่อใช้งาน)" },
  { name: "__Secure-better-auth.session_data", use: "เก็บสำเนาการเข้าสู่ระบบแบบมีลายเซ็น ให้หน้าเว็บโหลดเร็วขึ้น", age: "5 นาที" },
  { name: "__Secure-better-auth.state", use: "ป้องกันการปลอมแปลงระหว่างเข้าสู่ระบบด้วย Google", age: "ระหว่างเข้าสู่ระบบเท่านั้น" },
];

const STORAGE = [
  { name: "cl-visit", use: "วันที่นับการเข้าชมล่าสุด เพื่อนับคุณวันละครั้ง", where: "Local Storage" },
  { name: "classroom-grade", use: "จำชั้นที่คุณเลือกในห้องเรียนออนไลน์", where: "Local Storage" },
  { name: "cl-intro", use: "แสดงฉากเปิดเว็บเพียงครั้งเดียวต่อการเปิดเบราว์เซอร์", where: "Session Storage" },
];

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="นโยบายคุกกี้"
      intro="คุกกี้คือไฟล์ข้อมูลขนาดเล็กที่เว็บไซต์เก็บไว้ในเบราว์เซอร์ของคุณ Connext Learning ใช้เฉพาะคุกกี้ที่จำเป็นต่อการทำงานของเว็บไซต์ ไม่มีคุกกี้โฆษณาหรือคุกกี้ติดตามจากบุคคลที่สาม"
    >
      <h2>1. คุกกี้ที่จำเป็น</h2>
      <p>ใช้เพื่อให้การเข้าสู่ระบบทำงานและปลอดภัย ไม่สามารถปิดได้ หากปิดคุกกี้ในเบราว์เซอร์ คุณจะเข้าสู่ระบบไม่ได้</p>
      <Table rows={COOKIES.map((c) => [c.name, c.use, c.age])} head={["ชื่อ", "ใช้เพื่อ", "อายุ"]} />

      <h2>2. ข้อมูลที่เก็บในเบราว์เซอร์ (Local / Session Storage)</h2>
      <p>ไม่ถูกส่งไปยังเซิร์ฟเวอร์และไม่ระบุตัวตน ใช้เพื่อความสะดวกในการใช้งานเท่านั้น</p>
      <Table rows={STORAGE.map((s) => [s.name, s.use, s.where])} head={["ชื่อ", "ใช้เพื่อ", "เก็บที่"]} />

      <h2>3. สิ่งที่เราไม่ใช้</h2>
      <ul>
        <li>คุกกี้โฆษณาหรือการติดตามข้ามเว็บไซต์</li>
        <li>เครื่องมือวิเคราะห์ของบุคคลที่สาม (เช่น Google Analytics หรือ Facebook Pixel)</li>
      </ul>
      <p>สถิติผู้เข้าชมที่แสดงท้ายเว็บไซต์ นับเป็นจำนวนรวมต่อวัน และไม่เก็บข้อมูลที่ระบุตัวตนได้</p>

      <h2>4. การจัดการคุกกี้</h2>
      <p>
        คุณลบคุกกี้และข้อมูลในเบราว์เซอร์ได้จากการตั้งค่าของเบราว์เซอร์ทุกเมื่อ การลบจะทำให้ออกจากระบบ
        และค่าที่จำไว้ เช่น ชั้นที่เลือกในห้องเรียนออนไลน์ จะกลับเป็นค่าเริ่มต้น
      </p>
    </LegalPage>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-line">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-primary-50/60 text-xs">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={String(r[0])}>
              {r.map((c, i) => <td key={i} className={`px-3 py-2 align-top ${i === 0 ? "font-mono text-xs text-ink" : ""}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
