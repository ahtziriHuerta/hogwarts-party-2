import { test, expect } from "@playwright/test";
import fs from "node:fs";
const questions = JSON.parse(
  fs.readFileSync(
    new URL("../../server/questions.json", import.meta.url),
    "utf8",
  ),
);
import { expectOnScreen } from "./helpers";

test("dos jugadores: una respuesta, resultado compartido y vencimiento automático", async ({
  context,
}, testInfo) => {
  test.setTimeout(75_000);
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
      page.getByRole("dialog", { name: "Duelo contra rival" }),
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
    host.getByRole("dialog", { name: "Duelo contra rival" }),
  ).toBeVisible();
  await expect(
    host.getByRole("dialog", { name: "Resultados del reto" }),
  ).toBeVisible({ timeout: 23000 });
  await expect(host.getByText(/Tiempo agotado ·/)).toHaveCount(2);
  const previousBalances = scores.map((text) => Number(text.match(/\d+/)[0]));
  await expect(guest.locator(".result-earned")).toHaveText(
    previousBalances.map(
      (balance) => `✕ ${balance > 0 ? "−" + Math.min(10, balance) : "0"} 🪙`,
    ),
  );
  for (const page of [host, guest])
    await expect(page.locator(".challenge-modal")).toHaveCount(0, {
      timeout: 8000,
    });
  await expect(host.getByRole("button", { name: "Lanzar dado" })).toBeEnabled();
  // Con el dado de pruebas en 3, el siguiente salto del creador llega a la casilla 6: individual.
  const beforeSolo = await host
    .locator(".player-stats > strong")
    .allTextContents();
  await host.getByRole("button", { name: "Lanzar dado" }).click();
  await expect(
    host.getByRole("dialog", { name: "Reto individual" }),
  ).toBeVisible();
  await expect(
    guest.getByRole("dialog", { name: "Reto individual" }),
  ).toBeVisible();
  for (const option of await guest.locator(".challenge-option").all())
    await expect(option).toBeDisabled();
  await expect(guest.locator(".challenge-footer")).toContainText(
    "Solo responde Luna",
  );
  const text = await host.locator(".challenge-question").innerText();
  const source = questions.find((item) => item.question === text);
  expect(source).toBeTruthy();
  const correctText = source.options[source.answer];
  const texts = await host
    .locator(".challenge-option > span:last-child")
    .allTextContents();
  await host
    .locator(".challenge-option")
    .nth(texts.findIndex((option) => option.trim() !== correctText))
    .click();
  for (const page of [host, guest]) {
    await expect(
      page.getByRole("dialog", { name: "Resultados del reto" }),
    ).toBeVisible();
    await expect(page.locator(".challenge-result")).toHaveCount(1);
    await expect(page.locator(".result-earned")).toHaveText("✕ 0 🪙");
    await expect(page.locator(".challenge-result small")).toContainText(
      "sin pérdida",
    );
  }
  await host.screenshot({ path: testInfo.outputPath("solo-result.png") });
  for (const page of [host, guest])
    await expect(page.locator(".challenge-modal")).toHaveCount(0, {
      timeout: 8000,
    });
  await expect(host.locator(".player-stats > strong")).toHaveText(beforeSolo);
  expect(errors).toEqual([]);
});
