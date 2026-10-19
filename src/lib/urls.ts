/**
 * The app is served under a sub-path of tratcouncil.com (Next.js `basePath`).
 * `next/link`, `useRouter` and `redirect()` add the prefix themselves; plain
 * `<a>`, `<img>`, `<iframe>`, route-handler redirects and Better Auth callback
 * URLs do not, so wrap those in `withBase()`.
 */
export const BASE_PATH = "/connextlearning";

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
