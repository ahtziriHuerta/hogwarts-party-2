import { expect } from "@playwright/test";

export const sizes = [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 740, height: 280 }, // Barra del navegador abierta: menos altura útil.
  { width: 844, height: 390 },
  { width: 932, height: 430 },
];

export async function expectOnScreen(page, selectors) {
  expect(
    await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > innerWidth,
      vertical: document.documentElement.scrollHeight > innerHeight,
    })),
  ).toEqual({ horizontal: false, vertical: false });
  for (const selector of selectors) {
    const elements = page.locator(selector);
    for (const element of await elements.all()) {
      const rect = await element.boundingBox();
      const { width, height } = page.viewportSize();
      expect(rect, selector).toBeTruthy();
      expect(rect.x, selector).toBeGreaterThanOrEqual(0);
      expect(rect.y, selector).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width, selector).toBeLessThanOrEqual(width + 1);
      expect(rect.y + rect.height, selector).toBeLessThanOrEqual(height + 1);
    }
  }
}
