import { test } from "@playwright/test";

// Design QA captures (README §5.14). Run: pnpm e2e --project=chromium screenshots
const pages = { home: "/", datasets: "/datasets", explorer: "/explore", lab: "/lab", results: "/results" };
const widths = [375, 768, 1280];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`screenshots ${scheme}`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });
    for (const [name, path] of Object.entries(pages)) {
      test(`${name}`, async ({ page }, info) => {
        test.skip(info.project.name !== "chromium");
        for (const w of widths) {
          await page.setViewportSize({ width: w, height: 900 });
          await page.goto(path);
          await page.waitForLoadState("networkidle");
          await page.screenshot({ path: `docs/screenshots/${name}-${w}-${scheme}.png`, fullPage: true });
        }
      });
    }
  });
}
