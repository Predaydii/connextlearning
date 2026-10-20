import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/env";
import { adminHref } from "@/lib/urls";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
  /** Listed in ADMIN_EMAILS: can add and remove the other admins */
  isSuperAdmin: boolean;
  /** Finished the first-sign-in registration (/register) */
  registered: boolean;
};

/** Current user for this request (deduplicated per render). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; registeredAt?: Date | string | null };
  const isSuperAdmin = adminEmails().includes(u.email.toLowerCase());
  // A cached ADMIN role may be stale (removed in the last 5 minutes): confirm sub-admins in the DB
  const isAdmin =
    isSuperAdmin ||
    (u.role === "ADMIN" && (await db.user.findUnique({ where: { id: u.id }, select: { role: true } }))?.role === "ADMIN");
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    isAdmin,
    isSuperAdmin,
    // The cookie may predate registration (cached up to 5 minutes): confirm in the DB until it says so
    registered:
      !!u.registeredAt || !!(await db.user.findUnique({ where: { id: u.id }, select: { registeredAt: true } }))?.registeredAt,
  };
});

/**
 * Admin rights straight from the database: the session cookie caches the role for
 * up to 5 minutes, so an admin added or removed by the super admin takes effect at once.
 */
async function hasAdminAccess(user: SessionUser) {
  if (user.isSuperAdmin) return true;
  const row = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
  return row?.role === "ADMIN";
}

export function loginUrl(callback: string) {
  return `/login?callbackUrl=${encodeURIComponent(callback)}`;
}

export function registerUrl(next: string) {
  return `/register?next=${encodeURIComponent(next)}`;
}

/** For pages: redirect to the login page when signed out. */
export async function requireUser(callbackPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(callbackPath));
  if (!user.registered) redirect(registerUrl(callbackPath));
  return user;
}

/**
 * For admin pages: signed-out → login (then back here), signed-in non-admin → public home.
 * `adminPath` is admin-relative ("/", "/sheets/abc").
 */
export async function requireAdminPage(adminPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(adminHref(adminPath)));
  if (!user.registered) redirect(registerUrl(adminHref(adminPath)));
  if (!(await hasAdminAccess(user))) redirect("/");
  return { ...user, isAdmin: true };
}

export async function requireSuperAdminPage(adminPath: string): Promise<SessionUser> {
  const user = await requireAdminPage(adminPath);
  if (!user.isSuperAdmin) redirect("/admin");
  return user;
}

/** For server actions / route handlers: throw instead of redirecting. Signed in, registration not required. */
export async function assertSignedIn(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("กรุณาเข้าสู่ระบบก่อน");
  return user;
}

/** Signed in and registered. */
export async function assertUser(): Promise<SessionUser> {
  const user = await assertSignedIn();
  if (!user.registered) throw new AuthError("กรุณาลงทะเบียนให้เสร็จก่อนใช้งาน");
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await assertUser();
  if (!(await hasAdminAccess(user))) throw new AuthError("ไม่มีสิทธิ์ใช้งานส่วนนี้");
  return { ...user, isAdmin: true };
}

export async function assertSuperAdmin(): Promise<SessionUser> {
  const user = await assertAdmin();
  if (!user.isSuperAdmin) throw new AuthError("เฉพาะผู้ดูแลระบบหลักเท่านั้น");
  return user;
}

export class AuthError extends Error {}
