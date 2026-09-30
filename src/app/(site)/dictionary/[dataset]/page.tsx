import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageIntro, ProseBlock, Section } from "@/components/layout/Prose";
import { datasets, getDataset } from "@/config/datasets";

export const dynamicParams = false;

export function generateStaticParams() {
  return datasets.map((d) => ({ dataset: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/dictionary/[dataset]">): Promise<Metadata> {
  const { dataset } = await params;
  const d = getDataset(dataset);
  if (!d) return {};
  return {
    title: `${d.title} data dictionary`,
    description: `Columns, types and meaning of the IDEAM ${d.title.toLowerCase()} dataset.`,
    alternates: { canonical: `/dictionary/${d.slug}` },
  };
}

export default async function DictionaryPage({ params }: PageProps<"/dictionary/[dataset]">) {
  const { dataset } = await params;
  const d = getDataset(dataset);
  if (!d) notFound();
  const renderedAt = new Date().toISOString();

  return (
    <>
      <main id="main" className="container-page flex-1">
        <PageIntro title={`${d.title} data dictionary`}>
          <p>{d.summary}</p>
        </PageIntro>

        <Section id="columns" title="Columns">
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-small">
              <thead>
                <tr className="border-b border-basalt text-left">
                  <th scope="col" className="py-2 pr-4 font-bold">
                    Column
                  </th>
                  <th scope="col" className="py-2 pr-4 font-bold">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-4 font-bold">
                    Type
                  </th>
                  <th scope="col" className="py-2 font-bold">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.columns.map((c) => (
                  <tr key={c.field} className="border-b border-line align-top">
                    <td className="py-2 pr-4">
                      <code>{c.field}</code>
                    </td>
                    <td className="py-2 pr-4 text-basalt">{c.label}</td>
                    <td className="py-2 pr-4 text-ash">{c.type.replace("_", " ")}</td>
                    <td className="py-2 text-ash">{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="source" title="Source and license">
          <ProseBlock
            note={
              <p>
                The license requires attribution and that derived data is shared under the same
                terms.
              </p>
            }
            noteLabel="About the license"
          >
            <p>
              {d.attribution} Dataset <code>{d.id}</code>,{" "}
              <a href={d.sourceUrl}>available on datos.gov.co</a>. Licensed under{" "}
              <a href={d.license.url}>{d.license.name}</a>.
            </p>
            <p>Aguacero is an independent project and not an official IDEAM product.</p>
          </ProseBlock>
        </Section>
      </main>
      <SiteFooter route="/dictionary/[dataset]" renderedAt={renderedAt} />
    </>
  );
}
