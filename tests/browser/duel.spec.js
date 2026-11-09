import { test, expect } from "@playwright/test";
import { expectOnScreen } from "./helpers";

test("dos jugadores: una respuesta, resultado compartido y vencimiento automático", async ({
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors = [];
  for (const page of [host, guest]) {
    await page.setViewportSize({ width: 844, height: 390 });
    page.on("pageerror", (error) => errors.push(error.message));
  }
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
  for (const [page, name] of [
    [host, /Luna Ravenclaw/],
    [guest, /Emma Hufflepuff/],
  ]) {
    await page.getByRole("button", { name: "Elegir personaje" }).click();
    await page.getByRole("button", { name }).click();
    await page
      .getByRole("button", { name: "Elegir personaje ✨", exact: true })
      .click();
  }
  await host.getByRole("button", { name: "Comenzar aventura" }).click();
  await host.getByRole("button", { name: "Lanzar dado" }).click();
  for (const page of [host, guest]) {
    await expect(
      page.getByRole("dialog", { name: "Reto relámpago" }),
    ).toBeVisible();
    await expect(page.locator(".challenge-option").first()).toBeEnabled();
    await expectOnScreen(page, [".challenge-modal", ".challenge-option"]);
  }
  await expect(guest.locator(".challenge-question")).toHaveText(
    await host.locator(".challenge-question").innerText(),
  );
  await host.locator(".challenge-option").first().click();
  await expect(host.locator(".challenge-footer")).toContainText(
    "Respuesta enviada",
  );
  await expect(guest.locator(".challenge-footer")).toContainText("1/2");
  for (const option of await host.locator(".challenge-option").all())
    await expect(option).toBeDisabled();
  await expect(guest.locator(".challenge-option").first()).toBeEnabled();
  await expect(host.locator(".challenge-correct-answer")).toHaveCount(0);
  await expect(guest.locator(".challenge-correct-answer")).toHaveCount(0);
  await guest.locator(".challenge-option").first().click();
  for (const page of [host, guest])
    await expect(
      page.getByRole("dialog", { name: "Resultados del reto" }),
    ).toBeVisible();
  const rewards = await host.locator(".result-earned").allTextContents();
  await expect(guest.locator(".result-earned")).toHaveText(rewards);
  await host.screenshot({ path: testInfo.outputPath("duel-results.png") });
  for (const page of [host, guest])
    await expect(page.locator(".challenge-modal")).toHaveCount(0, {
      timeout: 8000,
    });
  const scores = await host.locator(".player-stats > strong").allTextContents();
  expect(scores.map((text) => Number(text.match(/\d+/)[0]))).toEqual(
    rewards.map((text) => Number(text.match(/\d+/)[0])),
  );

  // El siguiente reto debe acabar aunque ambos abandonen la pregunta sin responder.
  await guest.getByRole("button", { name: "Lanzar dado" }).click();
  await expect(
    host.getByRole("dialog", { name: "Reto relámpago" }),
  ).toBeVisible();
  await expect(
    host.getByRole("dialog", { name: "Resultados del reto" }),
  ).toBeVisible({ timeout: 23000 });
  await expect(
    host.getByText("No respondió a tiempo", { exact: true }),
  ).toHaveCount(2);
  await expect(guest.locator(".result-earned")).toHaveText([
    "✕ +0 ⭐",
    "✕ +0 ⭐",
  ]);
  for (const page of [host, guest])
    await expect(page.locator(".challenge-modal")).toHaveCount(0, {
      timeout: 8000,
    });
  await expect(host.getByRole("button", { name: "Lanzar dado" })).toBeEnabled();
  expect(errors).toEqual([]);
});
