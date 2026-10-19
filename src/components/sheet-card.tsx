import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { gradeLabel } from "@/lib/constants";
import { formatThaiDate, formatNumber } from "@/lib/format";
import type { SheetCardData } from "@/lib/queries";
import { SubjectBadge } from "@/components/subject-badge";

export function SheetCard({ sheet, priority = false }: { sheet: SheetCardData; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg">
      <div className="relative aspect-video overflow-hidden bg-primary-50">
        <img
          src={sheet.cover.small}
          srcSet={`${sheet.cover.small} 640w, ${sheet.cover.large} 1280w`}
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 45vw, 92vw"
          width={640}
          height={360}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white shadow">
          {gradeLabel(sheet.grade)}
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-ink shadow-sm backdrop-blur">
          เทอม {sheet.semester}/{sheet.academicYear}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 min-h-[2.6em] text-lg leading-snug font-semibold">
          {/* Stretched link: the whole card is clickable */}
          <Link href={`/sheets/${sheet.id}`} className="after:absolute after:inset-0 after:content-['']">
            {sheet.title}
          </Link>
        </h3>
        <div className="mt-2.5">
          <SubjectBadge id={sheet.subjectId} name={sheet.subjectName} />
        </div>
        <p className="mt-3 line-clamp-2 text-sm">{sheet.excerpt}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-body/80">
          <CalendarIcon />
          <time dateTime={sheet.createdAt}>{formatThaiDate(sheet.createdAt)}</time>
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        {/* Sits above the card's stretched link so it opens the author's profile */}
        <Link href={`/u/${sheet.author.id}`} className="relative z-10 flex min-w-0 items-center gap-2 hover:text-primary">
          <Avatar name={sheet.author.name} image={sheet.author.image} size={28} />
          <span className="truncate text-sm font-medium text-ink hover:text-primary">{sheet.author.name}</span>
        </Link>
        <span className="flex shrink-0 items-center gap-1 text-sm text-primary" title="จำนวนผู้เข้าชม">
          <EyeIcon />
          {formatNumber(sheet.viewCount)}
        </span>
      </div>
    </article>
  );
}

export function EyeIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function CalendarIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

/** Compact horizontal card (thumbnail + title), used for recommendations. */
export function SheetCardCompact({ sheet }: { sheet: SheetCardData }) {
  return (
    <article className="group relative flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-card ring-1 ring-line/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-brand">
      <img
        src={sheet.cover.small}
        width={640}
        height={360}
        alt=""
        loading="lazy"
        decoding="async"
        className="aspect-video w-28 shrink-0 rounded-xl object-cover sm:w-32"
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-ink">
          <Link href={`/sheets/${sheet.id}`} className="after:absolute after:inset-0 after:content-['']">
            {sheet.title}
          </Link>
        </h3>
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          <SubjectBadge id={sheet.subjectId} name={sheet.subjectName} className="!px-2 !text-[11px]" />
          <span className="text-body/80">{gradeLabel(sheet.grade)}</span>
          <span className="ml-auto flex items-center gap-1 text-primary"><EyeIcon className="size-3.5" />{formatNumber(sheet.viewCount)}</span>
        </div>
      </div>
    </article>
  );
}
