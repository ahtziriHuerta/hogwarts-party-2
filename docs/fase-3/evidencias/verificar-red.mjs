// Evidencia adicional: dos clientes reales, acuses y capturas. No modifica el juego.
// Iniciar previamente el servidor con el fixture de dados y Vite, como explica el README.
import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.join(root, "docs/fase-3/evidencias/red-adicional.json");
const assets = path.join(root, "docs/fase-3/assets");
const bank = JSON.parse(
  fs.readFileSync(path.join(root, "server/questions.json"), "utf8"),
);
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const context = await browser.newContext({
  baseURL: "http://127.0.0.1:5174",
  viewport: { width: 740, height: 280 },
  isMobile: true,
  hasTouch: true,
});
const a = await context.newPage(),
  b = await context.newPage();
const checks = [];
const errors = [];
for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
async function install(p) {
  await p.evaluate(async () => {
    const { socket } = await import("/src/socket.js");
    window.netProof = { acks: [], updates: [] };
    const original = socket.emit;
    socket.emit = function (event, ...args) {
      const last = args.length - 1;
      const cb = args[last];
      if (typeof cb === "function") {
        const start = performance.now(),
          wall = Date.now();
        args[last] = function (...values) {
          const response = values.length > 1 ? values[1] : values[0];
          window.netProof.acks.push({
            event,
            startUtcMs: wall,
            roundTripMs: performance.now() - start,
            ok: response?.ok ?? false,
            error: response?.error ?? null,
          });
          return cb(...values);
        };
      }
      return original.apply(this, [event, ...args]);
    };
    socket.on("room-updated", (room) =>
      window.netProof.updates.push({
        receivedUtcMs: Date.now(),
        room: JSON.parse(JSON.stringify(room)),
      }),
    );
  });
}
async function getRoom(p) {
  return p.evaluate(() => window.netProof.updates.at(-1)?.room);
}
async function direct(p, event, data) {
  return p.evaluate(
    async ({ event, data }) => {
      const { socket } = await import("/src/socket.js");
      return new Promise((resolve, reject) =>
        socket
          .timeout(5000)
          .emit(event, data, (error, result) =>
            error ? reject(error) : resolve(result),
          ),
      );
    },
    { event, data },
  );
}
async function answer(p, correct = true) {
  await expect(p.locator(".challenge-option").first()).toBeEnabled();
  const question = await p.locator(".challenge-question").innerText();
  const q = bank.find((item) => item.question === question);
  if (!q) throw new Error("Pregunta no identificada");
  const text = q.options[q.answer];
  for (const option of await p.locator(".challenge-option").all())
    if (
      ((await option.locator("span:last-child").innerText()).trim() ===
        text) ===
      correct
    ) {
      await option.click();
      return;
    }
}
try {
  await a.goto("/");
  await install(a);
  await a.getByRole("button", { name: "Crear partida" }).click();
  await a.getByLabel("Tu nombre de jugador").fill("Cliente A");
  await a.getByRole("button", { name: "Crear sala" }).click();
  const code = await a.locator(".room-code-display h1").innerText();
  await b.goto("/");
  await install(b);
  await b.getByRole("button", { name: "Unirse a partida" }).click();
  await b.getByLabel("Tu nombre de jugador").fill("Cliente B");
  await b.getByLabel("Código de sala").fill(code);
  await b.getByRole("button", { name: "Unirse a sala" }).click();
  await expect(b.locator(".room-player")).toHaveCount(2);
  checks.push({
    id: "C01",
    expected: "Dos clientes en la misma sala",
    passed: (await getRoom(a)).code === (await getRoom(b)).code,
  });
  for (const [p, name] of [
    [a, /Luna Ravenclaw/],
    [b, /Emma Hufflepuff/],
  ]) {
    await p.getByRole("button", { name: "Elegir personaje" }).click();
    await p.getByRole("button", { name }).click();
    await p
      .getByRole("button", { name: "Elegir personaje ✨", exact: true })
      .click();
  }
  await a.screenshot({ path: path.join(assets, "red-sala.png") });
  await a.getByRole("button", { name: "Comenzar aventura" }).click();
  await expect(a.locator(".board-landscape")).toBeVisible();
  const denied = await direct(b, "roll-dice", {});
  checks.push({
    id: "C02",
    expected: "Rechazar un lanzamiento fuera de turno",
    passed: denied.ok === false,
    error: denied.error,
  });
  await a.getByRole("button", { name: "Lanzar dado" }).click();
  await expect(
    b.getByRole("dialog", { name: "Duelo contra rival" }),
  ).toBeVisible();
  const firstA = await getRoom(a),
    firstB = await getRoom(b);
  const firstId = firstA.game.challenge.id;
  checks.push({
    id: "C03",
    expected: "Mismo dado, reto y opciones",
    passed:
      firstA.game.dice === 3 &&
      firstB.game.dice === 3 &&
      firstId === firstB.game.challenge.id &&
      JSON.stringify(firstA.game.challenge.options) ===
        JSON.stringify(firstB.game.challenge.options),
  });
  await answer(a);
  await expect(b.locator(".challenge-footer")).toContainText("1/2");
  const pending = await getRoom(b);
  checks.push({
    id: "C04",
    expected: "Ocultar respuestas hasta cerrar el reto",
    passed:
      pending.game.challenge.answeredPlayerIds.length === 1 &&
      !("answer" in pending.game.challenge) &&
      !("correctAnswer" in pending.game.challenge),
  });
  await a
    .locator(".challenge-modal")
    .screenshot({ path: path.join(assets, "red-pregunta-a.png") });
  await b
    .locator(".challenge-modal")
    .screenshot({ path: path.join(assets, "red-pregunta-b.png") });
  const duplicate = await direct(a, "answer-challenge", {
    challengeId: firstId,
    answer: 0,
  });
  checks.push({
    id: "C05",
    expected: "Rechazar otra respuesta del mismo jugador",
    passed: duplicate.ok === false,
    error: duplicate.error,
  });
  const invalid = await direct(b, "answer-challenge", {
    challengeId: firstId,
    answer: 99,
  });
  checks.push({
    id: "C06",
    expected: "Rechazar un índice de respuesta inválido",
    passed: invalid.ok === false,
    error: invalid.error,
  });
  await answer(b);
  await expect(a.locator(".challenge-results")).toBeVisible();
  await expect(b.locator(".challenge-results")).toBeVisible();
  const r1a = await getRoom(a),
    r1b = await getRoom(b);
  checks.push({
    id: "C07",
    expected: "Resultados y saldos coincidentes tras acertar ambos",
    passed:
      JSON.stringify(r1a.game.players.map((p) => p.points)) ===
        JSON.stringify(r1b.game.players.map((p) => p.points)) &&
      r1a.game.challenge.results.every((r) => r.correct),
    points: r1a.game.players.map((p) => p.points),
  });
  await expect(a.locator(".challenge-modal")).toHaveCount(0, { timeout: 8000 });
  await expect(b.getByRole("button", { name: "Lanzar dado" })).toBeEnabled();
  await b.getByRole("button", { name: "Lanzar dado" }).click();
  await answer(a);
  await answer(b, false);
  await expect(a.locator(".challenge-results")).toBeVisible();
  await expect(b.locator(".challenge-results")).toBeVisible();
  const r2a = await getRoom(a),
    r2b = await getRoom(b);
  const wrong = r2a.game.challenge.results.find(
    (r) => r.nickname === "Cliente B",
  );
  checks.push({
    id: "C08",
    expected: "Descontar diez monedas al rival con saldo suficiente",
    passed:
      wrong.penalty === 10 &&
      wrong.earned === -10 &&
      JSON.stringify(r2a.game.players.map((p) => p.points)) ===
        JSON.stringify(r2b.game.players.map((p) => p.points)),
    pointsBefore: r1a.game.players.map((p) => p.points),
    pointsAfter: r2a.game.players.map((p) => p.points),
    earned: r2a.game.challenge.results.map((r) => r.earned),
  });
  await a
    .locator(".challenge-modal")
    .screenshot({ path: path.join(assets, "red-resultados-a.png") });
  await b
    .locator(".challenge-modal")
    .screenshot({ path: path.join(assets, "red-resultados-b.png") });
  const proofA = await a.evaluate(() => window.netProof),
    proofB = await b.evaluate(() => window.netProof);
  const transportA = await a.evaluate(
    async () =>
      (await import("/src/socket.js")).socket.io.engine.transport.name,
  );
  const transportB = await b.evaluate(
    async () =>
      (await import("/src/socket.js")).socket.io.engine.transport.name,
  );
  const roll = proofA.acks.find((x) => x.event === "roll-dice" && x.ok);
  const uA = proofA.updates.find(
    (x) =>
      x.room.game?.challenge?.id === firstId &&
      x.room.game.challenge.answeredPlayerIds.length === 0,
  );
  const uB = proofB.updates.find(
    (x) =>
      x.room.game?.challenge?.id === firstId &&
      x.room.game.challenge.answeredPlayerIds.length === 0,
  );
  await b.close();
  await expect.poll(async () => (await getRoom(a)).status).toBe("waiting");
  const lost = await getRoom(a);
  checks.push({
    id: "C09",
    expected: "Al desconectar al rival se cancela la partida activa",
    passed: lost.players.length === 1 && lost.game === null,
  });
  const anonymize = (room) =>
    JSON.parse(
      JSON.stringify(room)
        .replaceAll(room.players[0]?.id ?? "__missing__", "cliente-A")
        .replaceAll(room.players[1]?.id ?? "__missing__", "cliente-B"),
    );
  const result = {
    executedAtUtc: new Date().toISOString(),
    timeZoneForReport: "America/Mexico_City",
    codeRevision: "da129ed32c9265e820b6f0656b31518fa81aa67d",
    gameRevision: "f5eabc233e2b17d74185c5899f99cf7c10ff5cc0",
    environment: {
      node: process.version,
      platform: process.platform,
      chromium: browser.version(),
      frontend: "http://127.0.0.1:5174",
      server: "http://localhost:3002",
      viewport: { width: 740, height: 280 },
      transports: [transportA, transportB],
      deterministicDiceFixture: true,
    },
    checks,
    acks: [
      ...proofA.acks.map((v) => ({ client: "A", ...v })),
      ...proofB.acks.map((v) => ({ client: "B", ...v })),
    ],
    singleBroadcast: {
      clientAFromSendMs: uA.receivedUtcMs - roll.startUtcMs,
      clientBFromSendMs: uB.receivedUtcMs - roll.startUtcMs,
      arrivalDifferenceMs: Math.abs(uA.receivedUtcMs - uB.receivedUtcMs),
    },
    snapshots: {
      firstChallenge: anonymize(firstA),
      pending: anonymize(pending),
      firstResults: anonymize(r1a),
      secondResults: anonymize(r2a),
    },
    pageErrors: errors,
    limitations:
      "Medición puntual sobre loopback; no mide Internet, capacidad concurrente ni latencia de usuarios físicos. IDs de cliente anonimizados.",
  };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  if (checks.some((c) => !c.passed) || errors.length)
    throw new Error("Alguna comprobación falló");
  console.log(
    JSON.stringify({
      checks: checks.length,
      passed: checks.filter((c) => c.passed).length,
      transports: [transportA, transportB],
      broadcast: result.singleBroadcast,
      points: checks.find((c) => c.id === "C08").pointsAfter,
    }),
  );
} finally {
  await context.close();
  await browser.close();
}
