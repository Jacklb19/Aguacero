import { expect, test } from "@playwright/test";

test.describe("cross-origin isolation", () => {
  test("isolated on /explore and /lab, not on /", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(false);
    await page.goto("/explore");
    expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(true);
    await page.goto("/lab");
    expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(true);
  });

  test("entering /lab through the header link yields an isolated page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Lab" }).click();
    await page.waitForURL("**/lab");
    expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(true);
    await expect(page.getByTestId("isolation-status")).toHaveAttribute("data-isolated", "true");
  });

  test("runners return the same checksum at 100k rows", async ({ page }) => {
    await page.goto("/lab");
    await page.getByLabel("10k rows").uncheck();
    await page.getByLabel("1M rows").uncheck();
    await page.getByLabel("Runs per test").selectOption("3");
    await page.getByRole("button", { name: "Start benchmark" }).click();
    await expect(page.getByText(/Benchmark finished/)).toBeVisible({ timeout: 80_000 });
    await expect(page.getByText(/every runner returned the same checksum/)).toBeVisible();
  });
});
