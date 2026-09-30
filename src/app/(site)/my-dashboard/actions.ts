"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { getRegion, REGION_COOKIE, regions } from "@/config/regions";

const input = z.enum(regions.map((r) => r.slug) as [string, ...string[]]);

export interface SaveRegionState {
  status: "idle" | "saved" | "error";
  /** Increments so the toast shows again on repeated saves. */
  seq: number;
}

export async function saveRegion(prev: SaveRegionState, form: FormData): Promise<SaveRegionState> {
  const parsed = input.safeParse(form.get("region"));
  if (!parsed.success || !getRegion(parsed.data)) return { status: "error", seq: prev.seq + 1 };
  const jar = await cookies();
  jar.set(REGION_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { status: "saved", seq: prev.seq + 1 };
}
