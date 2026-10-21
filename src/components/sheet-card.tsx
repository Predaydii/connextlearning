import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { gradeLabel } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { SheetCardData } from "@/lib/queries";
import { SubjectBadge } from "@/components/subject-badge";

/**
 * Phones: a short row (cover on the left, title and meta on the right).
 * Tablets and up: the vertical card with the cover on top.
 */
export function SheetCard({ sheet, priority = false }: { sheet: SheetCardData; priority?: boolean }) {
  return (
    <article className="group relative flex h-full gap-3 overflow-hidden rounded-2xl bg-white p-2.5 shadow-card ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg sm:flex-col sm:gap-0 sm:p-0">
      <div className="relative aspect-video w-32 shrink-0 self-start overflow-hidden rounded-xl bg-primary-50 sm:w-auto sm:self-auto sm:rounded-none">
        <img
          src={sheet.cover.small}
          srcSet={`${sheet.cover.small} 640w, ${sheet.cover.large} 1280w`}
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 45vw, 128px"
          width={640}
          height={360}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-2.5 left-2.5 hidden rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white shadow sm:block">
          {gradeLabel(sheet.grade)}
        </span>
        <span className="absolute top-2.5 right-2.5 hidden rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-ink shadow-sm backdrop-blur sm:block">
          เทอม {sheet.semester}/{sheet.academicYear}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col sm:px-4 sm:pt-3.5 sm:pb-3">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold sm:text-base">
          {/* Stretched link: the whole card is clickable */}
          <Link href={`/sheets/${sheet.id}`} className="after:absolute after:inset-0 after:content-['']">
            {sheet.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-body sm:hidden">{sheet.subjectName} · {gradeLabel(sheet.grade)} · เทอม {sheet.semester}/{sheet.academicYear}</p>
        <p className="mt-1.5 line-clamp-2 hidden text-sm sm:block">{sheet.excerpt}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 sm:mt-3 sm:border-t sm:border-line sm:pt-2.5">
          {/* Sits above the card's stretched link so it opens the author's profile */}
          <Link href={`/u/${sheet.author.id}`} className="relative z-10 flex min-w-0 items-center gap-1.5 hover:text-primary">
            <Avatar name={sheet.author.name} image={sheet.author.image} size={22} />
            <span className="truncate text-xs font-medium text-ink hover:text-primary sm:text-sm">{sheet.author.name}</span>
          </Link>
          <span className="flex shrink-0 items-center gap-1 text-xs text-primary sm:text-sm" title="จำนวนผู้เข้าชม">
            <EyeIcon className="size-3.5 sm:size-4" />
            {formatNumber(sheet.viewCount)}
          </span>
        </div>
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
