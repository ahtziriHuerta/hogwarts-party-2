const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const TOTAL = require("../shared/board.json").length;

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
  Object.assign(player, {
    totalSteps: TOTAL - 1,
    position: TOTAL - 1,
    laps: 0,
    points: 0,
  });
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

test("caer en el castillo o cruzarlo hacia un reto individual da un único bono", () => {
  for (const roll of [1, 2]) {
    const { host, room, setDice } = setup();
    setDice(roll);
    const player = room.game.players[0];
    Object.assign(player, {
      totalSteps: TOTAL - 1,
      position: TOTAL - 1,
      laps: 0,
      points: 0,
    });
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
    if (room.game.challenge.media)
      client("challenge-media", {
        challengeId: room.game.challenge.id,
        status: "failed",
      });
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
    session.setDice(6);
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
    memory: 6,
    surprise: 6,
    bonus: 4,
    trap: 2,
    normal: 1,
    finish: 1,
  });
  assert.equal(
    board
      .slice(0, 6)
      .filter((space) => ["solo", "duel", "memory"].includes(space.type))
      .length,
    4,
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
    } else if (space.type === "memory") {
      assert.equal(room.game.challenge.kind, "memory");
      assert.equal(room.game.challenge.phase, "memorizing");
      assert.equal(player.points, 50);
    } else if (space.type === "surprise") {
      assert.equal(room.game.challenge.kind, "surprise");
      assert.equal(player.points, 70); // Carta 0: bolsa de +20.
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

test("memoria: cinco símbolos, pregunta oculta y bloqueo hasta terminar la observación", () => {
  const session = setup();
  const { host, guest, room, view, advance } = session;
  session.setDice(2);
  host("roll-dice");
  const challenge = room.game.challenge;
  assert.equal(challenge.phase, "memorizing");
  const preview = view().game.challenge;
  assert.equal(preview.memorySequence.length, 5);
  assert.equal(
    new Set(preview.memorySequence.map((symbol) => symbol.name)).size,
    5,
  );
  assert.equal(preview.question, undefined);
  assert.equal(preview.options, undefined);
  assert.equal(preview.correctAnswer, undefined);
  assert.equal(
    host("answer-challenge", {
      challengeId: challenge.id,
      answer: challenge.answer,
    }).ok,
    false,
  );
  advance(5000);
  const question = view().game.challenge;
  assert.equal(question.phase, "answering");
  assert.equal(question.memorySequence, undefined);
  assert.equal(question.deadlineAt - question.serverNow, 20_000);
  assert.equal(
    guest("answer-challenge", {
      challengeId: challenge.id,
      answer: challenge.answer,
    }).ok,
    false,
  );
  host("answer-challenge", {
    challengeId: challenge.id,
    answer: challenge.answer,
  });
  assert.equal(challenge.phase, "results");
  assert.equal(room.game.players[0].points, 25);
  assert.equal(room.game.players[1].points, 0);
  advance(5000);
  assert.equal(room.game.turn, 1);
});

test("memoria: fallar o dejar vencer el tiempo no resta monedas", () => {
  for (const reply of [true, false]) {
    const session = setup();
    const { host, room, advance } = session;
    room.game.players[0].points = 40;
    session.setDice(2);
    host("roll-dice");
    const challenge = room.game.challenge;
    advance(5000);
    if (reply)
      host("answer-challenge", {
        challengeId: challenge.id,
        answer: (challenge.answer + 1) % challenge.options.length,
      });
    else advance(20_000);
    assert.equal(challenge.phase, "results");
    assert.equal(room.game.players[0].points, 40);
    assert.equal(challenge.results[0].penalty, 0);
  }
});

test("reiniciar durante la memoria cancela también la transición a la pregunta", () => {
  const session = setup();
  const { host, room, advance, timers } = session;
  session.setDice(2);
  host("roll-dice");
  host("restart-game");
  assert.equal(timers.size, 0);
  advance(30_000);
  assert.equal(room.game.challenge, null);
  assert.equal(room.game.turn, 0);
});

test("cartas sorpresa: premios, pérdida limitada al saldo, robo conservado y regalo a ambos", () => {
  const { SURPRISES, applySurprise } = require("../server/surprises.cjs");
  assert.equal(SURPRISES.length, 6);
  const expected = [
    [25, 7],
    [35, 7],
    [0, 7],
    [12, 0],
    [15, 17],
    [20, 7],
  ];
  for (let index = 0; index < SURPRISES.length; index++) {
    const game = {
      turn: 0,
      players: [
        { id: "a", nickname: "A", points: 5 },
        { id: "b", nickname: "B", points: 7 },
      ],
    };
    const event = applySurprise(game, index);
    assert.deepEqual(
      game.players.map((player) => player.points),
      expected[index],
    );
    assert.ok(event.title && event.description);
    for (const result of event.results) {
      const playerIndex = result.playerId === "a" ? 0 : 1;
      assert.equal(
        result.earned,
        expected[index][playerIndex] - [5, 7][playerIndex],
      );
    }
  }
});

test("la sorpresa se aplica una vez y bloquea el dado hasta volver al tablero", () => {
  const session = setup();
  const { host, guest, room, view, advance } = session;
  session.setDice(4);
  host("roll-dice");
  const event = view().game.challenge;
  assert.equal(event.kind, "surprise");
  assert.equal(event.phase, "results");
  assert.equal(room.game.players[0].points, 20);
  assert.equal(event.question, undefined);
  assert.equal(event.correctAnswer, undefined);
  assert.equal(host("roll-dice").ok, false);
  assert.equal(
    host("answer-challenge", { challengeId: event.id, answer: 0 }).ok,
    false,
  );
  assert.equal(guest("buy-trophy").ok, false);
  advance(5000);
  assert.equal(room.game.challenge, null);
  assert.equal(room.game.turn, 1);
  assert.equal(room.game.players[0].points, 20);
});

test("la respuesta de memoria corresponde a la posición preguntada", () => {
  const { createMemoryQuestion } = require("../server/memory.cjs");
  for (let i = 0; i < 30; i++) {
    const question = createMemoryQuestion();
    const position = Number(question.question.match(/\d+/)[0]);
    const symbol = question.memorySequence[position - 1];
    assert.equal(
      question.options[question.answer],
      `${symbol.icon} ${symbol.name}`,
    );
    assert.equal(new Set(question.options).size, 4);
  }
});

function beginVisual(session, { video = false, solo = false } = {}) {
  session.room.game.questionNumber = 2;
  session.room.game.usedMediaQuestions = video
    ? Array.from({ length: 10 }, (_, i) => i)
    : [];
  session.setDice(solo ? 1 : 3);
  session.host("roll-dice");
  return session.room.game.challenge;
}

test("visual: nadie responde hasta que ambos carguen y después tienen 20 segundos completos", () => {
  const s = setup();
  const c = beginVisual(s);
  assert.equal(c.phase, "loading");
  assert.equal(s.view().game.challenge.question, undefined);
  assert.equal(s.view().game.challenge.options, undefined);
  assert.equal(s.view().game.challenge.fallbackQuestion, undefined);
  assert.equal(
    s.host("answer-challenge", { challengeId: c.id, answer: c.answer }).ok,
    false,
  );
  assert.equal(s.host("roll-dice").ok, false);
  assert.equal(s.host("buy-trophy").ok, false);
  assert.equal(
    s.host("challenge-media", { challengeId: "antiguo", status: "ready" }).ok,
    false,
  );
  assert.equal(
    s.host("challenge-media", { challengeId: c.id, status: "viewed" }).ok,
    false,
  );
  s.advance(9000);
  for (let i = 0; i < 2; i++)
    assert.equal(
      s.host("challenge-media", { challengeId: c.id, status: "ready" }).ok,
      true,
    );
  assert.equal(c.phase, "loading");
  assert.equal(c.readyPlayerIds.size, 1);
  s.guest("challenge-media", { challengeId: c.id, status: "ready" });
  const visible = s.view().game.challenge;
  assert.equal(visible.deadlineAt - visible.serverNow, 20_000);
  assert.equal(visible.phase, "answering");
  assert.ok(visible.media);
  assert.equal(visible.answer, undefined);
  s.advance(19_999);
  assert.equal(c.phase, "answering");
  s.host("answer-challenge", { challengeId: c.id, answer: c.answer });
  s.guest("answer-challenge", { challengeId: c.id, answer: c.answer });
  assert.equal(c.phase, "results");
  assert.equal(s.view().game.challenge.media, undefined);
});

test("clip: pregunta oculta hasta que ambos terminen, con duración mínima y una sola respuesta", () => {
  const s = setup();
  const c = beginVisual(s, { video: true });
  for (const client of [s.host, s.guest])
    client("challenge-media", { challengeId: c.id, status: "ready" });
  assert.equal(c.phase, "watching");
  assert.equal(s.view().game.challenge.question, undefined);
  assert.equal(
    s.host("challenge-media", { challengeId: c.id, status: "viewed" }).ok,
    false,
  );
  s.advance(6000);
  s.host("challenge-media", { challengeId: c.id, status: "viewed" });
  assert.equal(c.phase, "watching");
  s.guest("challenge-media", { challengeId: c.id, status: "viewed" });
  const visible = s.view().game.challenge;
  assert.equal(c.phase, "answering");
  assert.equal(visible.media, undefined);
  assert.equal(visible.deadlineAt - visible.serverNow, 20_000);
  for (const client of [s.host, s.guest])
    client("answer-challenge", { challengeId: c.id, answer: c.answer });
  assert.equal(c.phase, "results");
  const balances = s.room.game.players.map((p) => p.points);
  s.host("answer-challenge", { challengeId: c.id, answer: c.answer });
  assert.deepEqual(
    s.room.game.players.map((p) => p.points),
    balances,
  );
});

test("fallo de archivo o espera agotada sustituyen el reto sin descontar ni perder el turno", () => {
  for (const reason of [
    "failed",
    "load-timeout",
    "watch-timeout",
    "late-ready",
  ]) {
    const s = setup();
    const c = beginVisual(s, { video: reason === "watch-timeout" });
    s.room.game.players.forEach((p) => (p.points = 50));
    if (reason === "watch-timeout") {
      for (const client of [s.host, s.guest])
        client("challenge-media", { challengeId: c.id, status: "ready" });
      s.advance(20_000);
    } else if (reason === "load-timeout") s.advance(10_000);
    else {
      if (reason === "late-ready") s.jump(10_000);
      s.host("challenge-media", {
        challengeId: c.id,
        status: reason === "late-ready" ? "ready" : "failed",
      });
    }
    const fallback = s.room.game.challenge;
    assert.notEqual(fallback.id, c.id);
    assert.equal(fallback.media, undefined);
    assert.equal(fallback.phase, "answering");
    assert.equal(fallback.mode, "duel");
    assert.ok(fallback.notice);
    assert.equal(s.room.game.turn, 0);
    assert.deepEqual(
      Array.from(s.room.game.players, (p) => p.points),
      [50, 50],
    );
    assert.equal(
      s.host("challenge-media", { challengeId: c.id, status: "ready" }).ok,
      false,
    );
    for (const client of [s.host, s.guest])
      client("answer-challenge", {
        challengeId: fallback.id,
        answer: fallback.answer,
      });
    s.advance(5000);
    assert.equal(s.room.game.turn, 1);
    assert.equal(s.room.game.challenge, null);
  }
});

test("visual individual: el observador no bloquea, no puede omitirlo y no recibe descuentos", () => {
  const s = setup();
  const c = beginVisual(s, { solo: true });
  s.room.game.players.forEach((p) => (p.points = 50));
  assert.equal(
    s.guest("challenge-media", { challengeId: c.id, status: "failed" }).ok,
    false,
  );
  s.host("challenge-media", { challengeId: c.id, status: "ready" });
  assert.equal(c.phase, "answering");
  s.host("answer-challenge", { challengeId: c.id, answer: (c.answer + 1) % 4 });
  assert.deepEqual(
    Array.from(s.room.game.players, (p) => p.points),
    [50, 50],
  );
});

test("reiniciar o desconectar cancela las esperas de archivos y clips", () => {
  for (const disconnect of [false, true]) {
    const s = setup();
    const c = beginVisual(s, { video: true });
    for (const client of [s.host, s.guest])
      client("challenge-media", { challengeId: c.id, status: "ready" });
    if (disconnect) s.guest("disconnect");
    else s.host("restart-game");
    s.advance(40_000);
    assert.equal(s.room.game?.challenge ?? null, null);
    assert.equal(s.timers.size, 0);
    if (!disconnect) assert.equal(s.room.game.questionNumber, 0);
  }
});

test("un visual cada tres preguntas y doce recursos sin repetir antes de agotar su banco", () => {
  const s = setup();
  const seen = new Set();
  for (let i = 1; i <= 39; i++) {
    const client = s.room.game.turn === 0 ? s.host : s.guest;
    const p = s.room.game.players[s.room.game.turn];
    p.totalSteps = 0;
    p.laps = 0;
    s.setDice(3);
    client("roll-dice");
    const c = s.room.game.challenge;
    assert.equal(Boolean(c.media), i % 3 === 0);
    if (c.media) {
      if (i <= 36) assert.equal(seen.has(c.media.src), false);
      else assert.equal(seen.has(c.media.src), true);
      seen.add(c.media.src);
      for (const player of [s.host, s.guest])
        player("challenge-media", { challengeId: c.id, status: "ready" });
      if (c.media.type === "video") {
        s.advance(6000);
        for (const player of [s.host, s.guest])
          player("challenge-media", { challengeId: c.id, status: "viewed" });
      }
    }
    for (const player of [s.host, s.guest])
      player("answer-challenge", { challengeId: c.id, answer: c.answer });
    s.advance(5000);
  }
  assert.equal(seen.size, 12);
});
