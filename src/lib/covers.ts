import { withBase } from "@/lib/urls";

export type CoverSources = { small: string; large: string };

export type CoverSettings = { coverMode: "SUBJECT" | "UNIFORM"; uniformCoverKey: string | null };

/** URL for a custom cover stored in R2 under `covers/<uuid>` (served by /media). */
export function customCover(key: string): CoverSources {
  return { small: withBase(`/media/${key}-640.webp`), large: withBase(`/media/${key}-1280.webp`) };
}

/** Built-in cover shipped in /public/covers. */
export function builtInCover(name: string): CoverSources {
  return { small: withBase(`/covers/${name}-640.webp`), large: withBase(`/covers/${name}-1280.webp`) };
}

export function subjectCover(subject: { id: string; coverKey: string | null }): CoverSources {
  return subject.coverKey ? customCover(subject.coverKey) : builtInCover(subject.id);
}

export function uniformCover(settings: CoverSettings): CoverSources {
  return settings.uniformCoverKey ? customCover(settings.uniformCoverKey) : builtInCover("default");
}

/**
 * Cover precedence:
 * 1. a cover the admin picked for this sheet
 * 2. the uniform cover, when "same cover for every sheet" is on
 * 3. the subject's cover (custom or built-in)
 */
export function resolveCover(
  sheet: { coverKey: string | null; subject: { id: string; coverKey: string | null } },
  settings: CoverSettings,
): CoverSources {
  if (sheet.coverKey) return customCover(sheet.coverKey);
  if (settings.coverMode === "UNIFORM") return uniformCover(settings);
  return subjectCover(sheet.subject);
}

export const COVER_KEY_RE = /^covers\/[a-f0-9-]{36}$/;

/** Landing-page "sheets by grade" tiles (4:5); each opens the sheets page filtered. Built-in art in /public/img/sheets. */
export const GRADE_ART = [
  { slot: 1, label: "ม.1", q: "grade=M1" },
  { slot: 2, label: "ม.2", q: "grade=M2" },
  { slot: 3, label: "ม.3", q: "grade=M3" },
  { slot: 4, label: "ม.4", q: "grade=M4" },
  { slot: 5, label: "ม.5", q: "grade=M5" },
  { slot: 6, label: "ม.6", q: "grade=M6" },
] as const;

/** Custom tile (R2) or the built-in one. */
// ponytail: slots 7–8 (วิชาเสริม) were dropped from the landing page; their HomeImage rows, if any, are just unused
export function gradeArt(slot: number, key: string | undefined): { src: string; srcSet?: string } {
  if (!key) return { src: withBase(`/img/sheets/sheet-${slot}.webp`) };
  const c = customCover(key);
  return { src: c.small, srcSet: `${c.small} 640w, ${c.large} 1280w` };
}

/** Public URL of an admin-uploaded video (redirects to R2). */
export function videoUrl(key: string) {
  return withBase(`/media/${key}`);
}

/** Banner artwork (2000×600 and 1000×300 WebP). */
export function bannerSrc(key: string) {
  return { small: withBase(`/media/${key}-1000.webp`), large: withBase(`/media/${key}-2000.webp`) };
}
