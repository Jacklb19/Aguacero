import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageIntro, ProseBlock, Section } from "@/components/layout/Prose";
import { datasets } from "@/config/datasets";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "Which data Aguacero uses, the synthetic workload behind the benchmark, what is measured and the known limits.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  const renderedAt = new Date().toISOString();
  return (
    <>
      <main id="main" className="container-page flex-1">
        <PageIntro title="How it was measured">
          <p>
            Aguacero asks one question: where should a computation run? On the server, on the
            page itself, in a background thread, in several threads sharing memory, or inside a
            database that runs in the browser. This page explains the data, the workload and the
            measurements behind the answer.
          </p>
        </PageIntro>

        <Section id="data" title="The data">
          <ProseBlock
            note={
              <p>
                Department names are spelled in several ways upstream, for example “BOGOTÁ”,
                “BOGOTA D.C.” and “Bogotá”. Aguacero groups known spellings under one region.
              </p>
            }
            noteLabel="About place names"
          >
            <p>
              All climate figures come from the Institute of Hydrology, Meteorology and
              Environmental Studies (IDEAM), published on Datos Abiertos Colombia. The readings
              come from automatic stations and arrive every few minutes, so the tables are large.
            </p>
            <ul className="mt-4 list-disc pl-5">
              {datasets.map((d) => (
                <li key={d.slug}>
                  <Link href={`/dictionary/${d.slug}`}>{d.title}</Link>: {d.summary}
                </li>
              ))}
            </ul>
          </ProseBlock>
        </Section>

        <Section id="workload" title="The synthetic workload">
          <ProseBlock
            note={
              <p>
                Integers keep every sum below 2<sup>53</sup>, so JavaScript numbers and SQL
                integers agree to the last digit.
              </p>
            }
            noteLabel="Why integers"
          >
            <p>
              To compare fairly, every way of computing runs the same job. For each row number{" "}
              <em>i</em>, the key is <code>(i × 7919) mod 1000</code> and the value is{" "}
              <code>(i × 104729) mod 10007</code>. For each of the 1,000 keys we count the rows and
              compute the sum, the minimum and the maximum.
            </p>
            <p>
              Each result is reduced to one checksum. A run fails if its checksum differs from the
              one computed on the page itself, so no approach can win by skipping work.
            </p>
          </ProseBlock>
        </Section>

        <Section id="metrics" title="What is measured">
          <ProseBlock
            note={
              <p>
                Browsers coarsen timers on pages that are not cross-origin isolated. Every result
                records whether isolation was on.
              </p>
            }
            noteLabel="About timer precision"
          >
            <p>
              For each run we record setup time, compute time and total time (including moving
              data between threads or over the network), the bytes moved, how long the page could
              not respond, and the longest gap between two painted frames.
            </p>
            <p>
              Each combination of approach and data size runs twice to warm up and seven times for
              the record. Approaches run one after another, in random order. We report the median,
              the 95th percentile, the minimum and the spread between the quartiles. Unusual runs
              are flagged, never silently dropped.
            </p>
          </ProseBlock>
        </Section>

        <Section id="limits" title="Limits">
          <ProseBlock>
            <p>
              Results depend on the device, the browser and what else is running. A laptop and a
              phone can reach opposite conclusions, which is why each result file names the device
              it came from. The server approach includes network time from wherever the test was
              run to the hosting region.
            </p>
            <p>
              Aguacero is an independent project and not an official IDEAM product. Station
              readings are published as they arrive and may contain errors that IDEAM later
              corrects.
            </p>
          </ProseBlock>
        </Section>
      </main>
      <SiteFooter route="/methodology" renderedAt={renderedAt} />
    </>
  );
}
