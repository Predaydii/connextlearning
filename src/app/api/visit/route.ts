import { db } from "@/lib/db";

/**
 * Footer visit counter: the browser pings once a day (see VisitPing). One row per day,
 * incremented atomically; only same-site requests count.
 */
export async function POST(req: Request) {
  if (req.headers.get("sec-fetch-site") !== "same-origin") return new Response(null, { status: 403 });
  // ponytail: a determined visitor can still inflate the count; per-IP limits only if it ever matters
  await db.$executeRaw`
    INSERT INTO "SiteVisit" ("day", "count") VALUES ((now() AT TIME ZONE 'Asia/Bangkok')::date, 1)
    ON CONFLICT ("day") DO UPDATE SET "count" = "SiteVisit"."count" + 1`;
  return new Response(null, { status: 204 });
}
