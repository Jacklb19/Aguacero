import type { NextConfig } from "next";

const isolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

const nextConfig: NextConfig = {
  // Classic caching model on purpose: cacheComponents stays off (README §2).
  poweredByHeader: false,
  // datos.gov.co aggregates can take 20-60 s; the default 60 s per page is too tight.
  staticPageGenerationTimeout: 300,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      // Only these routes are cross-origin isolated (README §6.2, docs/DECISIONS.md).
      { source: "/explore", headers: isolation },
      { source: "/explore/:path*", headers: isolation },
      { source: "/lab", headers: isolation },
      { source: "/lab/:path*", headers: isolation },
      // Versioned paths, safe to cache forever.
      { source: "/duckdb/:path*", headers: immutable },
      { source: "/data/:path*", headers: immutable },
    ];
  },
};

export default nextConfig;
