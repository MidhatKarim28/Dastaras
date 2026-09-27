import { type ApiClient, createApiClient } from "@dastaras/api/client";

export { ApiError, unwrap } from "@dastaras/api/client";

let client: ApiClient | undefined;

/** Browser API client. Same origin: Next rewrites /api/* to the API server. */
export function api(): ApiClient {
  client ??= createApiClient(window.location.origin);
  return client;
}
