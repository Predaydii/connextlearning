import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { adminEmails } from "@/lib/env";
import { adminHref } from "@/lib/urls";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
};

/** Current user for this request (deduplicated per render). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    isAdmin: u.role === "ADMIN" || adminEmails().includes(u.email.toLowerCase()),
  };
});

export function loginUrl(callback: string) {
  return `/login?callbackUrl=${encodeURIComponent(callback)}`;
}

/** For pages: redirect to the login page when signed out. */
export async function requireUser(callbackPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(callbackPath));
  return user;
}

/**
 * For admin pages: signed-out → login (then back here), signed-in non-admin → public home.
 * `adminPath` is admin-relative ("/", "/sheets/abc").
 */
export async function requireAdminPage(adminPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(adminHref(adminPath)));
  if (!user.isAdmin) redirect("/");
  return user;
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("กรุณาเข้าสู่ระบบก่อน");
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await assertUser();
  if (!user.isAdmin) throw new AuthError("ไม่มีสิทธิ์ใช้งานส่วนนี้");
  return user;
}

export class AuthError extends Error {}
