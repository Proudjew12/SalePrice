import { expect, test as base } from "@playwright/test";

interface BrowserChecks {
  allowHealthRequestFailure: boolean;
  browserChecks: void;
}

export const test = base.extend<BrowserChecks>({
  allowHealthRequestFailure: [false, { option: true }],
  browserChecks: [
    async ({ page, allowHealthRequestFailure }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (!["error", "warning"].includes(message.type())) {
          return;
        }
        const isExpectedNetworkError =
          allowHealthRequestFailure &&
          message.location().url.endsWith("/api/health") &&
          message.text().startsWith("Failed to load resource:");
        if (!isExpectedNetworkError) {
          errors.push(message.text());
        }
      });

      await use();

      expect(errors, "Unexpected browser errors or warnings").toEqual([]);
      await expect(page.locator("vite-error-overlay")).toHaveCount(0);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
