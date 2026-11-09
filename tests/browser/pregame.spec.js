import { test, expect } from "@playwright/test";
import { sizes, expectOnScreen } from "./helpers";

for (const size of sizes) {
  test(`inicio, formularios y sala completos en ${size.width} × ${size.height}`, async ({
    context,
  }, testInfo) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const host = await context.newPage();
    const guest = await context.newPage();
    await host.setViewportSize(size);
    await guest.setViewportSize(size);
    const errors = [];
    for (const page of [host, guest])
      page.on("pageerror", (error) => errors.push(error.message));

    await host.goto("/");
    await expect(
      host.getByRole("button", { name: "Crear partida" }),
    ).toBeVisible();
    await expectOnScreen(host, [
      ".home-intro",
      ".home-actions",
      ".home-screen .buttons button, .rules-button",
    ]);
    await host.screenshot({ path: testInfo.outputPath("home.png") });
    await host.getByRole("button", { name: "Cómo jugar", exact: true }).click();
    await expect(
      host.getByRole("dialog", { name: "Cómo jugar" }),
    ).toBeVisible();
    await expectOnScreen(host, [
      ".welcome-guide",
      ".welcome-guide li",
      ".welcome-guide button",
    ]);
    expect(
      await host
        .locator(".welcome-guide")
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
    await host.getByRole("button", { name: "Cerrar", exact: true }).click();

    await host.getByRole("button", { name: "Crear partida" }).click();
    await expectOnScreen(host, [
      ".room-form",
      ".room-form button",
      ".room-form label",
      ".room-form input",
    ]);
    await host.getByRole("button", { name: "Volver" }).click();
    await host.getByRole("button", { name: "Unirse a partida" }).click();
    await expectOnScreen(host, [
      ".room-form",
      ".room-form button",
      ".room-form label",
      ".room-form input",
    ]);
    await host.getByLabel("Tu nombre de jugador").fill("A".repeat(20));
    await host.getByLabel("Código de sala").fill("XXXXXX");
    await host.getByRole("button", { name: "Unirse a sala" }).click();
    await expect(host.getByRole("alert")).toContainText("La sala no existe");
    await expectOnScreen(host, [
      ".room-form input",
      ".room-form button",
      ".room-error",
    ]);
    await host.screenshot({ path: testInfo.outputPath("join-error.png") });

    await host.getByRole("button", { name: "Volver" }).click();
    await host.getByRole("button", { name: "Crear partida" }).click();
    await host.getByLabel("Tu nombre de jugador").fill("A".repeat(20));
    await host.getByRole("button", { name: "Crear sala" }).click();
    await expect(host.locator(".room-code-display h1")).toBeVisible();
    const code = await host.locator(".room-code-display h1").innerText();
    await expectOnScreen(host, [
      ".lobby-header",
      ".room-code-display",
      ".room-player",
      ".lobby-actions",
      ".room-lobby button",
    ]);
    await host.getByRole("button", { name: "Copiar código" }).click();
    await expect(host.locator(".copy-feedback")).toHaveText("¡Código copiado!");
    await expectOnScreen(host, [".copy-feedback", ".room-lobby button"]);
    // El permiso puede fallar en el celular: el mensaje alternativo también debe caber.
    await host.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Permiso denegado");
          },
        },
      }),
    );
    await host.getByRole("button", { name: "Copiar código" }).click();
    await expect(host.locator(".copy-feedback")).toContainText(
      "Selecciona el código",
    );
    await expectOnScreen(host, [
      ".copy-feedback",
      ".room-player",
      ".lobby-actions",
    ]);

    await guest.goto("/");
    await guest.getByRole("button", { name: "Unirse a partida" }).click();
    await guest.getByLabel("Tu nombre de jugador").fill("M".repeat(20));
    await guest.getByLabel("Código de sala").fill(code);
    await guest.getByRole("button", { name: "Unirse a sala" }).click();
    for (const page of [host, guest]) {
      await expect(page.locator(".room-player")).toHaveCount(2);
      await expectOnScreen(page, [
        ".room-code-display",
        ".room-player",
        ".lobby-actions",
        ".room-lobby button",
      ]);
    }
    for (const [page, name] of [
      [host, /Luna Ravenclaw/],
      [guest, /Emma Hufflepuff/],
    ]) {
      await page.getByRole("button", { name: "Elegir personaje" }).click();
      await expectOnScreen(page, [
        ".character-card",
        ".character-selection > .primary",
      ]);
      await page.getByRole("button", { name }).click();
      await page
        .getByRole("button", { name: "Elegir personaje ✨", exact: true })
        .click();
    }
    await expect(
      host.getByRole("button", { name: "Comenzar aventura" }),
    ).toBeVisible();
    for (const page of [host, guest]) {
      await expectOnScreen(page, [
        ".lobby-header",
        ".room-code-display",
        ".copy-feedback",
        ".room-player",
        ".lobby-actions",
        ".room-lobby button",
      ]);
    }
    await host.screenshot({ path: testInfo.outputPath("ready-lobby.png") });
    await host.getByRole("button", { name: "Comenzar aventura" }).click();
    await expect(host.locator(".board-landscape")).toBeVisible();
    await expectOnScreen(host, [".board-landscape", ".board-controls"]);
    expect(errors).toEqual([]);
  });
}
