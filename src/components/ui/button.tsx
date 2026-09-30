import { clsx } from "clsx";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] px-5 font-medium transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-river text-on-river hover:bg-river-deep active:bg-river-deep forced-colors:border forced-colors:border-[ButtonText]",
  secondary: "border border-river text-river hover:border-river-deep hover:text-river-deep",
  quiet: "px-2 text-river underline-offset-[0.2em] hover:underline",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return clsx(base, variants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

/** A link styled as a button. Use for navigation into isolated routes (full page load). */
export function ButtonAnchor({
  variant = "primary",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return <a className={buttonClass(variant, className)} {...props} />;
}
