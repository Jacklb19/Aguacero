import { clsx } from "clsx";
import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function StatusNote({
  tone = "info",
  children,
  role,
  className,
}: {
  tone?: "info" | "warning";
  children: ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      role={role}
      className={clsx(
        "flex items-start gap-3 border-l-[3px] bg-paper px-4 py-3 text-small text-basalt",
        tone === "warning" ? "border-mora" : "border-river",
        className,
      )}
    >
      <Icon
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
        className={clsx("mt-0.5 shrink-0", tone === "warning" ? "text-mora" : "text-river")}
      />
      <div>{children}</div>
    </div>
  );
}
