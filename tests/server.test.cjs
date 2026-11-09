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
  let time = 1_000_000;
  let timerId = 0;
  const timers = new Map();
  const clock = {
    now: () => time,
    schedule: (callback, delay) => {
      const id = ++timerId;
      timers.set(id, { at: time + delay, callback });
      return id;
    },
    cancel: (id) => timers.delete(id),
  };
  function advance(ms) {
    const target = time + ms;
    while (true) {
      const next = [...timers]
        .filter(([, value]) => value.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
    }
    time = target;
  }
  const serverPath = path.join(__dirname, "../server/index.cjs");
  const realRequire = createRequire(serverPath);
  const context = vm.createContext({
    console: { log() {} },
    process: { env: {} },
    require(name) {
      if (name === "./challenges.cjs") {
        const { createChallengeController } = realRequire(name);
        return {
          createChallengeController: (options) =>
            createChallengeController({ ...options, clock }),
        };
      }
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
    advance,
    jump: (ms) => {
      time += ms;
    },
    timers,
    view: () =>
      vm.runInContext("publicRoom(rooms.values().next().value)", context),
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

test("la vuelta se abona antes de descontar el fallo de un duelo", () => {
  const { host, guest, room, advance } = setup();
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
  guest("answer-challenge", {
    challengeId: challenge.id,
    answer: (challenge.answer + 1) % challenge.options.length,
  });
  assert.equal(player.points, 10);
  advance(5000);
  assert.equal(room.game.turn, 1);
});

test("caer en 24 o cruzarla hacia un reto individual da un único bono", () => {
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

function beginDuel(session) {
  session.setDice(3);
  session.host("roll-dice");
  return session.room.game.challenge;
}

test("ambos responden y el secreto no se revela hasta cerrar el reto", () => {
  const session = setup();
  const { host, guest, room, view, advance } = session;
  const challenge = beginDuel(session);
  const correct = challenge.answer;
  assert.equal(view().game.challenge.phase, "answering");
  assert.equal("answer" in view().game.challenge, false);
  advance(1000);
  const accepted = guest("answer-challenge", {
    challengeId: challenge.id,
    answer: correct,
  });
  assert.equal(accepted.ok, true); // Puede responder quien no lanzó el dado.
  assert.equal("correct" in accepted, false);
  assert.equal("earned" in accepted, false);
  const waiting = view().game.challenge;
  assert.equal("correctAnswer" in waiting, false);
  assert.equal("results" in waiting, false);
  assert.deepEqual([...waiting.answeredPlayerIds], ["guest"]);
  assert.equal(room.game.players[1].points, 0);
  advance(15000);
  host("answer-challenge", {
    challengeId: challenge.id,
    answer: correct,
    answeredAt: 0,
    earned: 99999,
  });
  const revealed = view().game.challenge;
  assert.equal(revealed.phase, "results");
  assert.equal(revealed.correctAnswer, correct);
  assert.equal(room.game.players[1].points, challenge.points + 10);
  assert.equal(room.game.players[0].points, challenge.points + 2);
  assert.equal(room.game.turn, 0);
  advance(5000);
  assert.equal(room.game.challenge, null);
  assert.equal(room.game.turn, 1);
});

test("una respuesta por jugador: reintentar no cambia el resultado ni suma dos veces", () => {
  const session = setup();
  const { host, guest, room } = session;
  const challenge = beginDuel(session);
  const wrong = (challenge.answer + 1) % challenge.options.length;
  assert.equal(
    host("answer-challenge", { challengeId: challenge.id, answer: wrong }).ok,
    true,
  );
  assert.equal(
    host("answer-challenge", {
      challengeId: challenge.id,
      answer: challenge.answer,
    }).ok,
    false,
  );
  guest("answer-challenge", {
    challengeId: challenge.id,
    answer: challenge.answer,
  });
  const points = room.game.players[1].points;
  assert.equal(room.game.players[0].points, 0);
  assert.equal(
    guest("answer-challenge", {
      challengeId: challenge.id,
      answer: challenge.answer,
    }).ok,
    false,
  );
  assert.equal(room.game.players[1].points, points);
});

test("al vencer 20 segundos el reto y los resultados avanzan aunque nadie responda", () => {
  const session = setup();
  const { room, advance } = session;
  beginDuel(session);
  advance(20_000);
  assert.equal(room.game.challenge.phase, "results");
  assert.ok(
    room.game.challenge.results.every(
      (result) => result.timedOut && result.earned === 0,
    ),
  );
  advance(5000);
  assert.equal(room.game.challenge, null);
  assert.equal(room.game.turn, 1);
});

test("el plazo también se valida si llega una respuesta antes de ejecutar el temporizador", () => {
  const session = setup();
  const { host, room, jump } = session;
  const challenge = beginDuel(session);
  jump(20_000);
  assert.equal(
    host("answer-challenge", {
      challengeId: challenge.id,
      answer: challenge.answer,
    }).ok,
    false,
  );
  assert.equal(room.game.challenge.phase, "results");
  assert.ok(room.game.players.every((player) => player.points === 0));
});

test("responder mal no da bono y una respuesta ausente se marca como vencida", () => {
  const session = setup();
  const { host, room, advance } = session;
  const challenge = beginDuel(session);
  assert.equal(
    host("answer-challenge", { challengeId: challenge.id, answer: 99 }).ok,
    false,
  );
  host("answer-challenge", {
    challengeId: challenge.id,
    answer: (challenge.answer + 1) % challenge.options.length,
  });
  advance(20_000);
  const [first, second] = room.game.challenge.results;
  assert.equal(first.correct, false);
  assert.equal(first.timedOut, false);
  assert.equal(first.speedBonus, 0);
  assert.equal(second.timedOut, true);
});

test("reiniciar cancela el reloj anterior y rechaza respuestas de una partida vieja", () => {
  const session = setup();
  const { host, room, advance, timers } = session;
  const oldChallenge = beginDuel(session);
  advance(10_000);
  host("restart-game");
  assert.equal(timers.size, 0);
  const next = beginDuel(session);
  assert.notEqual(next.id, oldChallenge.id);
  assert.equal(
    host("answer-challenge", {
      challengeId: oldChallenge.id,
      answer: oldChallenge.answer,
    }).ok,
    false,
  );
  advance(10_000);
  assert.equal(room.game.challenge.phase, "answering");
  assert.equal(room.game.challenge.responses.size, 0);
  advance(10_000);
  assert.equal(room.game.challenge.phase, "results");
});

test("desconectar cancela el reto y no deja un temporizador sobre la sala de espera", () => {
  const session = setup();
  const { guest, room, advance, timers } = session;
  beginDuel(session);
  guest("disconnect");
  assert.equal(room.status, "waiting");
  assert.equal(room.game, null);
  assert.equal(timers.size, 0);
  advance(30_000);
  assert.equal(room.game, null);
});

test("dados y compras permanecen bloqueados hasta terminar los resultados", () => {
  const session = setup();
  const { host, guest, room, advance } = session;
  const challenge = beginDuel(session);
  room.game.players[1].points = 110;
  for (const client of [host, guest])
    assert.equal(client("roll-dice").ok, false);
  assert.equal(guest("buy-trophy").ok, false);
  for (const client of [host, guest])
    client("answer-challenge", {
      challengeId: challenge.id,
      answer: (challenge.answer + 1) % challenge.options.length,
    });
  assert.equal(guest("buy-trophy").ok, false);
  advance(5000);
  assert.equal(guest("buy-trophy").ok, true);
});

test("60 preguntas válidas, dos formatos y ninguna repetida antes de agotar el banco", () => {
  const questions = require("../server/questions.json");
  assert.equal(questions.length, 60);
  assert.equal(
    new Set(questions.map((question) => question.question)).size,
    60,
  );
  for (const question of questions) {
    assert.ok(
      question.answer >= 0 && question.answer < question.options.length,
    );
    assert.ok(question.options.length === 2 || question.options.length === 4);
    assert.ok(question.category);
  }
  const session = setup();
  const seen = new Set();
  for (let i = 0; i < 61; i++) {
    const { room, host, guest } = session;
    const client = room.game.turn === 0 ? host : guest;
    const player = room.game.players[room.game.turn];
    player.totalSteps = 0;
    player.laps = 0;
    session.setDice(3);
    client("roll-dice");
    const challenge = room.game.challenge;
    const original = questions.find(
      (question) => question.question === challenge.question,
    );
    assert.equal(
      challenge.options[challenge.answer],
      original.options[original.answer],
    );
    if (i < 60) assert.equal(seen.has(challenge.question), false);
    else assert.equal(seen.has(challenge.question), true);
    seen.add(challenge.question);
    for (const answer of [host, guest])
      answer("answer-challenge", { challengeId: challenge.id, answer: 0 });
    session.advance(5000);
  }
  assert.equal(seen.size, 60);
});

test("solo responde quien cayó en la casilla individual y el rival conserva su saldo", () => {
  const session = setup();
  const { host, guest, room, view, advance } = session;
  room.game.players[0].points = 40;
  room.game.players[1].points = 60;
  session.setDice(1);
  host("roll-dice");
  const challenge = room.game.challenge;
  assert.equal(challenge.mode, "solo");
  assert.deepEqual([...view().game.challenge.participantIds], ["host"]);
  assert.equal(
    guest("answer-challenge", {
      challengeId: challenge.id,
      answer: challenge.answer,
    }).ok,
    false,
  );
  assert.equal(challenge.responses.size, 0);
  assert.equal(
    host("answer-challenge", {
      challengeId: challenge.id,
      answer: (challenge.answer + 1) % challenge.options.length,
    }).ok,
    true,
  );
  assert.equal(challenge.phase, "results");
  assert.equal(challenge.results.length, 1);
  assert.equal(challenge.results[0].earned, 0);
  assert.equal(room.game.players[0].points, 40);
  assert.equal(room.game.players[1].points, 60);
  advance(5000);
  assert.equal(room.game.turn, 1);
});

test("el reto individual premia acertar, sin bono por rapidez ni coste al dejarlo vencer", () => {
  for (const correct of [true, false]) {
    const session = setup();
    const { host, room, advance } = session;
    room.game.players[0].points = 40;
    session.setDice(2);
    host("roll-dice");
    const challenge = room.game.challenge;
    if (correct)
      host("answer-challenge", {
        challengeId: challenge.id,
        answer: challenge.answer,
      });
    else advance(20_000);
    assert.equal(
      room.game.players[0].points,
      correct ? 40 + challenge.points : 40,
    );
    assert.equal(challenge.results[0].speedBonus, 0);
    assert.equal(challenge.results[0].penalty, 0);
  }
});

test("equivocarse en un duelo o no contestar descuenta 10, limitados al saldo", () => {
  for (const balance of [0, 7, 10, 50]) {
    const session = setup();
    const { host, guest, room, advance } = session;
    for (const player of room.game.players) player.points = balance;
    const challenge = beginDuel(session);
    host("answer-challenge", {
      challengeId: challenge.id,
      answer: (challenge.answer + 1) % challenge.options.length,
    });
    advance(20_000); // El rival no responde: aplica la misma penalización.
    for (const result of challenge.results) {
      assert.equal(result.penalty, Math.min(10, balance));
      assert.equal(result.earned, balance > 0 ? -Math.min(10, balance) : 0);
    }
    for (const player of room.game.players)
      assert.equal(player.points, Math.max(0, balance - 10));
    assert.equal(
      guest("answer-challenge", {
        challengeId: challenge.id,
        answer: challenge.answer,
      }).ok,
      false,
    );
    for (const player of room.game.players)
      assert.equal(player.points, Math.max(0, balance - 10));
  }
});

test("un acierto en duelo suma premio y rapidez mientras el rival pierde solo 10", () => {
  const session = setup();
  const { host, guest, room } = session;
  room.game.players[0].points = 30;
  room.game.players[1].points = 40;
  const challenge = beginDuel(session);
  host("answer-challenge", {
    challengeId: challenge.id,
    answer: challenge.answer,
  });
  guest("answer-challenge", {
    challengeId: challenge.id,
    answer: (challenge.answer + 1) % challenge.options.length,
  });
  assert.equal(room.game.players[0].points, 30 + challenge.points + 10);
  assert.equal(room.game.players[1].points, 30);
  assert.equal(challenge.results[0].penalty, 0);
  assert.equal(challenge.results[1].speedBonus, 0);
});

test("el mapa tiene 16 preguntas y todas las casillas activan la regla anunciada", () => {
  const board = require("../shared/board.json");
  const counts = board.reduce((result, space) => {
    result[space.type] = (result[space.type] || 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, {
    solo: 8,
    duel: 8,
    bonus: 4,
    trap: 2,
    normal: 1,
    finish: 1,
  });
  assert.equal(
    board.slice(0, 6).filter((space) => ["solo", "duel"].includes(space.type))
      .length,
    5,
  );
  for (const space of board) {
    const session = setup();
    const { host, room } = session;
    const player = room.game.players[0];
    player.totalSteps = space.number - 1;
    player.points = 50;
    session.setDice(1);
    host("roll-dice");
    assert.equal(player.position, space.number);
    if (["solo", "duel"].includes(space.type)) {
      assert.equal(room.game.challenge.mode, space.type);
      assert.equal(
        room.game.challenge.participantIds.length,
        space.type === "solo" ? 1 : 2,
      );
      assert.equal(player.points, 50);
    } else {
      assert.equal(room.game.challenge, null);
      assert.equal(
        player.points,
        space.type === "bonus" || space.type === "finish"
          ? 70
          : space.type === "trap"
            ? 40
            : 50,
      );
    }
  }
});
