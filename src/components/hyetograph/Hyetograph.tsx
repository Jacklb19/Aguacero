import type { CSSProperties } from "react";
import { formatNumber } from "@/lib/time";
import { scaleItems, type HyetoItem } from "./scale";

export interface HyetographProps {
  items: HyetoItem[];
  unit: string;
  title: string;
  description: string;
  caption?: string;
  source?: string;
  /** Plays the one entrance animation (home page only). */
  animate?: boolean;
  /** Height of the plot area in rem. */
  height?: number;
  /** Axis rule drawn by the page header instead of the figure (home page). */
  hideAxis?: boolean;
  decimals?: number;
}

/**
 * Hanging-bar chart (hyetograph). Pure HTML/CSS, zero JavaScript, server-renderable.
 * Longer bars mean more. Always paired with a table alternative.
 */
export function Hyetograph({
  items,
  unit,
  title,
  description,
  caption,
  source,
  animate = false,
  height = 14,
  hideAxis = false,
  decimals = 0,
}: HyetographProps) {
  const scaled = scaleItems(items);
  const fmt = (v: number) => `${formatNumber(v, decimals)} ${unit}`;
  const dense = items.length > 16;
  const descId = `hyeto-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`;

  return (
    <figure className="w-full">
      <p id={descId} className="sr-only">
        {description}
      </p>
      <div
        role="img"
        aria-label={title}
        aria-describedby={descId}
        className={animate ? "hyeto-animate" : undefined}
      >
        {!hideAxis ? <div className="h-0.5 bg-basalt" aria-hidden="true" /> : null}
        <div className="flex gap-[3px] pt-1" aria-hidden="true">
          {scaled.map((item) => (
            <div key={item.label} className="min-w-0 flex-1 text-center">
              <span
                className={`block truncate text-ash ${dense ? "text-[0.6875rem]" : "text-tiny"}`}
                title={item.label}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[3px]" style={{ height: `${height}rem` }} aria-hidden="true">
          {scaled.map((item, i) => (
            <div key={item.label} className="relative min-w-0 flex-1">
              <div
                className={`hyeto-bar seq-${item.cls} ${item.isMax ? "outline outline-1 outline-basalt/40" : ""}`}
                style={
                  {
                    height: `${Math.max(item.pct, item.value > 0 ? 1 : 0)}%`,
                    "--i": i,
                  } as CSSProperties
                }
              />
              {item.isMax ? (
                <span
                  className="absolute left-1/2 mt-1 -translate-x-1/2 text-tiny whitespace-nowrap text-basalt tabular"
                  style={{ top: `${item.pct}%` }}
                >
                  {formatNumber(item.value, decimals)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      {caption || source ? (
        <figcaption className="mt-6 text-small text-ash">
          {caption ? <p className="text-basalt">{caption}</p> : null}
          {source ? <p>{source}</p> : null}
        </figcaption>
      ) : null}
      <details className="disclosure mt-1 text-small">
        <summary>View as table</summary>
        <table className="mt-2 w-full max-w-md border-collapse text-small">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                Label
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Value ({unit})
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.label} className="border-b border-line">
                <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                  {item.label}
                </th>
                <td className="py-1.5 text-right tabular">{fmt(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
