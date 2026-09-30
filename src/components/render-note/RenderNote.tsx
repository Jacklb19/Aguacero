import { getRoute, type RoutePath } from "@/config/routes";
import { renderNote } from "@/content/copy";
import { buildId } from "@/lib/env";
import { bogotaTime } from "@/lib/time";
import { CacheProbe, ClientRenderedAt } from "./CacheProbe";

/**
 * Makes the rendering pattern visible (README §4.2).
 * For SSG/ISR/SSR the timestamp is computed on the server while rendering; for CSR it is
 * filled in after mount so no time is computed during hydration.
 */
export function RenderNote({ route, renderedAt }: { route: RoutePath; renderedAt?: string }) {
  const spec = getRoute(route);
  const pattern = spec.pattern;
  let sentence: string;
  if (pattern === "ISR" && renderedAt) sentence = renderNote.sentence.ISR(bogotaTime(renderedAt));
  else if (pattern === "SSR" && renderedAt)
    sentence = renderNote.sentence.SSR(bogotaTime(renderedAt, true));
  else if (pattern === "CSR") sentence = renderNote.sentence.CSR();
  else sentence = renderNote.sentence.SSG();

  return (
    <section aria-label="Rendering" className="text-small text-ash" data-render-pattern={pattern}>
      <p>{sentence}</p>
      <details className="disclosure">
        <summary>{renderNote.disclosure}</summary>
        <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 pb-2">
          <dt>{renderNote.labels.pattern}</dt>
          <dd className="text-basalt">{renderNote.patternNames[pattern]}</dd>
          <dt>{renderNote.labels.renderedAt}</dt>
          <dd className="tabular text-basalt">
            {pattern === "CSR" || !renderedAt ? (
              <ClientRenderedAt fallback={pattern === "SSG" ? "At build time" : undefined} />
            ) : (
              <time dateTime={renderedAt}>{bogotaTime(renderedAt, true)} Bogotá time</time>
            )}
          </dd>
          <dt>{renderNote.labels.build}</dt>
          <dd className="tabular text-basalt">{buildId()}</dd>
          <CacheProbe />
        </dl>
      </details>
    </section>
  );
}
