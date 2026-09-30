import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { toSearchParams, type SoqlQuery } from "./soql";

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** How a request should be cached by Next. Always explicit (README §4.1). */
export type CacheMode =
  | { kind: "isr"; revalidate: number; tags: string[] }
  | { kind: "static" }
  | { kind: "no-store" };

function cacheInit(mode: CacheMode): RequestInit {
  switch (mode.kind) {
    case "isr":
      return { next: { revalidate: mode.revalidate, tags: mode.tags } };
    case "static":
      return { cache: "force-cache" };
    case "no-store":
      return { cache: "no-store" };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET JSON from Socrata with timeout, retry on 429/5xx and Zod validation.
 * Throws on any failure so ISR keeps serving the last good page.
 */
export async function socrataGet<T>(
  path: string,
  schema: z.ZodType<T>,
  mode: CacheMode,
  { timeoutMs = 60_000, retries = 2 }: { timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const { SOCRATA_DOMAIN, SOCRATA_APP_TOKEN } = env();
  const url = `https://${SOCRATA_DOMAIN}${path}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (SOCRATA_APP_TOKEN) headers["X-App-Token"] = SOCRATA_APP_TOKEN;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        ...cacheInit(mode),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new UpstreamError(`Upstream ${res.status} for ${path}`, res.status);
      }
      if (!res.ok) {
        // 4xx other than 429 will not improve on retry.
        throw Object.assign(new UpstreamError(`Upstream ${res.status} for ${path}`, res.status), {
          fatal: true,
        });
      }
      const json: unknown = await res.json();
      return schema.parse(json);
    } catch (err) {
      lastError = err;
      if ((err as { fatal?: boolean }).fatal || err instanceof z.ZodError) break;
      if (attempt < retries) await sleep(500 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new UpstreamError(String(lastError));
}

export function resourcePath(datasetId: string, q: SoqlQuery): string {
  return `/resource/${datasetId}.json?${toSearchParams(q).toString()}`;
}
