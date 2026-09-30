import type { Metadata } from "next";
import { ExplorerLoader } from "@/components/explorer/ExplorerLoader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { explorer } from "@/content/copy";

export const metadata: Metadata = {
  title: "Explorer",
  description:
    "Ask Colombian climate data questions in SQL. The query runs in your browser; your own files never leave it.",
  alternates: { canonical: "/explore" },
};

/** CSR: a static shell; everything below the title is assembled in the browser. */
export default function ExplorePage() {
  return (
    <>
      <main id="main" className="container-page flex-1">
        <h1 className="pt-12 text-h1 tracking-[-0.01em] md:pt-16">{explorer.title}</h1>
        <ExplorerLoader />
      </main>
      <SiteFooter route="/explore" />
    </>
  );
}
