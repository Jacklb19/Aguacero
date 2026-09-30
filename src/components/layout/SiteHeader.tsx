"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { nav } from "@/content/copy";
import { Wordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

function NavLink({
  href,
  label,
  fullReload,
  current,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  fullReload: boolean;
  current: boolean;
  onNavigate?: () => void;
  className: string;
}) {
  const props = {
    href,
    className,
    "aria-current": current ? ("page" as const) : undefined,
    onClick: onNavigate,
  };
  // Isolated routes need a full document load so COOP/COEP apply (README §6.2).
  if (fullReload) return <a {...props}>{label}</a>;
  return <Link {...props}>{label}</Link>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-b-2 border-basalt">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="-ml-1 rounded-[6px] px-1" aria-label="Aguacero, home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              current={isCurrent(item.href)}
              className="inline-flex h-11 items-center border-b-2 border-transparent px-3 font-medium text-basalt hover:text-river aria-[current=page]:border-river"
            />
          ))}
          <ThemeToggle />
        </nav>
        <div className="flex items-center md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[6px] text-basalt"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-paper md:hidden">
          <ul className="container-page py-2">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink
                  {...item}
                  current={isCurrent(item.href)}
                  onNavigate={() => setOpen(false)}
                  className="flex h-12 items-center border-l-2 border-transparent pl-3 font-medium text-basalt aria-[current=page]:border-river"
                />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
