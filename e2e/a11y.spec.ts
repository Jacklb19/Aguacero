import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const paths = ["/", "/methodology", "/dictionary/precipitation", "/datasets", "/my-dashboard", "/explore", "/lab", "/results", "/styleguide"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accessibility, ${scheme} theme`, () => {
    test.use({ colorScheme: scheme });
    for (const path of paths) {
      test(`${path} has no serious or critical violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
        const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      });
    }
  });
}

test("headings and labels are never uppercased", async ({ page }) => {
  await page.goto("/");
  const upper = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,label,legend,nav a")].filter(
      (el) => getComputedStyle(el).textTransform === "uppercase",
    ).length,
  );
  expect(upper).toBe(0);
});

test("home hero respects reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const name = await page.locator(".hyeto-bar").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe("none");
  await context.close();
});
