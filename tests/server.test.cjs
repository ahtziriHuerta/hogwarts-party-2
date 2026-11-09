const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");

// Ejecutar los handlers reales con transportes simulados hace el dado determinista
// y evita abrir puertos durante las pruebas de reglas del juego.
function setup() {
  let connect;
  let dice = 4;
  const serverPath = path.join(__dirname, "../server/index.cjs");
  const realRequire = createRequire(serverPath);
  const context = vm.createContext({
    console: { log() {} },
    process: { env: {} },
    require(name) {
      if (name === "http") return { createServer: () => ({ listen() {} }) };
      if (name === "socket.io")
        return {
          Server: class {
            on(event, handler) {
              if (event === "connection") connect = handler;
            }
            to() {
              return { emit() {} };
            }
          },
        };
      if (name === "crypto")
        return {
          ...realRequire(name),
          randomInt: (min) => (min === 1 ? dice : 0),
        };
      return realRequire(name);
    },
  });
  vm.runInContext(fs.readFileSync(serverPath, "utf8"), context);
  function client(id) {
    const handlers = {};
    const socket = {
      id,
      data: {},
      on: (event, fn) => {
        handlers[event] = fn;
      },
      join() {},
    };
    connect(socket);
    return (event, data = {}) => {
      let response;
      handlers[event](data, (value) => {
        response = value;
      });
      return response;
    };
  }
  const host = client("host");
  const guest = client("guest");
  const created = host("create-room", { nickname: "Luna" });
  guest("join-room", { nickname: "Leo", code: created.room.code });
  host("select-character", { character: { id: 1, name: {} } });
  guest("select-character", { character: { id: 2 } });
  host("start-game");
  const room = vm.runInContext("rooms.values().next().value", context);
  return {
    host,
    guest,
    room,
    setDice: (value) => {
      dice = value;
    },
  };
}

test("el catálogo del servidor reemplaza campos manipulados del cliente", () => {
  const { room } = setup();
  assert.equal(room.players[0].character.name, "Leo");
  assert.equal(room.players[1].character.name, "Mia");
});

test("completar una vuelta y caer en reto conserva el bono incluso al fallar", () => {
  const { host, room } = setup();
  const player = room.game.players[0];
  Object.assign(player, { totalSteps: 23, position: 23, laps: 0, points: 0 });
  assert.equal(host("roll-dice").ok, true);
  assert.equal(player.position, 3);
  assert.equal(player.laps, 1);
  assert.equal(player.points, 20);
  const challenge = room.game.challenge;
  host("answer-challenge", {
    challengeId: challenge.id,
    answer: (challenge.answer + 1) % 4,
  });
  assert.equal(player.points, 20);
  assert.equal(room.game.turn, 1);
});

test("caer exactamente en 24 o cruzarla a una casilla normal da un único bono", () => {
  for (const roll of [1, 2]) {
    const { host, room, setDice } = setup();
    setDice(roll);
    const player = room.game.players[0];
    Object.assign(player, { totalSteps: 23, position: 23, laps: 0, points: 0 });
    host("roll-dice");
    assert.equal(player.points, 20);
  }
});

test("el otro jugador no puede lanzar fuera de turno", () => {
  const { guest, room } = setup();
  assert.equal(guest("roll-dice").ok, false);
  assert.equal(room.game.rollNumber, 0);
});
