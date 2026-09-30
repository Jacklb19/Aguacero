import type { Metadata } from "next";
import { Hyetograph } from "@/components/hyetograph/Hyetograph";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageIntro, ProseBlock, Section } from "@/components/layout/Prose";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusNote } from "@/components/ui/status-note";
import { explorer } from "@/content/copy";
import hero from "@/generated/hero-hyetograph.json";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const tokens = [
  ["fog", "Page background"],
  ["paper", "Inputs, popovers"],
  ["basalt", "Primary text"],
  ["ash", "Secondary text"],
  ["line", "Separators"],
  ["river", "Links, actions, focus"],
  ["river-deep", "Hover and pressed"],
  ["mora", "Peaks and warnings only"],
  ["frailejon", "Decorative fills only"],
] as const;

const typeScale = [
  ["text-display", "Display, home h1 only"],
  ["text-h1", "Page title"],
  ["text-h2", "Section"],
  ["text-h3", "Subsection"],
  ["text-body", "Body prose at 17 px"],
  ["text-small", "Captions, notes, table cells"],
  ["text-tiny", "Legal and secondary metadata"],
] as const;

function Swatches() {
  return (
    <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map(([name, role]) => (
        <li key={name} className="flex items-center gap-3">
          <span
            className="h-10 w-10 shrink-0 border border-line-strong"
            style={{ background: `var(--${name})` }}
            aria-hidden="true"
          />
          <span>
            <code className="text-small">{name}</code>
            <span className="block text-small text-ash">{role}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function StyleguidePage() {
  const renderedAt = new Date().toISOString();
  return (
    <>
      <main id="main" className="container-page flex-1">
        <PageIntro title="Styleguide">
          <p>
            Tokens and components in their real state. Switch the theme in the header to review
            both. This page is not indexed.
          </p>
        </PageIntro>

        <Section id="color" title="Color">
          <Swatches />
          <div data-theme="dark" className="mt-8 bg-fog p-6 text-basalt">
            <p className="text-small text-ash">The same tokens in the dark theme:</p>
            <Swatches />
          </div>
          <div className="mt-8 flex gap-[3px]" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className={`hyeto-bar seq-${i} h-16 flex-1`} />
            ))}
          </div>
          <p className="mt-2 text-small text-ash">Sequential ramp for rainfall and counts.</p>
        </Section>

        <Section id="type" title="Type">
          <ul className="mt-6 flex flex-col gap-4">
            {typeScale.map(([cls, role], i) => (
              <li key={cls} className="border-b border-line pb-3">
                <span
                  className={`${cls} ${i < 4 ? "font-heading font-bold" : ""} block text-basalt`}
                >
                  Rain in the páramo
                </span>
                <span className="text-small text-ash">
                  <code>{cls}</code>, {role}
                </span>
              </li>
            ))}
          </ul>
          <ProseBlock note={<p>A sidenote carries a caveat next to the paragraph it annotates.</p>}>
            <p>
              Key figures are sentences: the median month in Nariño brings{" "}
              <span className="figure-inline">142 mm</span> of rain. Links in prose are{" "}
              <a href="#type">underlined</a>.
            </p>
          </ProseBlock>
        </Section>

        <Section id="controls" title="Controls">
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button>Run query</Button>
            <Button variant="secondary">Export results</Button>
            <Button variant="quiet">Stop</Button>
            <Button disabled>Start benchmark</Button>
          </div>
          <div className="mt-6 flex max-w-sm flex-col gap-1">
            <label htmlFor="sg-input" className="text-small font-medium">
              Station name
            </label>
            <input
              id="sg-input"
              className="h-11 rounded-[6px] border border-line-strong bg-paper px-3"
              defaultValue="El Dorado"
            />
          </div>
        </Section>

        <Section id="notes" title="Status notes and states">
          <div className="mt-6 flex max-w-2xl flex-col gap-4">
            <StatusNote>{explorer.mtOn(8)}</StatusNote>
            <StatusNote tone="warning">
              The query stopped after 30 seconds. Try a shorter date range or fewer columns.
            </StatusNote>
            <EmptyState
              message="No region chosen yet. Pick one to see current figures."
              action={<Button variant="secondary">Choose region</Button>}
            />
            <div className="h-6 w-64 bg-line pulse-late" aria-hidden="true" />
          </div>
        </Section>

        <Section id="table" title="Table">
          <table className="mt-6 w-full max-w-xl border-collapse text-small">
            <thead>
              <tr className="border-b border-basalt text-left">
                <th scope="col" className="py-2 pr-4 font-bold">Month</th>
                <th scope="col" className="py-2 text-right font-bold">Rainfall (mm)</th>
              </tr>
            </thead>
            <tbody>
              {hero.months.slice(0, 4).map((m) => (
                <tr key={m.label} className="h-9 border-b border-line hover:bg-paper">
                  <td className="pr-4">{m.label}</td>
                  <td className="text-right tabular">{m.value.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section id="hyetograph" title="Hyetograph">
          <div className="mt-6">
            <Hyetograph
              items={hero.months}
              unit="mm"
              decimals={1}
              title="Sample hyetograph"
              description="Twelve bars hanging from the top axis."
              caption="Monthly rainfall normals, Bogotá."
              source="Source: IDEAM."
              height={9}
            />
          </div>
        </Section>
      </main>
      <SiteFooter route="/styleguide" renderedAt={renderedAt} />
    </>
  );
}
