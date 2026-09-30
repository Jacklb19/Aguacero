/** All UI copy lives here so it can be translated later. Voice rules: README §5.11. */

export const site = {
  name: "aguacero",
  title: "Aguacero",
  tagline: "Colombian climate data, computed in your browser.",
  description:
    "Ask Colombia's open climate data anything. The calculation runs in your own browser, and a lab measures where computation should run.",
};

export const nav = [
  { href: "/datasets", label: "Datasets", fullReload: false },
  { href: "/my-dashboard", label: "My region", fullReload: false },
  { href: "/explore", label: "Explorer", fullReload: true },
  { href: "/lab", label: "Lab", fullReload: true },
  { href: "/results", label: "Results", fullReload: false },
] as const;

export const footer = {
  attribution:
    "Data: IDEAM, through Datos Abiertos Colombia, under the license shown on each dataset page. Aguacero is an independent project and not an official IDEAM product.",
  methodology: "Methodology",
  source: "Source code",
};

export const renderNote = {
  sentence: {
    SSG: () => "This page was built together with the site.",
    ISR: (time: string) =>
      `This page refreshes at most once an hour. Last refreshed ${time} Bogotá time.`,
    SSR: (time: string) => `This page was built for your visit at ${time}.`,
    CSR: () => "This page is assembled in your browser.",
  },
  disclosure: "How was this page made?",
  labels: {
    pattern: "Rendering pattern",
    renderedAt: "Rendered at",
    build: "Build",
    cache: "CDN cache",
    age: "Age",
  },
  patternNames: {
    SSG: "Fixed at build time (static generation, SSG)",
    ISR: "Refreshed hourly (incremental static regeneration, ISR)",
    SSR: "Built for each visit (server-side rendering, SSR)",
    CSR: "Built in your browser (client-side rendering, CSR)",
  },
  cacheUnknown: "Not reported here",
};

export const home = {
  h1: "How much rain fell where you live?",
  intro:
    "Ask Colombia's open climate data anything. The calculation runs in your own browser.",
  primaryCta: "Open the explorer",
  secondaryCta: "See how it was measured",
  questionsTitle: "Questions to start with",
  buildTitle: "How each page is built",
  build: [
    {
      term: "Fixed at build time",
      detail:
        "The methodology, the data dictionary and published results. They are made once, when the site is built, and served to everyone as they are.",
    },
    {
      term: "Refreshed hourly",
      detail:
        "The dataset catalog and dataset summaries. Everyone sees the same copy, and it is rebuilt in the background at most once an hour.",
    },
    {
      term: "Built for each visit",
      detail: "My region. It depends on the region you chose, so the server builds it every time.",
    },
    {
      term: "Built in your browser",
      detail:
        "The explorer and the lab. The page arrives almost empty and your browser does the work, including the SQL.",
    },
  ],
  resultsTitle: "What we measured",
  resultsAbsent: "Benchmark results will appear here once they are measured.",
};

export const dashboard = {
  title: "My region",
  empty: "No region chosen yet. Pick one to see current figures.",
  choose: "Choose region",
  save: "Save region",
  saved: "Region saved.",
  label: "Region",
  why: "This page is built for each visit. It reads the region you saved in a small cookie and asks the open data portal for fresh figures, so no two visitors necessarily see the same page and nothing is cached in between.",
};

export const explorer = {
  title: "Explorer",
  engineIdle: (size: string) => `The engine loads when you ask. It is about ${size} MB.`,
  loadEngine: "Load engine",
  loadingEngine: "Loading the engine",
  run: "Run query",
  stop: "Stop",
  localHint: "Drop a CSV or Parquet file here. It never leaves your browser.",
  unsupported:
    "This browser can't run the in-page engine. Try the latest Chrome, Firefox or Safari.",
  mtOn: (n: number) => `Multi-thread mode is on. The engine can use up to ${n} threads.`,
  mtOff: "Multi-thread mode is off in this browser. Queries still work, on one thread.",
};

export const lab = {
  title: "Lab",
  start: "Start benchmark",
  stop: "Stop",
  export: "Export results",
  exported: "Results exported.",
  finished: (n: number) => `Benchmark finished. ${n} runs recorded.`,
  froze: (ms: number) => `The page froze for ${ms} ms.`,
  responsive: "The page stayed responsive.",
};

export const runnerNames = {
  main: "Same thread as the page",
  "worker-copy": "Background thread (copy)",
  "worker-transfer": "Background thread (move)",
  "worker-pool-sab": "Shared-memory threads",
  "duckdb-st": "Database, 1 thread",
  "duckdb-mt": "Database, many threads",
  server: "Server",
} as const;
