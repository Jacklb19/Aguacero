import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageIntro, Section } from "@/components/layout/Prose";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultsView } from "@/components/charts/ResultsView";
import { home } from "@/content/copy";
import { loadResults } from "@/lib/bench/load-results";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Measured results: where a computation should run, and at what data size the answer changes.",
  alternates: { canonical: "/results" },
};

export default function ResultsPage() {
  const results = loadResults();
  const renderedAt = new Date().toISOString();
  return (
    <>
      <main id="main" className="container-page flex-1">
        <PageIntro title="Results">
          <p>
            Seven ways to do the same computation, measured on real devices. Each chart has a
            table next to it, and each result names the device it came from.
          </p>
        </PageIntro>
        {results.length === 0 ? (
          <Section id="none" title="Nothing measured yet">
            <EmptyState
              message={home.resultsAbsent}
              action={
                <a href="/lab" className="prose-link">
                  Run the lab on this device
                </a>
              }
            />
          </Section>
        ) : (
          <ResultsView suites={results} />
        )}
      </main>
      <SiteFooter route="/results" renderedAt={renderedAt} />
    </>
  );
}
