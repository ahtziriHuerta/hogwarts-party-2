import { test, expect } from "@playwright/test";
import { expectOnScreen } from "./helpers";

async function delayConnection(page) {
  let blocked = true;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.clock.install();
  await page.route("**/socket.io/**", async (route) => {
    if (blocked && route.request().method() === "GET") await gate;
    try {
      await route.continue();
    } catch (error) {
      if (
        !page.isClosed() &&
        !/Target|closed|cancel|already handled/i.test(error.message)
      )
        throw error;
    }
  });
  await page.goto("/");
  await page.evaluate(async () => {
    window.outgoingRoomEvents = [];
    const { socket } = await import("/src/socket.js");
    socket.onAnyOutgoing((event) => {
      if (event.includes("room")) window.outgoingRoomEvents.push(event);
    });
  });
  return () => {
    blocked = false;
    release();
  };
}

for (const size of [
  { width: 320, height: 568 },
  { width: 740, height: 280 },
]) {
  test(`arranque de 55 segundos: espera visible y una sola sala en ${size.width} × ${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    const release = await delayConnection(page);
    try {
      await page
        .getByRole("button", { name: "Jugar solo", exact: true })
        .click();
      await page.getByLabel("Tu nombre de jugador").fill("Luna");
      await page.getByRole("button", { name: "Preparar aventura" }).click();
      await page.clock.fastForward(55_000);
      await expect(page.locator(".room-error")).toHaveCount(0);
      await expect(page.locator(".connection-status")).toContainText(
        "Esperando al servidor",
      );
      await expect(
        page.getByRole("button", { name: "Conectando...", exact: true }),
      ).toBeDisabled();
      await expectOnScreen(page, [
        ".solo-form",
        ".connection-status",
        ".solo-form button",
      ]);
      release();
      await expect(page.locator(".solo-lobby")).toBeVisible({ timeout: 10000 });
      expect(await page.evaluate(() => window.outgoingRoomEvents)).toEqual([
        "create-solo-room",
      ]);
    } finally {
      release();
    }
  });
}

test("cancelar mientras despierta el servidor no crea una sala al conectar más tarde", async ({
  page,
}) => {
  const release = await delayConnection(page);
  try {
    await page.getByRole("button", { name: "Jugar solo", exact: true }).click();
    await page.getByLabel("Tu nombre de jugador").fill("Mia");
    await page.getByRole("button", { name: "Preparar aventura" }).click();
    await page.clock.fastForward(10_000);
    await page.getByRole("button", { name: "Cancelar" }).click();
    release();
    await expect(page.locator(".home-screen")).toBeVisible();
    await page.evaluate(async () => {
      const { socket } = await import("/src/socket.js");
      if (!socket.connected)
        await new Promise((resolve) => socket.once("connect", resolve));
    });
    expect(await page.evaluate(() => window.outgoingRoomEvents)).toEqual([]);
    await page.getByRole("button", { name: "Jugar solo", exact: true }).click();
    await page.getByLabel("Tu nombre de jugador").fill("Leo");
    await page.getByRole("button", { name: "Preparar aventura" }).click();
    await expect(page.locator(".solo-lobby")).toBeVisible();
    expect(await page.evaluate(() => window.outgoingRoomEvents)).toEqual([
      "create-solo-room",
    ]);
  } finally {
    release();
  }
});
