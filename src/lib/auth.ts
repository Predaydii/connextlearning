import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/env";
import { SCHOOL_DOMAIN } from "@/lib/constants";
import { withBase } from "@/lib/urls";

function isSchoolEmail(email: string | undefined | null) {
  return !!email && email.toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`);
}

export const auth = betterAuth({
  appName: "Connext Learning",
  // Origin only (https://connextlearning.tratcouncil.com); a sub-path, if any, goes in basePath.
  baseURL: process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined,
  basePath: withBase("/api/auth"),
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),

  // Only Google sign-in; no email/password accounts.
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Sent to Google as a hint AND verified against the `hd` claim of the ID token.
      hd: SCHOOL_DOMAIN,
      prompt: "select_account",
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "USER", input: false },
      // Set by /register (first sign-in); kept in the session so most requests skip a DB lookup
      registeredAt: { type: "date", required: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
    // Signed session snapshot in a cookie: most requests skip the DB lookup.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  account: {
    // We never call Google APIs on behalf of the user, so don't keep their tokens.
    storeAccountCookie: false,
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"] },  },

  databaseHooks: {
    user: {
      create: {
        // Defence in depth: `hd` already restricts sign-in, but never create a
        // user outside the school domain, and promote configured admins.
        before: async (user) => {
          if (!isSchoolEmail(user.email)) {
            throw new APIError("FORBIDDEN", { message: `ใช้ได้เฉพาะบัญชี @${SCHOOL_DOMAIN}` });
          }
          const role = adminEmails().includes(user.email.toLowerCase()) ? "ADMIN" : "USER";
          return { data: { ...user, role } };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { email: true, role: true } });
          if (!user || !isSchoolEmail(user.email)) {
            throw new APIError("FORBIDDEN", { message: `ใช้ได้เฉพาะบัญชี @${SCHOOL_DOMAIN}` });
          }
          // ADMIN_EMAILS (super admins) are always admins; other admins are managed in /admin/admins
          if (adminEmails().includes(user.email.toLowerCase()) && user.role !== "ADMIN") {
            await db.user.update({ where: { id: session.userId }, data: { role: "ADMIN" } });
          }
        },
      },
    },
  },

  onAPIError: { errorURL: withBase("/login") },

  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
