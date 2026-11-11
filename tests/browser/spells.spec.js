import { test, expect } from "@playwright/test";
import { sizes, portraitSizes, expectOnScreen } from "./helpers";
import fs from "node:fs";
const questions = JSON.parse(
  fs.readFileSync(
    new URL("../../server/questions.json", import.meta.url),
    "utf8",
  ),
);

for (const size of [
  portraitSizes[0],
  portraitSizes[3],
  sizes[0],
  sizes[2],
  sizes[4],
]) {
  test(`tienda e inventario sin desplazamiento en ${size.width} × ${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    for (const query of ["scene=start", "scene=edge&spells"]) {
      await page.goto(`/tests/fixtures/board.html?${query}`);
      await page.getByRole("button", { name: /Tienda/ }).click();
      await expect(
        page.getByRole("dialog", { name: "Tienda mágica" }),
      ).toBeVisible();
      await expectOnScreen(page, [
        ".spell-shop-modal",
        ".spell-shop-card",
        ".spell-shop-card button",
        ".spell-shop-feedback",
      ]);
      expect(
        await page
          .locator(".spell-shop-modal")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true);
      for (const button of await page.locator(".spell-shop-modal button").all())
        expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
      for (const button of await page
        .locator(".spell-shop-card:not(.shop-trophy-card) button")
        .all())
        await expect(button).toBeDisabled(); // Sin saldo o inventario lleno.
      await page.screenshot({
        path: testInfo.outputPath(
          `shop-${query.includes("spells") ? "full" : "empty"}.png`,
        ),
      });
      await page.getByRole("button", { name: "Cerrar tienda" }).click();
      await expect(page.locator(".spell-shop-modal")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Tienda/ })).toBeFocused();
    }
    for (const scene of ["challenge", "boolean", "solo", "memory-question"]) {
      await page.goto(`/tests/fixtures/board.html?scene=${scene}&spells`);
      await expect(
        page.getByRole("button", { name: /Usar pista/ }),
      ).toBeVisible();
      await expectOnScreen(page, [
        ".challenge-modal",
        ".challenge-option",
        ".challenge-spells",
      ]);
      expect(
        await page
          .locator(".challenge-modal")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        scene,
      ).toBe(true);
      await expect(
        page.getByRole("region", { name: "Tus hechizos" }),
      ).toBeVisible();
      const spellBounds = await page.locator(".challenge-spells").boundingBox();
      const answerBounds = await page
        .locator(".challenge-options")
        .boundingBox();
      expect(spellBounds.y + spellBounds.height).toBeLessThanOrEqual(
        answerBounds.y + 1,
      );
      await page.screenshot({
        path: testInfo.outputPath(`spells-${scene}.png`),
      });
      for (const button of await page
        .locator(".challenge-spell-buttons button")
        .all())
        expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
      if (scene === "boolean")
        await expect(
          page.getByRole("button", { name: /Usar pista/ }),
        ).toBeDisabled();
      if (["solo", "memory-question"].includes(scene))
        await expect(
          page.getByRole("button", { name: /Usar escudo/ }),
        ).toBeDisabled();
    }
    await page.goto("/tests/fixtures/media.html?spells");
    await page.getByRole("button", { name: "Probar reto visual" }).click();
    await expect(
      page.getByRole("button", { name: /Usar pista/ }),
    ).toBeVisible();
    await expectOnScreen(page, [
      ".challenge-modal",
      ".challenge-media",
      ".challenge-option",
      ".challenge-spells",
    ]);
    expect(
      await page
        .locator(".challenge-modal")
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
    const help = page.locator(".challenge-spells");
    expect((await help.boundingBox()).y).toBeLessThan(
      (await page.locator(".challenge-options").boundingBox()).y,
    );
    await page.locator(".challenge-option").first().click();
    await expect(help).toContainText("Respuesta enviada");
    await expect(
      page.getByRole("button", { name: /Usar pista/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /Usar escudo/ }),
    ).toBeDisabled();
    await expectOnScreen(page, [
      ".challenge-modal",
      ".challenge-spells",
      ".challenge-spell-buttons button",
    ]);
  });
}

async function answerByTruth(page, correct) {
  const question = await page.locator(".challenge-question").innerText();
  const source = questions.find((entry) => entry.question === question);
  expect(source).toBeTruthy();
  const answer = source.options[source.answer];
  const options = page.locator(".challenge-option");
  for (const button of await options.all()) {
    const label = await button.locator("span:last-child").innerText();
    if ((label.trim() === answer) === correct && (await button.isEnabled())) {
      await button.click();
      return;
    }
  }
  throw new Error("No hay una respuesta disponible");
}

test("dos jugadores compran y usan hechizos: pista privada, escudo y saldo compartido", async ({
  context,
}) => {
  test.setTimeout(60_000);
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors = [];
  for (const page of [host, guest]) {
    await page.setViewportSize({ width: 412, height: 823 });
    page.on("pageerror", (error) => errors.push(error.message));
  }
  await host.goto("/");
  await host.getByRole("button", { name: "Crear partida" }).click();
  await host.getByLabel("Tu nombre de jugador").fill("Luna");
  await host.getByRole("button", { name: "Crear sala" }).click();
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
  await answerByTruth(host, true);
  await answerByTruth(guest, true);
  await expect(host.locator(".challenge-modal")).toHaveCount(0, {
    timeout: 8000,
  });
  const initial = (
    await host.locator(".player-stats > strong").allTextContents()
  ).map((text) => Number(text.match(/\d+/)[0]));
  for (const page of [host, guest]) {
    await page.getByRole("button", { name: /Tienda/ }).click();
    await page
      .getByRole("button", { name: "Comprar Escudo por 5 monedas" })
      .click();
    await expect(page.locator(".spell-shop-feedback")).toHaveText(
      "Escudo guardado: pulsa «Usar escudo» en un duelo, antes de responder.",
    );
    await page
      .getByRole("button", { name: "Comprar Pista por 10 monedas" })
      .click();
    await expect(page.locator(".spell-shop-feedback")).toHaveText(
      "Pista guardada: pulsa «Usar pista» en una pregunta de cuatro opciones.",
    );
    await expect(
      page.getByRole("button", { name: "Comprar Escudo por 5 monedas" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Cerrar tienda" }).click();
    await expect(
      page.getByRole("button", { name: "Tienda · 2/2" }),
    ).toBeVisible();
  }
  // La tienda abierta se cierra si el rival inicia el reto.
  await host.getByRole("button", { name: /Tienda/ }).click();
  await guest.getByRole("button", { name: "Lanzar dado" }).click();
  await expect(host.locator(".spell-shop-modal")).toHaveCount(0);
  await host.getByRole("button", { name: "Usar escudo", exact: true }).click();
  await expect(host.locator(".challenge-spells")).toContainText(
    "Escudo activo",
  );
  await expect(guest.locator(".challenge-option:enabled")).toHaveCount(4);
  await guest.getByRole("button", { name: "Usar pista", exact: true }).click();
  await expect(guest.locator(".challenge-option.eliminated")).toHaveCount(2);
  await expect(host.locator(".challenge-option.eliminated")).toHaveCount(0);
  await expect(guest.locator(".challenge-option:enabled")).toHaveCount(2);
  // Girar conserva la pista y no permite activar el otro hechizo.
  await guest.setViewportSize({ width: 740, height: 280 });
  await expect(guest.locator(".challenge-option.eliminated")).toHaveCount(2);
  await expect(guest.getByRole("button", { name: "Usar escudo" })).toHaveCount(
    0,
  );
  await answerByTruth(host, false);
  await answerByTruth(guest, false);
  await expect(host.locator(".my-result")).toContainText(
    "Escudo · sin pérdida",
  );
  await expect(host.locator(".my-result .result-earned")).toHaveText("✕ 0 🪙");
  await expect(guest.locator(".my-result .result-earned")).toHaveText(
    `✕ −${Math.min(10, initial[1] - 15)} 🪙`,
  );
  await expect(guest.locator(".result-earned")).toHaveText(
    await host.locator(".result-earned").allTextContents(),
  );
  await expect(host.locator(".challenge-modal")).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(host.locator(".spell-shop-modal")).toHaveCount(0);
  const final = (
    await host.locator(".player-stats > strong").allTextContents()
  ).map((text) => Number(text.match(/\d+/)[0]));
  expect(final).toEqual([initial[0] - 15, Math.max(0, initial[1] - 25)]);
  await expect(
    host.getByRole("button", { name: "Tienda · 1/2" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("inventario visible en el tablero y explicación al observar o memorizar", async ({
  page,
}) => {
  for (const size of [
    portraitSizes[0],
    portraitSizes[3],
    sizes[0],
    sizes[2],
    sizes[4],
  ]) {
    await page.setViewportSize(size);
    await page.goto("/tests/fixtures/board.html?scene=edge&spells");
    await expect(page.locator(".board-inventory")).toContainText(
      "Escudo · Pista",
    );
    await expectOnScreen(page, [".board-controls", ".board-inventory"]);
    await expect(
      page.getByRole("button", { name: "Tienda · 2/2" }),
    ).toBeVisible();
    for (const scene of ["memory-preview", "memory-watch", "solo-watch"]) {
      await page.goto(`/tests/fixtures/board.html?scene=${scene}&spells`);
      await expect(page.locator(".challenge-footer")).toContainText(
        "guardados",
      );
      await expect(
        page.getByRole("button", { name: /Usar escudo|Usar pista/ }),
      ).toHaveCount(0);
      await expectOnScreen(page, [".challenge-modal", ".challenge-footer"]);
    }
  }
});
