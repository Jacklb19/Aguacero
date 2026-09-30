export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { ok: true, build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
