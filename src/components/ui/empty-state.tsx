import type { ReactNode } from "react";

/** One sentence, one action, and the small hyetograph motif (four short bars). */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 py-6">
      <svg width="48" height="28" viewBox="0 0 48 28" aria-hidden="true">
        <rect x="0" y="0" width="48" height="2" fill="var(--line-strong)" />
        {[6, 14, 10, 4].map((h, i) => (
          <rect
            key={i}
            x={4 + i * 11}
            y="3"
            width="6"
            height={h}
            rx="1.5"
            fill="var(--frailejon)"
          />
        ))}
      </svg>
      <p className="text-basalt">{message}</p>
      {action}
    </div>
  );
}
