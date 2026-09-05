import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const displayKey = "saleprice.display.v1";

async function fontSize(element: Locator): Promise<number> {
  return element.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("resizes readable text without losing quote edits and remembers the selection", async ({ page }) => {
  await page.goto("/");
  const textSize = page.getByRole("combobox", { name: "Text size", exact: true });
  const heading = page.getByRole("heading", { name: "Microsoft 365", exact: true });
  const customer = page.getByLabel("Customer", { exact: true });
  await expect(textSize).toHaveValue("100");
  await expect(page.getByText("Text size", { exact: true })).toBeHidden();
  await expect(textSize.locator("option")).toHaveText(["50%", "60%", "70%", "80%", "90%", "100%", "110%", "120%", "130%", "140%", "150%"]);
  const initialHeadingSize = await fontSize(heading);
  const initialInputSize = await fontSize(customer);
  await customer.fill("Display settings customer");
  await page.getByLabel("Quote reference", { exact: true }).fill("DISPLAY-001");
  await page.getByRole("button", { name: "Add Business Standard to quote", exact: true }).click();
  const line = page.getByRole("group", { name: "Business Standard", exact: true });
  await line.getByLabel("Quantity", { exact: true }).fill("3");
  await line.getByRole("textbox", { name: /^Unit price/ }).fill("12.50");

  for (const size of [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]) {
    await textSize.selectOption(String(size));
    await expect(textSize).toHaveValue(String(size));
    await expect.poll(async () => (await fontSize(heading)) / initialHeadingSize).toBeCloseTo(size / 100, 2);
    await expect.poll(async () => (await fontSize(customer)) / initialInputSize).toBeCloseTo(size / 100, 2);
    await expectNoHorizontalOverflow(page);
    await expect(customer).toHaveValue("Display settings customer");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$37.50");
    await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeEnabled();
  }

  await page.reload();
  await expect(textSize).toHaveValue("150");
  await expect.poll(async () => (await fontSize(heading)) / initialHeadingSize).toBeCloseTo(1.5, 2);
  await expect(customer).toHaveValue("Display settings customer");
  await expect(page.getByLabel("Quote reference", { exact: true })).toHaveValue("DISPLAY-001");
  await expect(line.getByLabel("Quantity", { exact: true })).toHaveValue("3");
  await expect(line.getByRole("textbox", { name: /^Unit price/ })).toHaveValue("12.50");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$37.50");
  await expectNoHorizontalOverflow(page);
});

test("keeps New Order confirmation usable at the largest text size", async ({ page }) => {
  await page.goto("/");
  const textSize = page.getByRole("combobox", { name: "Text size", exact: true });
  await textSize.selectOption("150");
  await page.getByLabel("Customer", { exact: true }).fill("Keep until confirmed");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).click();
  const newOrder = page.getByRole("button", { name: "New Order", exact: true });
  await expect(newOrder).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await newOrder.click();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Keep until confirmed");
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await newOrder.click();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("");
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  await expect(textSize).toHaveValue("150");
  await expectNoHorizontalOverflow(page);
  await page.reload();
  await expect(textSize).toHaveValue("150");
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
});

for (const preference of [
  { name: "malformed JSON", value: "{invalid" },
  { name: "unsupported text size", value: JSON.stringify({ textSize: 155 }) },
  { name: "invalid preference type", value: JSON.stringify({ textSize: "110" }) },
  { name: "missing preference object", value: "null" },
]) {
  test(`uses the default size after ${preference.name} and still allows resizing`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: displayKey, value: preference.value,
    });
    await page.goto("/");
    const textSize = page.getByRole("combobox", { name: "Text size", exact: true });
    const heading = page.getByRole("heading", { name: "Microsoft 365", exact: true });
    await expect(textSize).toHaveValue("100");
    const initialSize = await fontSize(heading);
    await textSize.selectOption("110");
    await expect.poll(async () => (await fontSize(heading)) / initialSize).toBeCloseTo(1.1, 2);
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).click();
    await expect(page.getByTestId("quote-line")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });
}

test("allows resizing and quoting when browser storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); };
  });
  await page.goto("/");
  const textSize = page.getByRole("combobox", { name: "Text size", exact: true });
  const heading = page.getByRole("heading", { name: "Microsoft 365", exact: true });
  await expect(textSize).toHaveValue("100");
  const initialSize = await fontSize(heading);
  await textSize.selectOption("150");
  await expect(textSize).toHaveValue("150");
  await expect.poll(async () => (await fontSize(heading)) / initialSize).toBeCloseTo(1.5, 2);
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).click();
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByLabel("Quantity", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: /^Unit price/ }).fill("15");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$30.00");
  await expectNoHorizontalOverflow(page);
});
