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
