import { test, expect } from "@playwright/test";
import { sizes, expectOnScreen } from "./helpers";

test("solo descarga el archivo activo y el reloj espera a una imagen lenta", async ({
  page,
}) => {
  const requested = [];
  let release;
  page.on("request", (req) => {
    if (req.url().includes("/quiz-media/")) requested.push(req.url());
  });
  await page.route("**/quiz-media/v01.svg", async (route) => {
    await new Promise((resolve) => (release = resolve));
    await route.continue();
  });
  await page.goto("/tests/fixtures/media.html");
  expect(requested).toHaveLength(0);
  await page.getByRole("button", { name: "Probar reto visual" }).click();
  await expect.poll(() => typeof release).toBe("function");
  await expect(page.locator(".challenge-option")).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveText("⏳");
  release();
  await expect(page.locator(".challenge-option").first()).toBeEnabled();
  expect(
    await page
      .locator(".challenge-media img")
      .evaluate((img) => img.naturalWidth),
  ).toBeGreaterThan(0);
  expect(requested).toHaveLength(1);
  expect(await page.evaluate(() => window.mediaEvents)).toEqual(["ready"]);
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectOnScreen(page, [
      ".challenge-modal",
      ".challenge-media",
      ".challenge-option",
      ".challenge-footer",
    ]);
    expect(
      await page
        .locator(".challenge-modal")
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
  }
  await page.locator(".challenge-option").first().click();
  await expect(page.locator(".challenge-option").first()).toBeDisabled();
});

test("las diez ilustraciones y sus textos caben en los cinco tamaños horizontales", async ({
  page,
}) => {
  for (let index = 0; index < 10; index++) {
    await page.goto(`/tests/fixtures/media.html?index=${index}`);
    await page.getByRole("button", { name: "Probar reto visual" }).click();
    await expect(page.locator(".challenge-option").first()).toBeEnabled();
    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectOnScreen(page, [
        ".challenge-modal",
        ".challenge-media",
        ".challenge-option",
        ".challenge-footer",
      ]);
      expect(
        await page
          .locator(".challenge-modal")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        `Ilustración ${index} en ${size.width}×${size.height}`,
      ).toBe(true);
    }
  }
});

for (const scene of ["video", "video2"]) {
  test(`clip real ${scene}: reproducción manual y pregunta después de terminar`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/tests/fixtures/media.html?scene=${scene}`);
    await page.getByRole("button", { name: "Probar reto visual" }).click();
    const play = page.getByRole("button", { name: "Ver clip" });
    await expect(play).toBeEnabled();
    expect(
      await page
        .locator("video")
        .evaluate((v) => v.paused && v.currentTime === 0),
    ).toBe(true);
    await expect(page.locator(".challenge-option")).toHaveCount(0);
    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectOnScreen(page, [
        ".challenge-modal",
        ".challenge-media",
        ".media-play",
        ".challenge-footer",
      ]);
      expect(
        await page
          .locator(".challenge-modal")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`${scene}.png`) });
    await play.click();
    await expect(page.locator(".challenge-option").first()).toBeEnabled({
      timeout: 9000,
    });
    await expect(page.locator("video")).toHaveCount(0);
    expect(await page.evaluate(() => window.mediaEvents)).toEqual([
      "ready",
      "viewed",
    ]);
    await expect(page.getByRole("timer")).toContainText(/(19|20) s/);
  });
}

test("archivo bloqueado: trivia de respaldo legible y sin esperar una descarga infinita", async ({
  page,
}) => {
  await page.route("**/quiz-media/**", (route) => route.abort());
  for (const scene of ["image", "video"]) {
    await page.goto(`/tests/fixtures/media.html?scene=${scene}`);
    await page.getByRole("button", { name: "Probar reto visual" }).click();
    await expect(page.locator(".challenge-notice")).toContainText(
      "Recurso no disponible",
    );
    await expect(page.locator(".challenge-option").first()).toBeEnabled();
    await expect(page.locator(".challenge-media")).toHaveCount(0);
    expect(await page.evaluate(() => window.mediaEvents)).toEqual(["failed"]);
    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectOnScreen(page, [
        ".challenge-modal",
        ".challenge-option",
        ".challenge-footer",
      ]);
      expect(
        await page
          .locator(".challenge-modal")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
    }
  }
});
