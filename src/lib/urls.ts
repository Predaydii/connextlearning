/**
 * The app has its own domain (connextlearning.tratcouncil.com) and is served from
 * the root. If it ever moves under a sub-path again, set it here (Next.js
 * `basePath`): `next/link`, `useRouter` and `redirect()` add it themselves;
 * plain `<a>`, `<img>`, `<iframe>`, route-handler redirects and Better Auth
 * callback URLs go through `withBase()`.
 */
export const BASE_PATH = "";

/** Where the app used to live (tratcouncil.com/connextlearning); old links are redirected. */
export const LEGACY_PATH = "/connextlearning";

export function withBase(path: string) {
  return `${BASE_PATH}${path}`;
}

/** Admin area path (without the base path; use with Link / redirect). */
export function adminHref(path = "/") {
  return path === "/" ? "/admin" : `/admin${path}`;
}

/** Only same-site paths are allowed as post-login redirects. */
export function isAllowedRedirect(url: string) {
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");
}
