/**
 * Single source of truth for how each route is rendered.
 * The rendering contract test (src/tests/contract/) and the <RenderNote /> read this file.
 */
export type RenderPattern = "SSG" | "ISR" | "SSR" | "CSR";

export interface RouteSpec {
  /** Route pattern as written in the app directory, e.g. "/datasets/[id]". */
  path: string;
  pattern: RenderPattern;
  /** Seconds, only for ISR routes. Must match the literal `revalidate` export. */
  revalidate?: number;
  /** Routes that receive COOP/COEP headers. */
  isolated?: boolean;
  /** Excluded from the sitemap and marked noindex. */
  noindex?: boolean;
  why: string;
}

export const ISR_SECONDS = 3600;

export const routes = [
  { path: "/", pattern: "SSG", why: "Public landing; must load instantly and rank in search." },
  { path: "/methodology", pattern: "SSG", why: "Stable text." },
  { path: "/dictionary/[dataset]", pattern: "SSG", why: "Stable docs per dataset." },
  {
    path: "/datasets",
    pattern: "ISR",
    revalidate: ISR_SECONDS,
    why: "Everyone sees the same list; upstream metadata changes slowly.",
  },
  {
    path: "/datasets/[id]",
    pattern: "ISR",
    revalidate: ISR_SECONDS,
    why: "Shared summary figures that change slowly.",
  },
  {
    path: "/my-dashboard",
    pattern: "SSR",
    why: "Depends on a per-visitor preference and must be fresh.",
  },
  {
    path: "/explore",
    pattern: "CSR",
    isolated: true,
    why: "Constant interaction and no search-engine need.",
  },
  {
    path: "/lab",
    pattern: "CSR",
    isolated: true,
    why: "The benchmark harness runs entirely in the browser.",
  },
  { path: "/results", pattern: "SSG", why: "Published results read from committed files." },
  {
    path: "/styleguide",
    pattern: "SSG",
    noindex: true,
    why: "Living reference for design review.",
  },
] as const satisfies readonly RouteSpec[];

export type RoutePath = (typeof routes)[number]["path"];

export function getRoute(path: RoutePath): RouteSpec {
  const route = routes.find((r) => r.path === path);
  if (!route) throw new Error(`Unknown route ${path}`);
  return route;
}

/** Paths that must be entered with a full document navigation (plain <a>). */
export const isolatedPrefixes = routes
  .filter((r): r is Extract<(typeof routes)[number], { isolated: true }> => "isolated" in r)
  .map((r) => r.path);
