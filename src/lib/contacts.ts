/**
 * Optional contact links shown on a profile (filled in at registration or "แก้ไขข้อมูล").
 * Stored as User.contacts = { instagram: "name", … }: only clean values, and links are
 * built from them here, so nothing user-typed ever becomes an href as-is.
 */

export type ContactKey = "instagram" | "facebook" | "line" | "tiktok" | "x" | "youtube" | "email" | "website";
export type Contacts = Partial<Record<ContactKey, string>>;

type Def = {
  key: ContactKey;
  label: string;
  placeholder: string;
  /** user input → stored value, or null when it is not valid */
  clean: (v: string) => string | null;
  href: (v: string) => string;
  /** 24×24 icon path */
  icon: string;
};

/** "@name", "name" or a URL on one of `hosts` → the first path segment (minus "@"). */
function handle(re: RegExp, hosts: string[]) {
  return (v: string) => {
    let h = v.trim();
    try {
      const u = new URL(/^https?:\/\//i.test(h) ? h : `https://${h}`);
      if (hosts.includes(u.hostname.replace(/^(www|m)\./, ""))) h = u.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {}
    h = h.replace(/^@/, "");
    return re.test(h) ? h : null;
  };
}

function url(v: string) {
  try {
    const u = new URL(/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const CONTACTS: Def[] = [
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "@username",
    clean: handle(/^[A-Za-z0-9._]{1,30}$/, ["instagram.com"]),
    href: (v) => `https://www.instagram.com/${v}/`,
    icon: "M7.6 2h8.8A5.6 5.6 0 0 1 22 7.6v8.8a5.6 5.6 0 0 1-5.6 5.6H7.6A5.6 5.6 0 0 1 2 16.4V7.6A5.6 5.6 0 0 1 7.6 2zm-.2 2A3.4 3.4 0 0 0 4 7.4v9.2A3.4 3.4 0 0 0 7.4 20h9.2a3.4 3.4 0 0 0 3.4-3.4V7.4A3.4 3.4 0 0 0 16.6 4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-3.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z",
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "ลิงก์โปรไฟล์ หรือชื่อผู้ใช้",
    clean: (v) => {
      const u = url(v);
      if (u && /^https?:\/\/((www|m|web)\.)?(facebook|fb)\.com\//i.test(u)) return u;
      return /^[A-Za-z0-9.]{5,50}$/.test(v.trim()) ? `https://www.facebook.com/${v.trim()}` : null;
    },
    href: (v) => v,
    icon: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z",
  },
  {
    key: "line",
    label: "LINE",
    placeholder: "LINE ID",
    clean: (v) => (/^@?[A-Za-z0-9._-]{2,40}$/.test(v.trim()) ? v.trim() : null),
    href: (v) => (v.startsWith("@") ? `https://line.me/R/ti/p/${encodeURIComponent(v)}` : `https://line.me/ti/p/~${encodeURIComponent(v)}`),
    icon: "M12 3C6.5 3 2 6.6 2 11c0 4 3.5 7.3 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6A7.4 7.4 0 0 0 22 11c0-4.4-4.5-8-10-8zM8.4 13.4H6.5a.5.5 0 0 1-.5-.5V9.1a.5.5 0 0 1 1 0v3.3h1.4a.5.5 0 0 1 0 1zm2-.5a.5.5 0 0 1-1 0V9.1a.5.5 0 0 1 1 0zm4.6 0a.5.5 0 0 1-.9.3l-2-2.6v2.3a.5.5 0 0 1-1 0V9.1a.5.5 0 0 1 .9-.3l2 2.6V9.1a.5.5 0 0 1 1 0zm3-2.4a.5.5 0 0 1 0 1h-1.4v.9H18a.5.5 0 0 1 0 1h-1.9a.5.5 0 0 1-.5-.5V9.1a.5.5 0 0 1 .5-.5H18a.5.5 0 0 1 0 1h-1.4v.9z",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "@username",
    clean: handle(/^[A-Za-z0-9._]{2,24}$/, ["tiktok.com"]),
    href: (v) => `https://www.tiktok.com/@${v}`,
    icon: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6 2.7 2.7 0 0 1 .8.1V9.7a5.8 5.8 0 0 0-.8-.1 5.8 5.8 0 1 0 5.8 5.8V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z",
  },
  {
    key: "x",
    label: "X (Twitter)",
    placeholder: "@username",
    clean: handle(/^[A-Za-z0-9_]{1,15}$/, ["x.com", "twitter.com"]),
    href: (v) => `https://x.com/${v}`,
    icon: "M17.5 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4-5.6 6.4H2l7.3-8.3L1.7 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.2 4.7H5.4z",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "@channel หรือลิงก์ช่อง",
    clean: (v) => {
      const u = url(v);
      if (u && /^https?:\/\/((www|m)\.)?youtube\.com\//i.test(u)) return u;
      const h = v.trim().replace(/^@/, "");
      return /^[A-Za-z0-9._-]{3,30}$/.test(h) ? `https://www.youtube.com/@${h}` : null;
    },
    href: (v) => v,
    icon: "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z",
  },
  {
    key: "email",
    label: "อีเมล",
    placeholder: "name@example.com",
    clean: (v) => (/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(v.trim()) && v.trim().length <= 120 ? v.trim() : null),
    href: (v) => `mailto:${v}`,
    icon: "M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zm2 .9v9.6h14V7.4l-7 5.2zM6.8 7 12 10.9 17.2 7z",
  },
  {
    key: "website",
    label: "เว็บไซต์",
    placeholder: "https://",
    clean: (v) => (v.trim().length <= 200 ? url(v) : null),
    href: (v) => v,
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4z",
  },
];

/** Stored JSON → only known keys with values that still pass validation. */
export function readContacts(raw: unknown): Contacts {
  if (!raw || typeof raw !== "object") return {};
  const out: Contacts = {};
  for (const d of CONTACTS) {
    const v = (raw as Record<string, unknown>)[d.key];
    if (typeof v === "string" && d.clean(v) === v) out[d.key] = v;
  }
  return out;
}
