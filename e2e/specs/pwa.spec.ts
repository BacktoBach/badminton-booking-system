import { expect, test } from "@playwright/test";

test("PWA loads its app shell offline without caching authenticated API responses", async ({
  page,
}) => {
  await page.goto("/classes");
  await expect(
    page.getByRole("heading", { name: /Tìm lớp cầu lông/ }),
  ).toBeVisible();

  const manifestPath = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestPath).toBe("/manifest.webmanifest");
  const manifestResponse = await page.request.get(manifestPath!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    start_url: "/classes",
    display: "standalone",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
    ]),
  );

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration?.active?.scriptURL.endsWith("/sw.js") ?? false;
      }),
    )
    .toBe(true);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Tìm lớp cầu lông/ }),
  ).toBeVisible();
  const cachedPaths = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys())
        paths.push(new URL(request.url).pathname);
    }
    return paths;
  });
  expect(cachedPaths).toContain("/index.html");
  expect(cachedPaths.some((path) => path.startsWith("/api/"))).toBe(false);

  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Tìm lớp cầu lông/ }),
  ).toBeVisible();
});
