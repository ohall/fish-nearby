import { expect, test } from "@playwright/test";

test("explores database waters on a mobile map", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".mapState")).toHaveClass(/mapState-ready/, {
    timeout: 20_000,
  });
  await expect(page.locator(".waterRailHeading strong")).toHaveText(
    /\d+ waters? in view/,
  );
  await expect(page.locator(".maplibregl-ctrl-attrib")).toContainText(
    "OpenFreeMap",
  );
  await expect(page.getByRole("img", { name: "Fish Nearby" })).toBeVisible();
  await expect(page.getByRole("application")).toHaveAccessibleName(
    /interactive map of fishing waters/i,
  );
  await expect(page.getByRole("searchbox")).toBeVisible();

  await page.getByRole("searchbox").fill("Hopatcong");
  await page.getByRole("searchbox").press("Enter");
  await expect(
    page.getByRole("button", { name: /Lake Hopatcong/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Ramapo Lake/i })).toHaveCount(
    0,
  );

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

test("updates the water rail when the map viewport changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await expect(page.locator(".mapState")).toHaveClass(/mapState-ready/, {
    timeout: 20_000,
  });

  const brand = page.getByRole("img", { name: "Fish Nearby" });
  await expect(brand).toBeVisible();
  const brandBounds = await brand.boundingBox();

  await expect(brand.locator("img")).toHaveCount(0);
  expect(brandBounds).not.toBeNull();
  expect(brandBounds?.width).toBeLessThan(250);
  expect(brandBounds?.height).toBeLessThan(100);

  const cards = page.locator(".waterRail .waterCard");
  const initialCount = await cards.count();
  expect(initialCount).toBeGreaterThan(1);

  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();

  await expect.poll(() => cards.count()).toBeLessThan(initialCount);
  await expect(page.locator(".waterRailHeading strong")).toHaveText(
    `${await cards.count()} waters in view`,
  );
});
