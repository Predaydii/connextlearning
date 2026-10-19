import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * Posts for the news page, from the official Instagram API ("Instagram API with
 * Instagram Login"). Needs a long-lived access token of the account
 * (INSTAGRAM_ACCESS_TOKEN). Tokens last 60 days; we refresh them automatically
 * and keep the newest one in SiteSetting.
 */
export const INSTAGRAM_USERNAME = process.env.INSTAGRAM_USERNAME || "doodee.future";
export const INSTAGRAM_PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;

const GRAPH = "https://graph.instagram.com";
const REFRESH_WHEN_LEFT_MS = 10 * 24 * 60 * 60 * 1000; // refresh when < 10 days remain

export type InstagramPost = {
  id: string;
  caption: string;
  image: string;
  isVideo: boolean;
  isAlbum: boolean;
  permalink: string;
  timestamp: string;
};

async function getToken(): Promise<string | null> {
  const setting = await db.siteSetting.findUnique({
    where: { id: 1 },
    select: { igAccessToken: true, igTokenExpiresAt: true },
  });
  const token = setting?.igAccessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN ?? null;
  if (!token) return null;

  const expires = setting?.igTokenExpiresAt?.getTime();
  if (!expires || expires - Date.now() < REFRESH_WHEN_LEFT_MS) {
    try {
      const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { access_token: string; expires_in: number };
        await db.siteSetting.upsert({
          where: { id: 1 },
          create: { id: 1, igAccessToken: data.access_token, igTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000) },
          update: { igAccessToken: data.access_token, igTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000) },
        });
        return data.access_token;
      }
    } catch (err) {
      console.error("[instagram] token refresh failed", err);
    }
  }
  return token;
}

type ApiMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

/** Latest posts, cached for 30 minutes. `null` = not configured / unavailable. */
export const getInstagramPosts = unstable_cache(
  async (): Promise<InstagramPost[] | null> => {
    const token = await getToken();
    if (!token) return null;
    try {
      const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
      const res = await fetch(`${GRAPH}/me/media?fields=${fields}&limit=24&access_token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[instagram] media request failed", res.status, (await res.text()).slice(0, 300));
        return null;
      }
      const { data } = (await res.json()) as { data: ApiMedia[] };
      return data
        .map((m) => ({
          id: m.id,
          caption: m.caption ?? "",
          image: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? "",
          isVideo: m.media_type === "VIDEO",
          isAlbum: m.media_type === "CAROUSEL_ALBUM",
          permalink: m.permalink,
          timestamp: m.timestamp,
        }))
        .filter((p) => p.image);
    } catch (err) {
      console.error("[instagram] fetch failed", err);
      return null;
    }
  },
  ["instagram-posts"],
  { revalidate: 1800, tags: ["instagram"] },
);
