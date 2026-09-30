import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SOCRATA_DOMAIN: z.string().min(1).default("www.datos.gov.co"),
  SOCRATA_APP_TOKEN: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

/** Validated server environment. Throws on malformed values. */
export function env(): ServerEnv {
  if (!cached) {
    const input = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
    );
    cached = serverSchema.parse(input);
  }
  return cached;
}

export function siteUrl(): string {
  const e = env();
  if (e.NEXT_PUBLIC_SITE_URL) return e.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (e.VERCEL_URL) return `https://${e.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function buildId(): string {
  return env().VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
}
