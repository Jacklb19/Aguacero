/** The mark: a top rule with four bars hanging from it (README §5.8). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="20" height="2" fill="var(--basalt)" />
      <path
        fill="var(--river)"
        d="M5 4h2.6v5.7a1.3 1.3 0 0 1-2.6 0z M9.5 4h2.6v13.7a1.3 1.3 0 0 1-2.6 0z M14 4h2.6v8.7a1.3 1.3 0 0 1-2.6 0z M18.5 4h2.6v3.7a1.3 1.3 0 0 1-2.6 0z"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-heading text-[1.35rem] leading-none font-bold text-basalt">
        aguacero
      </span>
    </span>
  );
}
