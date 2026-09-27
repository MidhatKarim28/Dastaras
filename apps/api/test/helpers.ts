import { category, service } from "@dastaras/db";
import app from "../src/app";
import { db } from "../src/db";

const ORIGIN = "http://localhost:3000";
let n = 0;

export type Agent = Awaited<ReturnType<typeof signUp>>;

/** Signs up a fresh user and returns a tiny fetch helper carrying their session cookie. */
export async function signUp(role: "client" | "provider", name = `${role} ${++n}`) {
  const email = `${role}-${Date.now()}-${n}@test.dev`;
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ name, email, password: "password123", role }),
  });
  if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const body = (await res.json()) as { user: { id: string } };

  const call = async (method: string, path: string, json?: unknown) => {
    const r = await app.request(`/api${path}`, {
      method,
      headers: { cookie, origin: ORIGIN, ...(json ? { "content-type": "application/json" } : {}) },
      body: json ? JSON.stringify(json) : undefined,
    });
    // biome-ignore lint/suspicious/noExplicitAny: test convenience
    return { status: r.status, body: (await r.json()) as any };
  };

  return {
    id: body.user.id,
    get: (p: string) => call("GET", p),
    post: (p: string, j?: unknown) => call("POST", p, j),
    put: (p: string, j?: unknown) => call("PUT", p, j),
    patch: (p: string, j?: unknown) => call("PATCH", p, j),
  };
}

export const anon = async (path: string) => {
  const r = await app.request(`/api${path}`);
  // biome-ignore lint/suspicious/noExplicitAny: test convenience
  return { status: r.status, body: (await r.json()) as any };
};

export async function seedService() {
  const slug = `cat-${Date.now()}-${++n}`;
  const [cat] = await db
    .insert(category)
    .values({ slug, name: "Electrical", description: "d", icon: "Zap" })
    .returning();
  const [svc] = await db
    .insert(service)
    .values({ categoryId: cat!.id, slug: `${slug}-wiring`, name: "Wiring" })
    .returning();
  return svc!;
}

export const inDays = (d: number, hour = 10) => {
  const t = new Date(Date.now() + d * 86_400_000);
  t.setUTCHours(hour, 0, 0, 0);
  return t.toISOString();
};

export const validListing = (serviceId: number) => ({
  serviceId,
  title: "Home wiring and repairs",
  description: "Experienced electrician for all household wiring jobs and fault finding.",
  hourlyRate: 1500,
  city: "Lahore" as const,
  area: "DHA",
});
