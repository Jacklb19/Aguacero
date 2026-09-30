"use client";

import { useSyncExternalStore } from "react";
import { explorer } from "@/content/copy";
import { StatusNote } from "./status-note";

const noop = () => () => undefined;

export function useIsolation(): { isolated: boolean; threads: number } | null {
  const isolated = useSyncExternalStore(noop, () => self.crossOriginIsolated === true, () => null);
  const threads = useSyncExternalStore(noop, () => navigator.hardwareConcurrency || 1, () => 1);
  if (isolated === null) return null;
  return { isolated, threads };
}

/** Multi-thread status note (README §5.9). */
export function IsolationNote({ className }: { className?: string }) {
  const iso = useIsolation();
  if (!iso) return <div className={`h-12 bg-paper ${className ?? ""}`} aria-hidden="true" />;
  return (
    <StatusNote role="status" {...(className ? { className } : {})}>
      <span data-testid="isolation-status" data-isolated={String(iso.isolated)}>
        {iso.isolated ? explorer.mtOn(iso.threads) : explorer.mtOff}
      </span>
    </StatusNote>
  );
}
