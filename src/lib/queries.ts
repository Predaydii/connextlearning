import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { resolveCover, type CoverSettings, type CoverSources } from "@/lib/covers";
import { ACADEMIC_YEARS, GRADE_VALUES, PAGE_SIZE, SEMESTERS, SUBJECT_IDS } from "@/lib/constants";
import type { Grade, Prisma } from "@/generated/prisma/client";

export const TAG_SHEETS = "sheets";
export const TAG_SETTINGS = "settings";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const getCoverSettings = unstable_cache(
  async (): Promise<CoverSettings> => {
    const s = await db.siteSetting.findUnique({ where: { id: 1 }, select: { coverMode: true, uniformCoverKey: true } });
    return { coverMode: s?.coverMode ?? "SUBJECT", uniformCoverKey: s?.uniformCoverKey ?? null };
  },
  ["cover-settings"],
  { tags: [TAG_SETTINGS], revalidate: 300 },
);

// ---------------------------------------------------------------------------
// Public listing
// ---------------------------------------------------------------------------

export type SheetFilters = {
  q: string;
  grades: Grade[];
  subjects: string[];
  semesters: number[];
  years: number[];
  sort: "latest" | "popular";
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Parse & whitelist URL search params (anything unknown is dropped). */
export function parseFilters(sp: RawParams): SheetFilters {
  const grades = list(sp.grade).filter((g): g is Grade => (GRADE_VALUES as string[]).includes(g));
  const subjects = list(sp.subject).filter((s) => (SUBJECT_IDS as string[]).includes(s));
  const semesters = list(sp.semester).map(Number).filter((n) => (SEMESTERS as readonly number[]).includes(n));
  const years = list(sp.year).map(Number).filter((n) => (ACADEMIC_YEARS as readonly number[]).includes(n));
  const q = (list(sp.q)[0] ?? "").trim().slice(0, 100);
  const sort = list(sp.sort)[0] === "popular" ? "popular" : "latest";
  const page = Math.min(Math.max(1, Number.parseInt(list(sp.page)[0] ?? "1", 10) || 1), 500);
  const uniq = <T,>(a: T[]) => [...new Set(a)].sort();
  return { q, grades: uniq(grades), subjects: uniq(subjects), semesters: uniq(semesters), years: uniq(years), sort, page };
}

export type SheetCardData = {
  id: string;
  title: string;
  excerpt: string;
  subjectId: string;
  subjectName: string;
  grade: Grade;
  semester: number;
  academicYear: number;
  createdAt: string;
  viewCount: number;
  author: { id: string; name: string; image: string | null };
  cover: CoverSources;
};

const cardSelect = {
  id: true,
  title: true,
  description: true,
  grade: true,
  semester: true,
  academicYear: true,
  createdAt: true,
  viewCount: true,
  coverKey: true,
  subject: { select: { id: true, name: true, coverKey: true } },
  author: { select: { id: true, name: true, image: true } },
} satisfies Prisma.SheetSelect;

type CardRow = Prisma.SheetGetPayload<{ select: typeof cardSelect }>;

function toCard(row: CardRow, settings: CoverSettings): SheetCardData {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.description.length > 180 ? `${row.description.slice(0, 180)}…` : row.description,
    subjectId: row.subject.id,
    subjectName: row.subject.name,
    grade: row.grade,
    semester: row.semester,
    academicYear: row.academicYear,
    createdAt: row.createdAt.toISOString(),
    viewCount: row.viewCount,
    author: { id: row.author.id, name: row.author.name, image: row.author.image },
    cover: resolveCover(row, settings),
  };
}

function whereFor(f: SheetFilters): Prisma.SheetWhereInput {
  return {
    status: "APPROVED",
    ...(f.grades.length && { grade: { in: f.grades } }),
    ...(f.subjects.length && { subjectId: { in: f.subjects } }),
    ...(f.semesters.length && { semester: { in: f.semesters } }),
    ...(f.years.length && { academicYear: { in: f.years } }),
    ...(f.q && {
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
      ],
    }),
  };
}

/** Cached for 60 s per filter combination; approvals invalidate the `sheets` tag. */
export const getSheetList = unstable_cache(
  async (f: SheetFilters) => {
    const where = whereFor(f);
    const orderBy: Prisma.SheetOrderByWithRelationInput[] =
      f.sort === "popular" ? [{ viewCount: "desc" }, { publishedAt: "desc" }] : [{ publishedAt: "desc" }];
    const [rows, total, settings] = await Promise.all([
      db.sheet.findMany({ where, orderBy, select: cardSelect, skip: (f.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      db.sheet.count({ where }),
      getCoverSettings(),
    ]);
    return { items: rows.map((r) => toCard(r, settings)), total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  },
  ["sheet-list"],
  { tags: [TAG_SHEETS, TAG_SETTINGS], revalidate: 60 },
);

export type Facets = {
  grade: Record<string, number>;
  subject: Record<string, number>;
  semester: Record<string, number>;
  year: Record<string, number>;
};

/** Number of published sheets per filter value (shown next to each checkbox). */
export const getFacets = unstable_cache(
  async (): Promise<Facets> => {
    const where = { status: "APPROVED" as const };
    const [g, s, sem, y] = await Promise.all([
      db.sheet.groupBy({ by: ["grade"], where, _count: { _all: true } }),
      db.sheet.groupBy({ by: ["subjectId"], where, _count: { _all: true } }),
      db.sheet.groupBy({ by: ["semester"], where, _count: { _all: true } }),
      db.sheet.groupBy({ by: ["academicYear"], where, _count: { _all: true } }),
    ]);
    return {
      grade: Object.fromEntries(g.map((r) => [r.grade, r._count._all])),
      subject: Object.fromEntries(s.map((r) => [r.subjectId, r._count._all])),
      semester: Object.fromEntries(sem.map((r) => [String(r.semester), r._count._all])),
      year: Object.fromEntries(y.map((r) => [String(r.academicYear), r._count._all])),
    };
  },
  ["sheet-facets"],
  { tags: [TAG_SHEETS], revalidate: 60 },
);

export const getLatestSheets = unstable_cache(
  async (take: number) => {
    const [rows, settings] = await Promise.all([
      db.sheet.findMany({
        where: { status: "APPROVED" },
        orderBy: { publishedAt: "desc" },
        select: cardSelect,
        take,
      }),
      getCoverSettings(),
    ]);
    return rows.map((r) => toCard(r, settings));
  },
  ["latest-sheets"],
  { tags: [TAG_SHEETS, TAG_SETTINGS], revalidate: 120 },
);

// ---------------------------------------------------------------------------
// Single sheet
// ---------------------------------------------------------------------------

/** Deduplicated per request (the page and its metadata both use it). */
export const getSheetDetail = cache(async (id: string) => {
  const sheet = await db.sheet.findUnique({
    where: { id },
    include: {
      subject: { select: { id: true, name: true, coverKey: true } },
      author: { select: { id: true, name: true, image: true } },
    },
  });
  if (!sheet) return null;
  const settings = await getCoverSettings();
  return { ...sheet, cover: resolveCover(sheet, settings) };
});

/** Count each signed-in reader once per sheet. */
export async function recordView(sheetId: string, userId: string) {
  const inserted = await db.sheetView.createMany({ data: [{ sheetId, userId }], skipDuplicates: true });
  if (inserted.count > 0) {
    await db.sheet.update({ where: { id: sheetId }, data: { viewCount: { increment: 1 } } });
    return true;
  }
  return false;
}

/**
 * Recommendations under a sheet: more from the same author when they have
 * other published sheets, otherwise sheets from the same grade.
 */
export async function getRelatedSheets(sheet: { id: string; authorId: string; grade: Grade }, take = 3) {
  const base = { status: "APPROVED" as const, id: { not: sheet.id } };
  const settings = await getCoverSettings();
  const byAuthor = await db.sheet.findMany({
    where: { ...base, authorId: sheet.authorId },
    orderBy: { publishedAt: "desc" },
    select: cardSelect,
    take,
  });
  if (byAuthor.length > 0) return { kind: "author" as const, items: byAuthor.map((r) => toCard(r, settings)) };
  const byGrade = await db.sheet.findMany({
    where: { ...base, grade: sheet.grade },
    orderBy: { viewCount: "desc" },
    select: cardSelect,
    take,
  });
  return { kind: "grade" as const, items: byGrade.map((r) => toCard(r, settings)) };
}

// ---------------------------------------------------------------------------
// Community (ratings, comments, author profile)
// ---------------------------------------------------------------------------

export type RatingSummary = { average: number; count: number };

function toSummary(agg: { _avg: { score: number | null }; _count: { _all: number } }): RatingSummary {
  return { average: agg._avg.score ?? 0, count: agg._count._all };
}

/** Rating summary, the viewer's own score and the latest comments of one sheet. */
export async function getSheetCommunity(sheetId: string, userId: string | null) {
  const [agg, mine, comments] = await Promise.all([
    db.rating.aggregate({ where: { sheetId }, _avg: { score: true }, _count: { _all: true } }),
    userId ? db.rating.findUnique({ where: { sheetId_userId: { sheetId, userId } }, select: { score: true } }) : null,
    db.comment.findMany({
      where: { sheetId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, body: true, createdAt: true, user: { select: { id: true, name: true, image: true } } },
    }),
  ]);
  return { rating: toSummary(agg), myScore: mine?.score ?? null, comments };
}

/** Public profile: name, photo and published sheets only (never the email). Deduplicated per request. */
export const getAuthorProfile = cache(async (userId: string) => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, image: true, createdAt: true } });
  if (!user) return null;
  const published = { authorId: userId, status: "APPROVED" as const };
  const [rows, views, agg, settings] = await Promise.all([
    db.sheet.findMany({ where: published, orderBy: { publishedAt: "desc" }, select: cardSelect, take: 200 }),
    db.sheet.aggregate({ where: published, _sum: { viewCount: true } }),
    db.rating.aggregate({ where: { sheet: published }, _avg: { score: true }, _count: { _all: true } }),
    getCoverSettings(),
  ]);
  return {
    user,
    sheets: rows.map((r) => toCard(r, settings)),
    totalViews: views._sum.viewCount ?? 0,
    rating: toSummary(agg),
  };
});

/** Real numbers for the landing page (published sheets only). */
export const getSiteStats = unstable_cache(
  async () => {
    const where = { status: "APPROVED" as const };
    const [agg, authors] = await Promise.all([
      db.sheet.aggregate({ where, _count: { _all: true }, _sum: { viewCount: true } }),
      db.sheet.groupBy({ by: ["authorId"], where }),
    ]);
    return { sheets: agg._count._all, views: agg._sum.viewCount ?? 0, authors: authors.length };
  },
  ["site-stats"],
  { tags: [TAG_SHEETS], revalidate: 300 },
);

export type Contributor = { id: string; name: string; image: string | null; sheets: number; lastSubject: string | null };

/** Students with published sheets, most prolific first (landing page marquee). */
export const getContributors = unstable_cache(
  async (take: number): Promise<Contributor[]> => {
    const published = { status: "APPROVED" as const };
    const rows = await db.user.findMany({
      where: { sheets: { some: published } },
      orderBy: { sheets: { _count: "desc" } },
      take,
      select: {
        id: true,
        name: true,
        image: true,
        _count: { select: { sheets: { where: published } } },
        sheets: { where: published, orderBy: { publishedAt: "desc" }, take: 1, select: { subject: { select: { name: true } } } },
      },
    });
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      sheets: u._count.sheets,
      lastSubject: u.sheets[0]?.subject.name ?? null,
    }));
  },
  ["contributors"],
  { tags: [TAG_SHEETS], revalidate: 300 },
);

export type RankedSheet = SheetCardData & { score?: number; ratings?: number };

/** Top published sheets by star rating and by readers (landing page leaderboards). */
export const getLeaderboards = unstable_cache(
  async (take: number) => {
    const settings = await getCoverSettings();
    const [byViews, rated] = await Promise.all([
      db.sheet.findMany({ where: { status: "APPROVED" }, orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }], select: cardSelect, take }),
      db.rating.groupBy({
        by: ["sheetId"],
        where: { sheet: { status: "APPROVED" } },
        _avg: { score: true },
        _count: { _all: true },
        orderBy: [{ _avg: { score: "desc" } }, { _count: { sheetId: "desc" } }],
        take,
      }),
    ]);
    const ratedRows = rated.length
      ? await db.sheet.findMany({ where: { id: { in: rated.map((r) => r.sheetId) } }, select: cardSelect })
      : [];
    const byId = new Map(ratedRows.map((r) => [r.id, r]));
    const topRated: RankedSheet[] = rated.flatMap((r) => {
      const row = byId.get(r.sheetId);
      return row ? [{ ...toCard(row, settings), score: r._avg.score ?? 0, ratings: r._count._all }] : [];
    });
    return { topRated, mostRead: byViews.map((r) => toCard(r, settings)) };
  },
  ["leaderboards"],
  { tags: [TAG_SHEETS, TAG_SETTINGS], revalidate: 120 },
);

// ---------------------------------------------------------------------------
// News page
// ---------------------------------------------------------------------------

export const TAG_NEWS = "news";

export const getNews = unstable_cache(
  async () => {
    const [setting, posts] = await Promise.all([
      db.siteSetting.findUnique({ where: { id: 1 }, select: { newsVideoKey: true } }),
      db.newsPost.findMany({ orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] }),
    ]);
    // ISO strings: unstable_cache stores JSON, so Dates would come back as strings anyway
    return { videoKey: setting?.newsVideoKey ?? null, posts: posts.map((p) => ({ ...p, publishedAt: p.publishedAt.toISOString() })) };
  },
  ["news-v2"],
  { tags: [TAG_NEWS], revalidate: 600 },
);

/** Landing page media: custom grade tiles (slot → R2 key) and the video above the footer. */
export const getHomeMedia = unstable_cache(
  async () => {
    const [setting, images] = await Promise.all([
      db.siteSetting.findUnique({ where: { id: 1 }, select: { homeVideoKey: true } }),
      db.homeImage.findMany(),
    ]);
    return {
      videoKey: setting?.homeVideoKey ?? null,
      gradeArt: Object.fromEntries(images.map((i) => [i.slot, i.imageKey])) as Record<number, string>,
    };
  },
  ["home-media"],
  { tags: [TAG_SETTINGS], revalidate: 300 },
);
