import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Bitter } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { site } from "@/content/copy";
import { siteUrl } from "@/lib/env";
import "./globals.css";

// next/font self-hosts these files at build time, so isolated routes make no third-party requests.
const bitter = Bitter({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-bitter",
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-atkinson-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: site.title, template: `%s | ${site.title}` },
  description: site.description,
  applicationName: site.title,
  openGraph: { siteName: site.title, type: "website", locale: "en" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8eeea" },
    { media: "(prefers-color-scheme: dark)", color: "#14232a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bitter.variable} ${atkinson.variable} ${atkinsonMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[6px] focus:bg-paper focus:px-4 focus:py-3 focus:text-river"
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
