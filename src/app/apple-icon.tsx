import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon: the mark (four bars hanging from a rule) on fog. */
export default function AppleIcon() {
  const bars = [
    { x: 5, h: 7 },
    { x: 9.5, h: 15 },
    { x: 14, h: 10 },
    { x: 18.5, h: 5 },
  ];
  const s = 6.5; // 24-unit viewBox scaled into 156 px with a 12 px margin
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#e8eeea", position: "relative" }}>
        <div style={{ position: "absolute", left: 12 + 2 * s, top: 12 + 2 * s, width: 20 * s, height: 2 * s, background: "#1c2a31" }} />
        {bars.map((b) => (
          <div
            key={b.x}
            style={{
              position: "absolute",
              left: 12 + b.x * s,
              top: 12 + 4 * s,
              width: 2.6 * s,
              height: b.h * s,
              background: "#17607a",
              borderRadius: `0 0 ${1.3 * s}px ${1.3 * s}px`,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
