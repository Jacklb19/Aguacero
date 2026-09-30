import type { MetadataRoute } from "next";
import { datasets } from "@/config/datasets";
import { routes } from "@/config/routes";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const out: MetadataRoute.Sitemap = [];
  for (const r of routes) {
    if ("noindex" in r && r.noindex) continue;
    if (r.pattern === "CSR" || r.pattern === "SSR") continue;
    if (r.path === "/dictionary/[dataset]") {
      for (const d of datasets) out.push({ url: `${base}/dictionary/${d.slug}` });
    } else if (r.path === "/datasets/[id]") {
      for (const d of datasets)
        out.push({ url: `${base}/datasets/${d.slug}`, changeFrequency: "hourly" });
    } else {
      out.push({
        url: `${base}${r.path === "/" ? "" : r.path}`,
        ...(r.pattern === "ISR" ? { changeFrequency: "hourly" as const } : {}),
      });
    }
  }
  return out;
}
