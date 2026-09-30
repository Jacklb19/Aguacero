import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hyetograph } from "@/components/hyetograph/Hyetograph";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageIntro, ProseBlock, Section } from "@/components/layout/Prose";
import { getDataset } from "@/config/datasets";
import { siteUrl } from "@/lib/env";
import { getCatalogEntry, getDatasetSummary } from "@/lib/socrata/queries";
import { bogotaDate, bogotaTime, formatNumber } from "@/lib/time";

export const revalidate = 3600;
export const maxDuration = 300;
// Rendered on first visit, then cached and refreshed hourly (ISR). Not prerendered at build
// because upstream aggregates can take close to a minute. Unknown ids return 404 below.
export const dynamicParams = true;

export function generateStaticParams(): { id: string }[] {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/datasets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = getDataset(id);
  if (!d) return {};
  return {
    title: d.title,
    description: d.summary,
    alternates: { canonical: `/datasets/${d.slug}` },
  };
}

export default async function DatasetPage({ params }: PageProps<"/datasets/[id]">) {
  const { id } = await params;
  const d = getDataset(id);
  if (!d) notFound();

  const now = new Date();
  const [entry, summary] = await Promise.all([getCatalogEntry(d), getDatasetSummary(d, now)]);
  const renderedAt = now.toISOString();
  const busiestYear = summary.perYear.reduce((a, b) => (b.rows > a.rows ? b : a));
  const topRegions = summary.perRegion.slice(0, 12);
  const top = topRegions[0]!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${d.title} (IDEAM)`,
    description: d.summary,
    url: `${siteUrl()}/datasets/${d.slug}`,
    sameAs: d.sourceUrl,
    license: d.license.url,
    creator: { "@type": "Organization", name: "IDEAM" },
    dateModified: entry.updatedAt,
    variableMeasured: `${d.measure} (${d.unit})`,
    spatialCoverage: "Colombia",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <main id="main" className="container-page flex-1">
        <PageIntro title={d.title}>
          <p>{d.summary}</p>
        </PageIntro>

        <Section id="figures" title="Key figures">
          <ProseBlock
            note={
              <p>
                Counts are readings, not days. Automatic stations report every few minutes, and
                the number of stations has grown over time.
              </p>
            }
            noteLabel="About these counts"
          >
            <p>
              The dataset holds <span className="figure-inline">{formatNumber(entry.rows)}</span>{" "}
              readings. The busiest year was {busiestYear.year}, with{" "}
              <span className="figure-inline">{formatNumber(busiestYear.rows)}</span> readings.
            </p>
            <p>
              In the last {summary.windowDays} days, {top.region} sent the most readings:{" "}
              <span className="figure-inline">{formatNumber(top.rows)}</span>.
            </p>
            <p>
              The publisher last added data on {bogotaDate(entry.updatedAt)}. This summary was
              refreshed at {bogotaTime(renderedAt)} Bogotá time.
            </p>
          </ProseBlock>
        </Section>

        <Section id="per-year" title="Readings per year">
          <div className="mt-8">
            <Hyetograph
              items={summary.perYear.map((y) => ({ label: String(y.year), value: y.rows }))}
              unit="readings"
              title={`Readings per year, ${d.title.toLowerCase()} dataset`}
              description={`One bar per year hangs from the top axis. The longest is ${busiestYear.year}.`}
              caption="Readings per year. Longer bars mean more readings."
              source={`Source: IDEAM, dataset ${d.id} on datos.gov.co.`}
              height={12}
            />
          </div>
        </Section>

        <Section id="per-region" title={`Readings per department, last ${summary.windowDays} days`}>
          <div className="mt-8">
            <Hyetograph
              items={topRegions.map((r) => ({ label: r.region, value: r.rows }))}
              unit="readings"
              title={`Readings per department in the last ${summary.windowDays} days`}
              description={`The twelve departments with the most readings. ${top.region} leads.`}
              caption={`Departments with the most readings since ${bogotaDate(summary.windowStart)}.`}
              source={`Source: IDEAM, dataset ${d.id} on datos.gov.co.`}
              height={12}
            />
          </div>
        </Section>

        <Section id="next" title="Go further">
          <ul className="mt-6 flex flex-col gap-2">
            <li>
              <a href={`/explore?dataset=${d.slug}`} className="prose-link">
                Ask this data a question in the explorer
              </a>
            </li>
            <li>
              <Link href={`/dictionary/${d.slug}`} className="prose-link">
                Read the data dictionary
              </Link>
            </li>
            <li>
              <a href={d.sourceUrl} className="prose-link">
                See the original on datos.gov.co
              </a>
            </li>
          </ul>
          <p className="prose-measure mt-6 text-small text-ash">
            {d.attribution} Licensed under{" "}
            <a href={d.license.url} className="prose-link">
              {d.license.name}
            </a>
            . Aguacero is not an official IDEAM product.
          </p>
        </Section>
      </main>
      <SiteFooter route="/datasets/[id]" renderedAt={renderedAt} />
    </>
  );
}
