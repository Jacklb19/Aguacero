import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageIntro } from "@/components/layout/Prose";
import { datasets } from "@/config/datasets";
import { getCatalogEntry } from "@/lib/socrata/queries";
import { bogotaDate, bogotaTime, formatNumber } from "@/lib/time";

// ISR: literal, statically analyzable (README §4.1). Mirrors ISR_SECONDS in routes.ts.
export const revalidate = 3600;
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Datasets",
  description: "IDEAM climate datasets available in Aguacero, with size and freshness.",
  alternates: { canonical: "/datasets" },
};

export default async function DatasetsPage() {
  const entries = await Promise.all(datasets.map((d) => getCatalogEntry(d)));
  const renderedAt = new Date().toISOString();

  return (
    <>
      <main id="main" className="container-page flex-1">
        <PageIntro title="Datasets">
          <p>
            Station readings published by IDEAM on Datos Abiertos Colombia. Refreshed at{" "}
            <time dateTime={renderedAt}>{bogotaTime(renderedAt)}</time> Bogotá time.
          </p>
        </PageIntro>
        <ul className="mt-12 border-t border-line">
          {entries.map((e) => (
            <li key={e.dataset.slug} className="border-b border-line py-8">
              <h2 className="text-h2">
                <Link
                  href={`/datasets/${e.dataset.slug}`}
                  className="text-river hover:text-river-deep"
                >
                  {e.dataset.title}
                </Link>
              </h2>
              <p className="prose-measure mt-2 text-ash">{e.dataset.summary}</p>
              <p className="prose-measure mt-3">
                <span className="figure-inline">{formatNumber(e.rows)}</span> readings. The
                publisher last added data on {bogotaDate(e.updatedAt)}.
              </p>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter route="/datasets" renderedAt={renderedAt} />
    </>
  );
}
