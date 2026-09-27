import type { Role } from "@dastaras/shared";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { type AuthUser, auth } from "./auth";

export type AppEnv = {
  Variables: {
    user: AuthUser | null;
  };
};

export type AuthedEnv = {
  Variables: {
    user: AuthUser;
  };
};

/** Resolves the session (cookie or bearer) once per request. */
export const withSession = createMiddleware<AppEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", result?.user ?? null);
  await next();
});

export const requireAuth = createMiddleware<AuthedEnv>(async (c, next) => {
  if (!c.get("user")) throw new HTTPException(401, { message: "Please sign in to continue" });
  await next();
});

export const requireRole = (role: Role) =>
  createMiddleware<AuthedEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) throw new HTTPException(401, { message: "Please sign in to continue" });
    if (user.role !== role) throw new HTTPException(403, { message: `Only ${role}s can do that` });
    await next();
  });

/** The signed-in user, or a 401. Use in handlers behind requireAuth/requireRole. */
export function currentUser(c: { get(key: "user"): AuthUser | null }): AuthUser {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "Please sign in to continue" });
  return user;
}
