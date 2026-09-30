"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { formatCell, RENDER_CAP, type QueryResult } from "./result";

const ROW_HEIGHT = 36;

/** Virtualized result table: sticky header, 36px rows, right-aligned numbers, radius 0. */
export function ResultTable({ result }: { result: QueryResult }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = result.rows.slice(0, RENDER_CAP);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is not compiler-aware.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const template = `repeat(${result.columns.length}, minmax(8rem, 1fr))`;

  return (
    <div
      ref={parentRef}
      className="max-h-[28rem] overflow-auto border-y border-line"
      role="table"
      aria-label="Query result"
      aria-rowcount={rows.length + 1}
      tabIndex={0}
    >
      <div
        role="row"
        className="sticky top-0 z-10 grid border-b border-basalt bg-fog text-small font-bold"
        style={{ gridTemplateColumns: template, minWidth: "max-content" }}
      >
        {result.columns.map((c) => (
          <div
            key={c.name}
            role="columnheader"
            className={`truncate px-3 py-2 ${c.numeric ? "text-right" : ""}`}
          >
            {c.name}
          </div>
        ))}
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", minWidth: "max-content" }}>
        {virtualizer.getVirtualItems().map((vr) => {
          const row = rows[vr.index]!;
          return (
            <div
              key={vr.key}
              role="row"
              aria-rowindex={vr.index + 2}
              className="absolute left-0 grid w-full border-b border-line text-small hover:bg-paper"
              style={{
                gridTemplateColumns: template,
                height: ROW_HEIGHT,
                transform: `translateY(${vr.start}px)`,
              }}
            >
              {row.map((cell, i) => (
                <div
                  key={i}
                  role="cell"
                  className={`truncate px-3 leading-[36px] ${result.columns[i]?.numeric ? "text-right tabular" : ""}`}
                >
                  {formatCell(cell)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
