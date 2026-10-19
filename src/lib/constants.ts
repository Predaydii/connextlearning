import type { Grade } from "@/generated/prisma/enums";

export const SCHOOL_DOMAIN = "tkschool.ac.th";

export const GRADES: { value: Grade; label: string; full: string }[] = [
  { value: "M1", label: "ม.1", full: "มัธยมศึกษาปีที่ 1" },
  { value: "M2", label: "ม.2", full: "มัธยมศึกษาปีที่ 2" },
  { value: "M3", label: "ม.3", full: "มัธยมศึกษาปีที่ 3" },
  { value: "M4", label: "ม.4", full: "มัธยมศึกษาปีที่ 4" },
  { value: "M5", label: "ม.5", full: "มัธยมศึกษาปีที่ 5" },
  { value: "M6", label: "ม.6", full: "มัธยมศึกษาปีที่ 6" },
];
export const GRADE_VALUES = GRADES.map((g) => g.value) as [Grade, ...Grade[]];
export const LOWER_GRADES: Grade[] = ["M1", "M2", "M3"];
export const UPPER_GRADES: Grade[] = ["M4", "M5", "M6"];

export function gradeLabel(g: Grade) {
  return GRADES.find((x) => x.value === g)?.label ?? g;
}

/**
 * Subjects are seeded into the `Subject` table (see prisma/seed.ts) so that the
 * admin can attach a cover image to each one. `levels` limits which grades a
 * subject may be uploaded for. `color` / `text` style the subject badge.
 */
export const SUBJECTS: { id: string; name: string; color: string; text: string; levels?: Grade[] }[] = [
  { id: "math", name: "คณิตศาสตร์", color: "#0284c7", text: "#ffffff" }, // ฟ้า
  { id: "physics", name: "ฟิสิกส์", color: "#dc2626", text: "#ffffff" }, // แดง
  { id: "chemistry", name: "เคมี", color: "#facc15", text: "#422006" }, // เหลือง
  { id: "biology", name: "ชีววิทยา", color: "#15803d", text: "#ffffff" }, // เขียว
  { id: "astronomy", name: "ดาราศาสตร์", color: "#ea580c", text: "#ffffff" }, // ส้ม
  { id: "science", name: "วิทยาศาสตร์", color: "#16a34a", text: "#ffffff" }, // เขียว
  { id: "english", name: "ภาษาอังกฤษ", color: "#7c3aed", text: "#ffffff" }, // ม่วง
  { id: "thai", name: "ภาษาไทย", color: "#db2777", text: "#ffffff" }, // ชมพู
  { id: "other-lower", name: "วิชาอื่น ๆ ม.ต้น", color: "#1e40af", text: "#ffffff", levels: LOWER_GRADES }, // น้ำเงิน
  { id: "other-upper", name: "วิชาอื่น ๆ ม.ปลาย", color: "#1e40af", text: "#ffffff", levels: UPPER_GRADES }, // น้ำเงิน
];
export const SUBJECT_IDS = SUBJECTS.map((s) => s.id) as [string, ...string[]];

export function subjectName(id: string) {
  return SUBJECTS.find((s) => s.id === id)?.name ?? id;
}

export function subjectColor(id: string) {
  const s = SUBJECTS.find((x) => x.id === id);
  return { background: s?.color ?? "#203cc7", color: s?.text ?? "#ffffff" };
}

export const SEMESTERS = [1, 2] as const;
export const ACADEMIC_YEARS = [2569, 2568, 2567, 2566, 2565] as const;

// Upload limits
export const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
} as const;
export type AcceptedMime = keyof typeof ACCEPTED_TYPES;
export const MAX_FILES = 30;
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file
export const MAX_TOTAL_BYTES = 80 * 1024 * 1024; // 80 MB per sheet
export const MAX_PAGES = 300;
export const UPLOADS_PER_DAY = 20;

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;

export const PAGE_SIZE = 24;

// Comments
export const COMMENT_MAX = 1000;
export const COMMENTS_PER_WINDOW = 10;
export const COMMENT_WINDOW_MIN = 10;
