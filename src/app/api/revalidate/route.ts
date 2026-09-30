import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { datasets } from "@/config/datasets";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const body = z.object({
  tag: z.enum(["datasets", ...datasets.map((d) => `dataset:${d.slug}`)] as [string, ...string[]]),
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Compare anyway so timing does not reveal the length.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** POST { tag } with header `Authorization: Bearer <REVALIDATE_SECRET>`. */
export async function POST(request: Request) {
  const secret = env().REVALIDATE_SECRET;
  if (!secret) return Response.json({ error: "Revalidation is not configured." }, { status: 503 });
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!safeEqual(token, secret)) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown tag." }, { status: 400 });

  // Next 16: second argument required. `{ expire: 0 }` makes the next visit regenerate
  // instead of serving stale content (verified in node_modules/next/dist/docs).
  revalidateTag(parsed.data.tag, { expire: 0 });
  return Response.json({ revalidated: parsed.data.tag, at: new Date().toISOString() });
}
