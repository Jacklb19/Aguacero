import { ImageResponse } from "next/og";
import hero from "@/generated/hero-hyetograph.json";

export const alt = "Aguacero: Colombian climate data, computed in your browser";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RAMP = ["#ffffcc", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"];

async function bitter(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Bitter:wght@700&text=Aguacero", {
        cache: "force-cache",
      })
    ).text();
    const url = css.match(/src: url\((.+?)\)/)?.[1];
    return url ? await (await fetch(url, { cache: "force-cache" })).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Open Graph image: the hyetograph motif and the title in Bitter on fog. */
export default async function OpengraphImage() {
  const max = Math.max(...hero.months.map((m) => m.value));
  const sorted = [...hero.months.map((m) => m.value)].sort((a, b) => a - b);
  const font = await bitter();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#e8eeea",
          padding: "0 72px",
        }}
      >
        <div style={{ display: "flex", height: 6, background: "#1c2a31", marginTop: 72 }} />
        <div style={{ display: "flex", gap: 10, height: 250 }}>
          {hero.months.map((m) => {
            const cls = Math.min(6, Math.floor((sorted.indexOf(m.value) / 11) * 7));
            return (
              <div
                key={m.label}
                style={{
                  flex: 1,
                  height: `${(m.value / max) * 100}%`,
                  background: RAMP[cls],
                  borderRadius: "0 0 8px 8px",
                  border: "2px solid rgba(28,42,49,0.4)",
                  borderTop: "none",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 72,
            fontFamily: font ? "Bitter" : "serif",
            fontWeight: 700,
            color: "#1c2a31",
            letterSpacing: "-0.01em",
          }}
        >
          Aguacero
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#4a5a61", marginTop: 12 }}>
          Colombian climate data, computed in your browser.
        </div>
      </div>
    ),
    { ...size, ...(font ? { fonts: [{ name: "Bitter", data: font, weight: 700 }] } : {}) },
  );
}
