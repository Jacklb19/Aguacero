import type { Metadata } from "next";
import Link from "next/link";
import { Hyetograph } from "@/components/hyetograph/Hyetograph";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ButtonAnchor } from "@/components/ui/button";
import { datasets } from "@/config/datasets";
import { home } from "@/content/copy";
import hero from "@/generated/hero-hyetograph.json";
import { loadResults } from "@/lib/bench/load-results";
import { formatNumber } from "@/lib/time";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "Aguacero: Colombian climate data, computed in your browser" },
  alternates: { canonical: "/" },
};

const monthNames: Record<string, string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June",
  Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December",
};

export default function HomePage() {
  const renderedAt = new Date().toISOString();
  const peak = hero.months.reduce((a, b) => (b.value > a.value ? b : a));
  const precipitation = datasets[0]!;
  const results = loadResults();

  return (
    <>
      <main id="main" className="flex-1">
        <div className="container-page">
          <section aria-label="Monthly rainfall" className="-mt-0.5">
            <Hyetograph
              items={hero.months}
              unit={hero.unit}
              title={`${hero.title}, ${hero.location}, ${hero.period}`}
              description={`Twelve bars hang from the top edge, one per month. The longest is ${monthNames[peak.label]}, with ${formatNumber(peak.value, 1)} mm. Rain peaks twice a year, around April and October.`}
              caption={`${hero.title}, ${hero.location}, ${hero.period}. Peak: ${monthNames[peak.label]}, ${formatNumber(peak.value, 1)} mm.`}
              source={`Source: ${hero.source}`}
              animate
              hideAxis
              height={13}
              decimals={1}
            />
          </section>

          <section className="mt-16 max-w-3xl">
            <h1 className="text-display tracking-[-0.01em]">{home.h1}</h1>
            <p className="prose-measure mt-6 text-[1.25rem] leading-relaxed text-ash">
              {home.intro}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonAnchor href="/explore">{home.primaryCta}</ButtonAnchor>
              <Link href="/methodology" className="prose-link inline-flex min-h-11 items-center">
                {home.secondaryCta}
              </Link>
            </div>
          </section>

          <section className="mt-28" aria-labelledby="questions">
            <h2 id="questions" className="text-h2">
              {home.questionsTitle}
            </h2>
            <ul className="mt-6 flex flex-col">
              {precipitation.presets.slice(0, 3).map((p) => (
                <li key={p.id} className="border-b border-line">
                  <a
                    href={`/explore?dataset=${precipitation.slug}&preset=${p.id}`}
                    className="flex min-h-12 items-center py-2 text-h3 font-heading font-semibold text-river hover:text-river-deep"
                  >
                    {p.question}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-28 md:grid md:grid-cols-12 md:gap-8" aria-labelledby="build">
            <h2 id="build" className="text-h2 md:col-span-4">
              {home.buildTitle}
            </h2>
            <dl className="mt-6 md:col-span-8 md:mt-0">
              {home.build.map((b) => (
                <div
                  key={b.term}
                  className="grid gap-1 border-b border-line py-4 first:pt-0 sm:grid-cols-[12rem_1fr] sm:gap-6"
                >
                  <dt className="font-bold text-basalt">{b.term}</dt>
                  <dd className="text-ash">{b.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          {results.length > 0 ? (
            <section className="mt-28" aria-labelledby="measured">
              <h2 id="measured" className="text-h2">
                {home.resultsTitle}
              </h2>
              <p className="prose-measure mt-4 text-ash">
                {results.length} benchmark{" "}
                {results.length === 1 ? "suite has" : "suites have"} been published.{" "}
                <Link href="/results" className="prose-link">
                  Read the results
                </Link>
                .
              </p>
            </section>
          ) : null}
        </div>
      </main>
      <SiteFooter route="/" renderedAt={renderedAt} />
    </>
  );
}
