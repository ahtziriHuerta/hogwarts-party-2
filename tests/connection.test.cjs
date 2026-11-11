const { test } = require("node:test");
const assert = require("node:assert/strict");

async function setup(connected = false) {
  const api = await import("../src/roomConnection.js");
  let now = 0,
    id = 0;
  const timers = new Map(),
    listeners = new Map();
  const sent = [],
    waiting = [],
    results = [];
  const clock = {
    schedule(fn, ms) {
      const key = ++id;
      timers.set(key, { at: now + ms, fn });
      return key;
    },
    cancel(key) {
      timers.delete(key);
    },
  };
  const socket = {
    connected,
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
    },
    off(event, fn) {
      listeners.get(event)?.delete(fn);
    },
    connect() {},
    timeout(ms) {
      assert.equal(ms, 15_000);
      return this;
    },
    emit(event, payload, ack) {
      sent.push({ event, payload, ack });
    },
  };
  function trigger(event) {
    if (event === "connect") socket.connected = true;
    for (const fn of [...(listeners.get(event) ?? [])]) fn();
  }
  function advance(ms) {
    const target = now + ms;
    while (true) {
      const next = [...timers]
        .filter(([, t]) => t.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
    }
    now = target;
  }
  return {
    ...api,
    socket,
    timers,
    listeners,
    sent,
    waiting,
    results,
    trigger,
    advance,
    begin(
      event = "create-solo-room",
      payload = { nickname: "Luna", difficulty: "expert" },
    ) {
      return api.requestRoom(
        socket,
        event,
        payload,
        {
          onWaiting: (message) => waiting.push(message),
          onResult: (result) => results.push(result),
        },
        clock,
      );
    },
    listenerCount: () =>
      [...listeners.values()].reduce((count, values) => count + values.size, 0),
  };
}

test("conexión: errores iniciales y 65 segundos de arranque no cancelan ni duplican la sala", async () => {
  const s = await setup();
  s.begin();
  for (let i = 0; i < 3; i++) {
    s.trigger("connect_error");
    s.advance(20_000);
  }
  assert.equal(s.results.length, 0);
  assert.equal(s.sent.length, 0);
  assert.equal(s.waiting.at(-1), s.WAIT_MESSAGE);
  s.advance(5000);
  s.trigger("connect");
  s.trigger("connect");
  assert.equal(s.sent.length, 1);
  assert.equal(s.sent[0].event, "create-solo-room");
  assert.deepEqual(s.sent[0].payload, {
    nickname: "Luna",
    difficulty: "expert",
  });
  s.sent[0].ack(null, { ok: true, room: { mode: "solo" } });
  s.advance(100_000);
  assert.equal(s.results.length, 1);
  assert.equal(s.results[0].ok, true);
  assert.equal(s.listenerCount(), 0);
  assert.equal(s.timers.size, 0);
});

test("conexión: aviso tras ocho segundos y límite de 90 sin crear salas tardías", async () => {
  const s = await setup();
  s.begin();
  s.advance(7999);
  assert.deepEqual(s.waiting, []);
  s.advance(1);
  assert.deepEqual(s.waiting, [s.WAIT_MESSAGE]);
  s.advance(81_999);
  assert.equal(s.results.length, 0);
  s.advance(1);
  assert.equal(s.results.length, 1);
  assert.equal(s.results[0].ok, false);
  assert.match(s.results[0].error, /90 segundos/);
  s.trigger("connect");
  assert.equal(s.sent.length, 0);
  assert.equal(s.listenerCount(), 0);
  assert.equal(s.timers.size, 0);
});

test("conexión: cancelar elimina escuchas y permite un nuevo intento independiente", async () => {
  const s = await setup();
  const cancel = s.begin();
  s.advance(8000);
  cancel();
  s.trigger("connect_error");
  s.trigger("connect");
  s.advance(100_000);
  assert.equal(s.sent.length, 0);
  assert.equal(s.results.length, 0);
  assert.equal(s.listenerCount(), 0);
  s.begin("create-room", { nickname: "Leo" });
  assert.equal(s.sent.length, 1);
  s.sent[0].ack(null, { ok: true });
  assert.deepEqual(s.results, [{ ok: true }]);
});

test("conexión: cancelar después de enviar ignora un acuse tardío", async () => {
  const s = await setup(true);
  const cancel = s.begin();
  assert.equal(s.sent.length, 1);
  cancel();
  s.sent[0].ack(null, { ok: true, room: {} });
  assert.equal(s.results.length, 0);
  assert.equal(s.timers.size, 0);
});

test("conexión: errores del servidor y de acuse terminan el intento una sola vez", async () => {
  for (const timeout of [false, true]) {
    const s = await setup(true);
    s.begin();
    s.sent[0].ack(
      timeout ? new Error("timeout") : null,
      timeout ? undefined : { ok: false, error: "La sala no existe." },
    );
    s.sent[0].ack(null, { ok: true });
    assert.equal(s.results.length, 1);
    assert.equal(s.results[0].ok, false);
    assert.match(s.results[0].error, timeout ? /no respondió/ : /no existe/);
    assert.equal(s.listenerCount(), 0);
  }
});

test("conexión: crear, unirse e individual esperan conexión y mantienen su propio payload", async () => {
  for (const [event, payload] of [
    ["create-room", { nickname: "Leo" }],
    ["join-room", { nickname: "Luna", code: "ABCDEF" }],
    ["create-solo-room", { nickname: "Mia", difficulty: "apprentice" }],
  ]) {
    const s = await setup();
    s.begin(event, payload);
    assert.equal(s.sent.length, 0);
    s.trigger("connect");
    assert.equal(s.sent[0].event, event);
    assert.deepEqual(s.sent[0].payload, payload);
    s.sent[0].ack(null, { ok: true });
    assert.equal(s.results.length, 1);
  }
});
