import { test, expect } from "@playwright/test";
import { portraitSizes, expectOnScreen } from "./helpers";

for (const size of portraitSizes) {
  test(`tablero vertical completo y texto legible en ${size.width} × ${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    for (const scene of ["waiting", "start", "edge", "winner"]) {
      await page.goto(`/tests/fixtures/board.html?scene=${scene}`);
      await expect(page.locator(".path-space")).toHaveCount(36);
      await expect
        .poll(() =>
          page
            .locator(".path-space")
            .evaluateAll(
              (tiles) => new Set(tiles.map((tile) => tile.style.left)).size,
            ),
        )
        .toBe(9);
      await expectOnScreen(page, [
        ".board-toolbar",
        ".board-player",
        ".board-landscape",
        ".board-controls",
        ".board-message",
      ]);
      const text = await page
        .locator(".board-heading h2")
        .evaluate((el) => ({
          height: el.getBoundingClientRect().height,
          line: parseFloat(getComputedStyle(el).lineHeight),
          width: el.clientWidth,
          scroll: el.scrollWidth,
        }));
      expect(text.height).toBeLessThanOrEqual(text.line + 1);
      expect(text.scroll).toBeLessThanOrEqual(text.width + 1);
      expect(
        (await page.locator(".board-players").boundingBox()).height,
      ).toBeLessThanOrEqual(105);
      for (const button of await page
        .locator(".board-controls button:visible, .board-toolbar button")
        .all())
        expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
      const clipped = await page
        .locator(".board-landscape")
        .evaluate((stage) => {
          const b = stage.getBoundingClientRect();
          return [
            ...stage.querySelectorAll(".path-space small, .moving-player"),
          ].some((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.left < b.left ||
              r.top < b.top ||
              r.right > b.right ||
              r.bottom > b.bottom
            );
          });
        });
      expect(
        clipped,
        "Las fichas y números deben caber también en vertical",
      ).toBe(false);
      const overlap = await page.locator(".path-space").evaluateAll((tiles) => {
        const bounds = tiles.map((el) => el.getBoundingClientRect());
        return bounds.some((a, i) =>
          bounds
            .slice(i + 1)
            .some(
              (b) =>
                a.left < b.right &&
                a.right > b.left &&
                a.top < b.bottom &&
                a.bottom > b.top,
            ),
        );
      });
      expect(overlap).toBe(false);
      if (scene === "waiting")
        await page.screenshot({ path: testInfo.outputPath("portrait.png") });
      await page
        .getByRole("button", { name: "Opciones de la partida" })
        .click();
      await expectOnScreen(page, [".board-options", ".board-options button"]);
      await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    }
    for (const scene of [
      "challenge",
      "boolean",
      "results",
      "solo",
      "solo-watch",
      "memory-preview",
      "memory-question",
      "memory-results",
      "surprise",
    ]) {
      await page.goto(`/tests/fixtures/board.html?scene=${scene}`);
      await expect(page.locator(".challenge-modal")).toBeVisible();
      await expectOnScreen(page, [
        ".challenge-modal",
        ".challenge-footer",
        ".challenge-option",
      ]);
      expect(
        await page
          .locator(".challenge-modal")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        scene,
      ).toBe(true);
    }
  });
}
