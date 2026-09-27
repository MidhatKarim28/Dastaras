import { account, providerProfile, session, user, verification } from "@dastaras/db";
import { PASSWORD_MIN_LENGTH } from "@dastaras/shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { env } from "./env";

const SELF_SERVICE_ROLES = new Set(["client", "provider"]);

export const auth = betterAuth({
  appName: "Dastaras",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "client", input: true },
      phone: { type: "string", required: false, input: true },
    },
  },
  rateLimit: { enabled: env.NODE_ENV === "production", window: 60, max: 100 },
  databaseHooks: {
    user: {
      create: {
        // Users may choose client or provider at sign-up — never admin.
        before: async (data) => {
          const role = SELF_SERVICE_ROLES.has(String(data.role)) ? data.role : "client";
          return { data: { ...data, role } };
        },
        // Every provider gets a profile row they can flesh out from the dashboard.
        after: async (created) => {
          if (created.role === "provider") {
            await db
              .insert(providerProfile)
              .values({ userId: created.id, headline: "Service professional", city: "Lahore" })
              .onConflictDoNothing();
          }
        },
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = AuthSession["user"];
