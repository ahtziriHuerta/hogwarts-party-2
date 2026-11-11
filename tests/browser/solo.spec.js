import { test, expect } from "@playwright/test";
import { sizes, portraitSizes, expectOnScreen } from "./helpers";
import fs from "node:fs";
const questions = JSON.parse(
  fs.readFileSync(
    new URL("../../server/questions.json", import.meta.url),
    "utf8",
  ),
);

async function prepare(page, difficulty = "wizard", nickname = "Ahtziri") {
  await page.goto("/");
  await page.getByRole("button", { name: "Jugar solo", exact: true }).click();
  await page.getByLabel("Tu nombre de jugador").fill(nickname);
  await page.getByLabel("Dificultad del rival").selectOption(difficulty);
  await page.getByRole("button", { name: "Preparar aventura" }).click();
  await expect(
    page.getByRole("heading", { name: "Aventura individual" }),
  ).toBeVisible();
}
async function choose(page) {
  await page.getByRole("button", { name: "Elegir personaje" }).click();
  await expect(page.locator(".character-card:enabled")).toHaveCount(8);
  await page.getByRole("button", { name: /Mia Gryffindor/ }).click();
  await page
    .getByRole("button", { name: "Elegir personaje ✨", exact: true })
    .click();
}
async function answer(page) {
  await expect(page.locator(".challenge-option").first()).toBeEnabled();
  const text = await page.locator(".challenge-question").innerText();
  const source = questions.find((entry) => entry.question === text);
  expect(source).toBeTruthy();
  const correct = source.options[source.answer];
  for (const option of await page.locator(".challenge-option").all())
    if (
      (await option.locator("span:last-child").innerText()).trim() === correct
    ) {
      await option.click();
      return;
    }
}

for (const [index, size] of [
  portraitSizes[0],
  portraitSizes[3],
  sizes[0],
  sizes[2],
  sizes[4],
].entries()) {
  test(`jugar solo: inicio, dificultad, personaje y tablero en ${size.width} × ${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expectOnScreen(page, [".home-screen", ".home-screen button:visible"]);
    await page.getByRole("button", { name: "Jugar solo", exact: true }).click();
    await expectOnScreen(page, [
      ".solo-form",
      ".solo-form button",
      ".solo-form label",
      ".solo-form input",
      ".solo-form select",
    ]);
    await expect(
      page.getByRole("button", { name: "Preparar aventura" }),
    ).toBeDisabled();
    await page.getByLabel("Tu nombre de jugador").fill("A".repeat(20));
    const level = ["apprentice", "wizard", "expert"][index % 3];
    await page.getByLabel("Dificultad del rival").selectOption(level);
    await page.screenshot({ path: testInfo.outputPath("solo-form.png") });
    await page.getByRole("button", { name: "Preparar aventura" }).click();
    await expect(page.locator(".solo-lobby")).toBeVisible();
    await expectOnScreen(page, [
      ".solo-lobby",
      ".lobby-header",
      ".room-code-display",
      ".room-player",
      ".lobby-actions",
    ]);
    await expect(
      page.getByRole("button", { name: "Copiar código" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Elegir personaje" }).click();
    await expectOnScreen(page, [
      ".character-selection",
      ".character-card",
      ".character-selection > .primary",
    ]);
    await expect(page.locator(".character-card:enabled")).toHaveCount(8);
    await page.getByRole("button", { name: /Mia Gryffindor/ }).click();
    await page
      .getByRole("button", { name: "Elegir personaje ✨", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Comenzar aventura" }),
    ).toBeVisible();
    await expectOnScreen(page, [".solo-lobby", ".lobby-buttons button"]);
    await page.screenshot({ path: testInfo.outputPath("solo-ready.png") });
    await page.getByRole("button", { name: "Comenzar aventura" }).click();
    await expect(page.locator(".board-player").nth(1)).toContainText("BOT");
    await expectOnScreen(page, [
      ".board-toolbar",
      ".board-player",
      ".board-landscape",
      ".board-controls",
    ]);
    await page.getByRole("button", { name: "Salir de la partida" }).click();
    await expect(
      page.getByRole("button", { name: "Jugar solo", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("rival real: responde sin otro navegador, tira el dado, permite tienda y respeta el reinicio", async ({
  page,
}) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 412, height: 823 });
  await prepare(page, "expert");
  await choose(page);
  await page.getByRole("button", { name: "Comenzar aventura" }).click();
  await page.getByRole("button", { name: "Lanzar dado" }).click();
  await expect(page.locator(".challenge-footer")).toContainText("1/2", {
    timeout: 5000,
  });
  await expect(page.locator(".challenge-correct-answer")).toHaveCount(0);
  await answer(page);
  await expect(page.locator(".challenge-results")).toBeVisible();
  await expect(page.locator(".challenge-result")).toHaveCount(2);
  await expect(page.locator(".challenge-modal")).toHaveCount(0, {
    timeout: 8000,
  });
  // El segundo lanzamiento corresponde al rival y se ejecuta sin un clic.
  await expect(page.locator(".challenge-modal")).toBeVisible({ timeout: 4000 });
  await answer(page);
  await expect(page.locator(".challenge-results")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.locator(".challenge-modal")).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(page.getByRole("button", { name: "Lanzar dado" })).toBeEnabled();
  await page.getByRole("button", { name: /Tienda/ }).click();
  await page
    .getByRole("button", { name: "Comprar Pista por 10 monedas" })
    .click();
  await expect(page.locator(".spell-shop-feedback")).toContainText(
    "Pista guardada",
  );
  await page.getByRole("button", { name: "Cerrar tienda" }).click();
  await page.getByRole("button", { name: "Lanzar dado" }).click(); // Individual visual.
  await expect(page.getByRole("button", { name: "Usar pista" })).toBeVisible();
  await expect(page.locator(".challenge-media img")).toBeVisible();
  await page.getByRole("button", { name: "Usar pista" }).click();
  await expect(page.locator(".challenge-option.eliminated")).toHaveCount(2);
  await page.setViewportSize({ width: 740, height: 280 });
  await expect(page.locator(".challenge-option.eliminated")).toHaveCount(2);
  await page.locator(".challenge-option:enabled").first().click();
  await expect(page.locator(".challenge-result")).toHaveCount(1);
  await expect(page.locator(".challenge-modal")).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(page.getByRole("button", { name: "Lanzar dado" })).toBeEnabled({
    timeout: 4000,
  }); // El bot recibe un bono y cede el turno.
  await page.getByRole("button", { name: "Opciones de la partida" }).click();
  await page
    .getByRole("button", { name: "Reiniciar partida para ambos" })
    .click();
  await expect(page.locator(".player-stats > strong")).toHaveText([
    "🪙 0 monedas",
    "🪙 0 monedas",
  ]);
  await expect(
    page.getByRole("button", { name: "Tienda · 0/2" }),
  ).toBeVisible();
  await expect(page.locator(".board-player").nth(1)).toContainText("BOT");
  await page.getByRole("button", { name: "Salir de la partida" }).click();
  await expect(page.locator(".home-screen")).toBeVisible();
});
