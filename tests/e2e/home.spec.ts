import { expect, test } from "@playwright/test";

test("renders the mobile launch screen", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Find fish evidence near you." }),
  ).toBeVisible();
  await expect(page.getByText(/North Jersey pilot/i)).toBeVisible();
});
