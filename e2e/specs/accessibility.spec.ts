import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { emptyAuthState } from "../support/auth-state";

test.use({ storageState: emptyAuthState });

test("class discovery has no WCAG A/AA accessibility violations", async ({
  page,
}) => {
  await page.goto("/classes");
  await expect(
    page.getByRole("heading", { name: /Tìm lớp cầu lông/ }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
