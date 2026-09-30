import { z } from "zod";
import { computeAll } from "@/lib/bench/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_ROWS = 5_000_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

const input = z.object({ rows: z.number().int().min(1).max(MAX_ROWS) });

// Lightweight per-instance rate limit. Serverless instances do not share it; it only
// stops a single client from hammering one instance.
const hits = new Map<string, number[]>();
function limited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

/** Server runner: same pure-JS core as the `main` runner, so only placement differs. */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip, Date.now())) {
    return Response.json({ error: "Too many runs. Wait a minute." }, { status: 429 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: `rows must be an integer from 1 to ${MAX_ROWS}.` }, { status: 400 });
  }
  const t0 = performance.now();
  const { partials, checksum } = computeAll(parsed.data.rows);
  const dur = performance.now() - t0;
  return Response.json(
    {
      rows: parsed.data.rows,
      checksum,
      computeMs: dur,
      groups: partials.count.length,
    },
    {
      headers: {
        "Server-Timing": `compute;dur=${dur.toFixed(2)}`,
        "Cache-Control": "no-store",
      },
    },
  );
}
