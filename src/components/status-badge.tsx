import type { SheetStatus } from "@/generated/prisma/enums";

const STYLES: Record<SheetStatus, { label: string; cls: string }> = {
  PENDING: { label: "รอตรวจสอบ", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  APPROVED: { label: "เผยแพร่แล้ว", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  REJECTED: { label: "ไม่อนุมัติ", cls: "bg-red-100 text-red-700 ring-red-200" },
};

export function StatusBadge({ status }: { status: SheetStatus }) {
  const s = STYLES[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>{s.label}</span>;
}
