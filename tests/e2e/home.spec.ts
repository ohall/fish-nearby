import { expect, test } from "@playwright/test";

test("explores preview waters on a mobile map", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Loading map…")).toBeHidden();
  await expect(page.getByRole("img", { name: "Fish Nearby" })).toBeVisible();
  await expect(page.getByRole("application")).toHaveAccessibleName(
    /interactive map of preview fishing waters/i,
  );
  await expect(page.getByRole("searchbox")).toBeVisible();

  await page.getByRole("searchbox").fill("Hopatcong");
  await expect(
    page.getByRole("button", { name: /Lake Hopatcong/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Ramapo Lake/i })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: /Lake Hopatcong/i }).click();
  await expect(
    page.getByRole("heading", { name: "Lake Hopatcong" }),
  ).toBeVisible();
  await expect(
    page.getByText(/fixture content and are not yet verified/i),
  ).toBeVisible();
  await expect(page.getByText("Hybrid striped bass")).toBeVisible();

  await page.getByRole("button", { name: "Close water details" }).click();
  await expect(
    page.getByRole("heading", { name: "Lake Hopatcong" }),
  ).toHaveCount(0);
});
