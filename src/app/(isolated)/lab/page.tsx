import type { Metadata } from "next";
import { LabLoader } from "@/components/lab/LabLoader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { lab } from "@/content/copy";

export const metadata: Metadata = {
  title: "Lab",
  description:
    "Run the same computation seven ways in your browser and watch when the page freezes.",
  alternates: { canonical: "/lab" },
};

export default function LabPage() {
  return (
    <>
      <main id="main" className="container-page flex-1">
        <h1 className="pt-12 text-h1 tracking-[-0.01em] md:pt-16">{lab.title}</h1>
        <p className="prose-measure mt-4 text-ash">
          The same job, counting and summing ten million numbers or fewer, done seven ways. A
          longer bar means slower.
        </p>
        <LabLoader />
      </main>
      <SiteFooter route="/lab" />
    </>
  );
}
