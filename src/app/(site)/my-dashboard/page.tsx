import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Hyetograph } from "@/components/hyetograph/Hyetograph";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageIntro, ProseBlock, Section } from "@/components/layout/Prose";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusNote } from "@/components/ui/status-note";
import { datasets } from "@/config/datasets";
import { getRegion, REGION_COOKIE } from "@/config/regions";
import { dashboard } from "@/content/copy";
import { getRegionFigures, type RegionFigures } from "@/lib/socrata/queries";
import { bogotaDate, formatNumber } from "@/lib/time";
import { RegionForm } from "./RegionForm";

// SSR: reading the cookie already makes this dynamic; stated explicitly for clarity.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const metadata: Metadata = {
  title: "My region",
  description: "Fresh rainfall and temperature figures for the region you choose.",
  alternates: { canonical: "/my-dashboard" },
};

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function MyDashboardPage() {
  const jar = await cookies();
  const region = getRegion(jar.get(REGION_COOKIE)?.value);
  const now = new Date();
  const renderedAt = now.toISOString();

  let rain: RegionFigures | null = null;
  let temp: RegionFigures | null = null;
  let failed = false;
  if (region) {
    const [r, t] = await Promise.allSettled([
      getRegionFigures(datasets[0]!, region, now),
      getRegionFigures(datasets[1]!, region, now),
    ]);
    rain = r.status === "fulfilled" ? r.value : null;
    temp = t.status === "fulfilled" ? t.value : null;
    failed = r.status === "rejected" || t.status === "rejected";
  }

  return (
    <>
      <main id="main" className="container-page flex-1">
        <PageIntro title={region ? `My region: ${region.name}` : dashboard.title} />

        <ProseBlock
          note={<p>{dashboard.why}</p>}
          noteLabel="Why this page is built for each visit"
        >
          <RegionForm current={region?.slug} />
        </ProseBlock>

        {!region ? (
          <div className="mt-10">
            <EmptyState message={dashboard.empty} />
          </div>
        ) : (
          <>
            {failed ? (
              <StatusNote tone="warning" role="alert" className="mt-10 max-w-2xl">
                The open data portal did not answer in time for part of this page. Reload in a
                minute to try again.
              </StatusNote>
            ) : null}

            {rain ? (
              <Section id="rain" title="Rainfall, last two weeks">
                {rain.days.length === 0 ? (
                  <p className="prose-measure mt-4 text-ash">
                    No rainfall readings arrived from {region.name} since{" "}
                    {bogotaDate(rain.windowStart)}.
                  </p>
                ) : (
                  <>
                    <p className="prose-measure mt-4">
                      Since {bogotaDate(rain.windowStart)}, a typical station in {region.name}{" "}
                      recorded <span className="figure-inline">{formatNumber(rain.total, 1)} mm</span>{" "}
                      of rain, averaged over{" "}
                      <span className="figure-inline">{formatNumber(rain.stations)}</span>{" "}
                      reporting stations.
                    </p>
                    <div className="mt-8">
                      <Hyetograph
                        items={rain.days.map((d) => ({
                          label: shortDate.format(new Date(`${d.date}T00:00:00Z`)),
                          value: d.value,
                        }))}
                        unit="mm"
                        decimals={1}
                        title={`Daily rainfall per station in ${region.name}`}
                        description="One bar per day hangs from the top axis. Longer bars mean more rain."
                        caption={`Daily rainfall, mean across reporting stations in ${region.name}.`}
                        source="Source: IDEAM, dataset s54a-sgyg on datos.gov.co. Latest readings may still be arriving."
                        height={11}
                      />
                    </div>
                  </>
                )}
              </Section>
            ) : null}

            {temp && temp.days.length > 0 ? (
              <Section id="temperature" title="Air temperature, last two weeks">
                <p className="prose-measure mt-4">
                  The average air temperature across {formatNumber(temp.stations)} stations in{" "}
                  {region.name} was <span className="figure-inline">{formatNumber(temp.total, 1)} °C</span>.
                </p>
              </Section>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter route="/my-dashboard" renderedAt={renderedAt} />
    </>
  );
}
