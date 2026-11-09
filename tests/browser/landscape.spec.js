import { test, expect } from "@playwright/test";

const sizes = [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 740, height: 280 }, // Barra del navegador abierta: menos altura útil.
  { width: 844, height: 390 },
  { width: 932, height: 430 },
];

async function expectOnScreen(page, selectors) {
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

for (const size of sizes) {
  test(`partida y retos completos en ${size.width} × ${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/tests/fixtures/board.html");
    await expect(page.locator(".board-landscape")).toBeVisible();
    await expectOnScreen(page, [
      ".board-toolbar",
      ".board-player",
      ".board-landscape",
      ".board-controls",
      ".board-message",
      ".board-controls button",
    ]);
    for (const button of await page.locator(".board-controls button").all()) {
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Lanzar dado" }).click();
    await expect(page.getByRole("status")).toContainText(
      "El servidor no respondió",
    );
    await expectOnScreen(page, [".board-controls", ".board-message"]);
    await page.getByRole("button", { name: "Opciones" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reiniciar partida para ambos" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.goto("/tests/fixtures/board.html?scene=challenge");
    await expect(
      page.getByRole("dialog", { name: "Reto de Harry Potter" }),
    ).toBeVisible();
    await expectOnScreen(page, [
      ".challenge-modal",
      ".challenge-option",
      ".challenge-submit",
    ]);
    const modal = await page
      .locator(".challenge-modal")
      .evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(modal.scroll).toBeLessThanOrEqual(modal.client + 1);
    await page.getByRole("button", { name: "B Antioch Peverell" }).click();
    await expect(page.getByRole("button", { name: "Responder" })).toBeEnabled();

    await page.goto("/tests/fixtures/board.html?scene=winner");
    await expect(page.locator(".board-victory")).toBeVisible();
    await expectOnScreen(page, [".board-victory", ".board-landscape"]);
    await page.goto("/tests/fixtures/board.html?scene=edge");
    await expect(page.locator(".board-map")).toBeVisible();
    const clipped = await page.locator(".board-landscape").evaluate((stage) => {
      const bounds = stage.getBoundingClientRect();
      return [
        ...stage.querySelectorAll(".path-space small, .moving-player"),
      ].some((el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.left < bounds.left ||
          rect.right > bounds.right ||
          rect.top < bounds.top ||
          rect.bottom > bounds.bottom
        );
      });
    });
    expect(
      clipped,
      "Las fichas y los números deben caber dentro del tablero",
    ).toBe(false);
  });
}

test("ocho peinados distintos y selección persistente al iniciar una sala real", async ({
  context,
}, testInfo) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors = [];
  for (const page of [host, guest])
    page.on("pageerror", (error) => errors.push(error.message));
  await host.setViewportSize({ width: 844, height: 390 });
  await host.goto("/");
  await host.getByRole("button", { name: "Crear partida" }).click();
  await host.getByLabel("Tu nombre de jugador").fill("Luna");
  await host.getByRole("button", { name: "Crear sala" }).click();
  await expect(host.locator(".room-code-display h1")).toBeVisible();
  const code = await host.locator(".room-code-display h1").innerText();
  await guest.goto("/");
  await guest.getByRole("button", { name: "Unirse a partida" }).click();
  await guest.getByLabel("Tu nombre de jugador").fill("Emma");
  await guest.getByLabel("Código de sala").fill(code);
  await guest.getByRole("button", { name: "Unirse a sala" }).click();
  await host.getByRole("button", { name: "Elegir personaje" }).click();
  await expect(host.locator(".character-card")).toHaveCount(8);
  for (const size of sizes) {
    await host.setViewportSize(size);
    await expectOnScreen(host, [
      ".character-card",
      ".character-selection > .primary",
    ]);
  }
  await host.screenshot({ path: testInfo.outputPath("characters.png") });
  // Comparar geometría del cabello, no colores ni atributos que podrían ocultar un fallback.
  const hairstyles = await host
    .locator(".character-card svg")
    .evaluateAll((elements) =>
      elements.map((el) =>
        [...el.querySelectorAll("[data-hair]")]
          .map((group) => {
            const copy = group.cloneNode(true);
            copy.querySelectorAll("*").forEach((node) => {
              node.removeAttribute("fill");
              node.removeAttribute("stroke");
            });
            return copy.innerHTML;
          })
          .join(""),
      ),
    );
  expect(new Set(hairstyles).size).toBe(8);
  await host.getByRole("button", { name: /Luna Ravenclaw/ }).click();
  await host
    .getByRole("button", { name: "Elegir personaje ✨", exact: true })
    .click();
  await guest.getByRole("button", { name: "Elegir personaje" }).click();
  await guest.getByRole("button", { name: /Emma Hufflepuff/ }).click();
  await guest
    .getByRole("button", { name: "Elegir personaje ✨", exact: true })
    .click();
  await host.getByRole("button", { name: "Comenzar aventura" }).click();
  await expect(
    host.locator('.board-player svg[data-hairstyle="braids"]'),
  ).toBeVisible();
  await expect(
    host.locator('.board-player svg[data-hairstyle="ponytail"]'),
  ).toBeVisible();
  await host.getByRole("button", { name: "Opciones" }).click();
  await expect(host.getByRole("dialog")).toBeVisible();
  await host.getByRole("button", { name: "Cerrar", exact: true }).click();
  await host.getByRole("button", { name: "Lanzar dado" }).click();
  await expect(guest.locator(".dice-number")).toHaveText(
    await host.locator(".dice-number").innerText(),
  );
  expect(errors).toEqual([]);
});
