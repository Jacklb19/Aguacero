"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

function Placeholder() {
  return (
    <div className="mt-8 flex flex-col gap-6" aria-hidden="true">
      <div className="h-12 max-w-3xl bg-paper" />
      <div className="grid gap-10 md:grid-cols-12">
        <div className="h-72 bg-paper md:col-span-4 lg:col-span-3" />
        <div className="h-72 bg-paper md:col-span-8 lg:col-span-9" />
      </div>
    </div>
  );
}

// ssr: false is only allowed inside a Client Component (README §15).
const Explorer = dynamic(() => import("./Explorer").then((m) => m.Explorer), {
  ssr: false,
  loading: Placeholder,
});

export function ExplorerLoader() {
  return (
    <Suspense fallback={<Placeholder />}>
      <Explorer />
    </Suspense>
  );
}
