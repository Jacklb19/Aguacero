/**
 * Rendering contract (README §11.3). Run after `pnpm build`: `pnpm test:contract`.
 * Reads .next/prerender-manifest.json and checks it against src/config/routes.ts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routes } from "@/config/routes";

const manifestPath = join(process.cwd(), ".next", "prerender-manifest.json");

interface Manifest {
  routes: Record<string, { initialRevalidateSeconds: number | false }>;
  dynamicRoutes: Record<string, unknown>;
}

describe.skipIf(!existsSync(manifestPath))("rendering contract", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;

  for (const r of routes) {
    const isDynamicSegment = r.path.includes("[");
    it(`${r.path} is ${r.pattern}`, () => {
      if (r.pattern === "SSR") {
        expect(manifest.routes[r.path]).toBeUndefined();
        return;
      }
      if (isDynamicSegment) {
        expect(manifest.dynamicRoutes[r.path]).toBeDefined();
        return;
      }
      const entry = manifest.routes[r.path];
      expect(entry, `${r.path} should be prerendered`).toBeDefined();
      if (r.pattern === "ISR") expect(entry!.initialRevalidateSeconds).toBe(r.revalidate);
      else expect(entry!.initialRevalidateSeconds).toBe(false);
    });
  }
});
