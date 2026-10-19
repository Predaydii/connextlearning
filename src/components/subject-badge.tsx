import { subjectColor } from "@/lib/constants";

/** Subject pill in the subject's own colour (คณิต ฟ้า, ฟิสิกส์ แดง, …). */
export function SubjectBadge({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${className}`} style={subjectColor(id)}>
      {name}
    </span>
  );
}
