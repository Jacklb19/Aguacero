"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { lab } from "@/content/copy";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Moves with requestAnimationFrame (main thread), so it visibly stops when the page freezes.
 * A CSS animation would keep running on the compositor and hide the freeze.
 */
export function FreezeMeter({ running, frozeMs }: { running: boolean; frozeMs: number | null }) {
  const barRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    if (!running || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 1200) % 1;
      const x = t < 0.5 ? t * 2 : 2 - t * 2;
      if (barRef.current) barRef.current.style.transform = `translateX(${x * 2.5}rem)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, reduced]);

  let sentence = "Waiting for a benchmark.";
  if (running) sentence = reduced ? "Benchmark running." : "Benchmark running. The bar stops if the page freezes.";
  else if (frozeMs !== null) sentence = frozeMs >= 50 ? lab.froze(Math.round(frozeMs)) : lab.responsive;

  return (
    <div className="flex items-center gap-3" data-testid="freeze-meter">
      <div className="relative h-3 w-12 border-t-2 border-basalt" aria-hidden="true">
        {reduced ? (
          <div className={`absolute top-0 left-0 h-2 w-3 rounded-b-[3px] ${running ? "bg-river" : "bg-line"}`} />
        ) : (
          <div
            ref={barRef}
            className={`absolute top-0 left-0 h-2 w-2 rounded-b-[3px] ${running ? "bg-river" : "bg-line"}`}
          />
        )}
      </div>
      <p role="status" className="text-small text-ash">
        {sentence}
      </p>
    </div>
  );
}
