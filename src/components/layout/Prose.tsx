import type { ReactNode } from "react";

/** Page title + one-paragraph summary, left-aligned. */
export function PageIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="pt-12 md:pt-16">
      <h1 className="text-h1 tracking-[-0.01em]">{title}</h1>
      {children ? (
        <div className="prose-measure mt-5 text-[1.1875rem] leading-relaxed text-ash">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A prose block with an optional sidenote. From 1024px the note sits in the right margin
 * next to the paragraph it annotates; below that it becomes an inline disclosure.
 */
export function ProseBlock({
  children,
  note,
  noteLabel = "Note",
}: {
  children: ReactNode;
  note?: ReactNode;
  noteLabel?: string;
}) {
  return (
    <div className="prose mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
      <div className="prose-measure lg:col-span-8">{children}</div>
      {note ? (
        <>
          <aside className="hidden border-l border-line pl-4 text-small text-ash lg:col-span-3 lg:col-start-10 lg:block">
            {note}
          </aside>
          <details className="disclosure mt-2 text-small text-ash lg:hidden">
            <summary>{noteLabel}</summary>
            <div className="border-l border-line pl-4">{note}</div>
          </details>
        </>
      ) : null}
    </div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-16 md:mt-20">
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}
