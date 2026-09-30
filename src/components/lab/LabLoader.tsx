"use client";

import dynamic from "next/dynamic";

const Lab = dynamic(() => import("./Lab").then((m) => m.Lab), {
  ssr: false,
  loading: () => <div className="mt-8 h-96 bg-paper" aria-hidden="true" />,
});

export function LabLoader() {
  return <Lab />;
}
