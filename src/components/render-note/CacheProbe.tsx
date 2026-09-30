"use client";

import { useEffect, useState } from "react";
import { renderNote } from "@/content/copy";
import { bogotaTime } from "@/lib/time";

/** After hydration, asks the CDN how it served this URL (x-vercel-cache and age). */
export function CacheProbe() {
  const [info, setInfo] = useState<{ cache: string; age: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(window.location.href, { method: "HEAD", signal: controller.signal, cache: "no-store" })
      .then((res) =>
        setInfo({
          cache: res.headers.get("x-vercel-cache") ?? renderNote.cacheUnknown,
          age: res.headers.get("age") ?? renderNote.cacheUnknown,
        }),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <>
      <dt>{renderNote.labels.cache}</dt>
      <dd className="tabular text-basalt">{info?.cache ?? "…"}</dd>
      <dt>{renderNote.labels.age}</dt>
      <dd className="tabular text-basalt">
        {info ? (info.age === renderNote.cacheUnknown ? info.age : `${info.age} s`) : "…"}
      </dd>
    </>
  );
}

/** Shows when the page was assembled in the browser. Computed after mount only. */
export function ClientRenderedAt({ fallback }: { fallback?: string | undefined }) {
  const [iso, setIso] = useState<string | null>(null);
  useEffect(() => {
    if (fallback) return;
    // Deferred so the timestamp is never part of hydration output.
    const id = requestAnimationFrame(() => setIso(new Date().toISOString()));
    return () => cancelAnimationFrame(id);
  }, [fallback]);
  if (fallback) return <>{fallback}</>;
  return iso ? <time dateTime={iso}>{bogotaTime(iso, true)} Bogotá time</time> : <>…</>;
}
