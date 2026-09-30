import { expect, test } from "@playwright/test";

test.describe("rendering patterns", () => {
  test("SSG home HTML contains the chart without JavaScript", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain("How much rain fell where you live?");
    expect(html).toContain("Monthly rainfall normals");
    expect(html).toContain('data-render-pattern="SSG"');
  });

  test("ISR catalog HTML contains real data", async ({ request }) => {
    const html = await (await request.get("/datasets")).text();
    expect(html).toContain("Precipitation");
    expect(html).toMatch(/[\d,]{7,} readings/);
    expect(html).toContain('data-render-pattern="ISR"');
  });

  test("SSR dashboard reads the region cookie", async ({ request }) => {
    const empty = await (await request.get("/my-dashboard")).text();
    expect(empty).toContain("No region chosen yet");
    const html = await (
      await request.get("/my-dashboard", { headers: { cookie: "ag_region=bogota" } })
    ).text();
    expect(html).toContain("My region: Bogotá");
    expect(html).toContain('data-render-pattern="SSR"');
  });

  test("CSR explorer HTML has no result table", async ({ request }) => {
    const html = await (await request.get("/explore")).text();
    expect(html).toContain('data-render-pattern="CSR"');
    expect(html).not.toContain('data-testid="result"');
  });

  test("ISR timestamp is stable within the window and changes after revalidation", async ({
    request,
  }) => {
    const stamp = async () => {
      const html = await (await request.get("/datasets")).text();
      return html.match(/Refreshed at <time dateTime="([^"]+)"/)?.[1];
    };
    const a = await stamp();
    const b = await stamp();
    expect(a).toBeTruthy();
    expect(b).toBe(a);
    const res = await request.post("/api/revalidate", {
      headers: { authorization: `Bearer ${process.env.REVALIDATE_SECRET ?? "e2e-secret"}` },
      data: { tag: "datasets" },
    });
    expect(res.ok()).toBe(true);
    await expect.poll(stamp, { timeout: 60_000, intervals: [2000] }).not.toBe(a);
  });
});
