import { expect, test } from "@playwright/test";

test("explores database waters on a mobile map", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".mapState")).toHaveClass(/mapState-ready/, {
    timeout: 20_000,
  });
  await expect(page.locator(".maplibregl-ctrl-attrib")).toContainText(
    "OpenFreeMap",
  );
  await expect(page.getByRole("img", { name: "Fish Nearby" })).toBeVisible();
  await expect(page.getByRole("application")).toHaveAccessibleName(
    /interactive map of fishing waters/i,
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
    page.getByText(/accepted NJDEP records loaded from the local database/i),
  ).toBeVisible();
  await expect(page.getByText("Walleye")).toBeVisible();

  await page.getByRole("button", { name: "Close water details" }).click();
  await expect(
    page.getByRole("heading", { name: "Lake Hopatcong" }),
  ).toHaveCount(0);
});
