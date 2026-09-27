import { createApiClient } from "@dastaras/api/client";
import { headers } from "next/headers";
import { cache } from "react";

export const API_URL = process.env.API_URL ?? "http://localhost:8787";

async function cookieHeader() {
  return (await headers()).get("cookie") ?? "";
}

/** API client for server components: calls the API directly and forwards the visitor's cookies. */
export async function serverApi() {
  const cookie = await cookieHeader();
  return createApiClient(API_URL, {
    headers: cookie ? { cookie } : undefined,
    init: { cache: "no-store" },
  });
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "client" | "provider" | "admin";
  phone?: string | null;
};

/** The signed-in user (deduplicated per request), or null. Never throws. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = await cookieHeader();
  if (!cookie) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: SessionUser } | null;
    return data?.user ?? null;
  } catch {
    return null;
  }
});
