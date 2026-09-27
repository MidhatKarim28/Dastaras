/**
 * End-to-end typed API client (Hono RPC). Shared by the web app today and the
 * Expo app later — route params, bodies and responses are all inferred from
 * the server code, so a breaking API change is a compile error in every client.
 */
import { hc } from "hono/client";
import type { AppType } from "./app";

export type { AppType };
export type ApiClient = ReturnType<typeof hc<AppType>>;

export function createApiClient(baseUrl: string, init?: Parameters<typeof hc>[1]): ApiClient {
  return hc<AppType>(baseUrl, init);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type JsonResponse = { ok: boolean; status: number; json(): Promise<unknown> };

/** The success body of a (possibly union-typed) RPC response, minus `{ error }` shapes. */
export type Unwrapped<R extends JsonResponse> = Exclude<
  Awaited<ReturnType<R["json"]>>,
  { error: string }
>;

/**
 * Unwraps a Hono RPC response: returns typed JSON or throws ApiError.
 * Generic over the whole response (not just its body) so that routes whose
 * responses are a union (e.g. a validator's 400 plus the handler's 200) still
 * infer the success type instead of the first union member.
 */
export async function unwrap<R extends JsonResponse>(res: R): Promise<Unwrapped<R>> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      issues?: { path: string; message: string }[];
    };
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body.issues);
  }
  return (await res.json()) as Unwrapped<R>;
}
