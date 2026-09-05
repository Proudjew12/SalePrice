import { expect, test } from "./fixtures";

test("offers one unpriced Acronis example license that can be added to an order", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Acronis", exact: true }).click();
  const catalog = page.getByRole("region", { name: "Licenses", exact: true });
  await expect(catalog.getByRole("article")).toHaveCount(1);
  await expect(catalog.getByText("Price not set", { exact: true })).toBeVisible();
  await catalog.getByRole("button", { name: "Add Example license to quote", exact: true }).click();
  const line = page.getByRole("group", { name: "Example license", exact: true });
  await expect(line.getByText("Acronis", { exact: true })).toBeVisible();
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("");
});

test("adds the example once to an older saved catalog without restoring other defaults", async ({ page }) => {
  await page.goto("/");
  const original = {
    id: "custom-tools", name: "My tools", shortName: "MT",
    licenses: [{ id: "custom-seat", name: "My seat", prices: { monthly: "4", "annual-monthly": "3", "annual-upfront": "30" } }],
  };
  await page.evaluate((product) => {
    localStorage.setItem("saleprice.catalog.v2", JSON.stringify({ version: 2, products: [product] }));
  }, original);
  await page.reload();
  await expect(page.getByRole("button", { name: "Microsoft 365", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Acronis", exact: true })).toHaveCount(1);
  const stored: unknown = await page.evaluate(() => JSON.parse(localStorage.getItem("saleprice.catalog.v2") ?? "null") as unknown);
  expect(stored).toMatchObject({ products: [original, { name: "Acronis" }] });
  await page.reload();
  await expect(page.getByRole("button", { name: "Acronis", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Acronis", exact: true }).click();
  await page.getByRole("button", { name: "Normal Mode", exact: true }).click();
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("dialog").getByRole("button", { name: "Delete product", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Acronis", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "My tools", exact: true })).toBeVisible();
});

for (const version of [1, 2]) {
  test(`preserves an existing Acronis product in a version ${version} catalog`, async ({ page }) => {
    await page.goto("/");
    await page.evaluate((version) => {
      localStorage.removeItem("saleprice.catalog.v2");
      localStorage.setItem(`saleprice.catalog.v${version}`, JSON.stringify({
        version,
        products: [{ id: "custom-acronis", name: "Acronis", shortName: "ACR", licenses: [{ id: "custom-plan", name: "My Acronis plan" }] }],
        ...(version === 1 ? { licenses: [] } : {}),
      }));
    }, version);
    await page.reload();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Acronis", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Acronis", exact: true }).click();
    await expect(page.getByRole("button", { name: "Add My Acronis plan to quote", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Example license to quote", exact: true })).toHaveCount(0);
  });
}
