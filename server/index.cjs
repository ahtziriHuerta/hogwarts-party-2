const express = require("express");
const characters = require("../shared/characters.json");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "https://regal-pothos-2022c1.netlify.app",
    ],
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

const BOARD = require("../shared/board.json");
const TOTAL = BOARD.length;
const TROPHY_PRICE = 100;
const TROPHIES_TO_WIN = 2;

const QUESTIONS = require("./questions.json");
const { createChallengeController } = require("./challenges.cjs");
const { createMemoryQuestion } = require("./memory.cjs");
const { SURPRISES, applySurprise } = require("./surprises.cjs");

// FUNCIONES DE SALAS

function generateCode() {
  let code;

  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (rooms.has(code));

  return code;
}

function publicRoom(room) {
  return {
    code: room.code,
    status: room.status,

    players: room.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      character: player.character,
    })),

    game: room.game
      ? {
          players: room.game.players.map((p) => ({ ...p })),
          turn: room.game.turn,
          dice: room.game.dice,
          winner: room.game.winner,
          message: room.game.message,
          rollNumber: room.game.rollNumber,
          challenge: challenges.publicChallenge(room.game.challenge),
          trophyPrice: TROPHY_PRICE,
          trophiesToWin: TROPHIES_TO_WIN,
        }
      : null,
  };
}

function updateRoom(room) {
  io.to(room.code).emit("room-updated", publicRoom(room));
}

function getPlayerRoom(socket) {
  const room = rooms.get(socket.data.roomCode);

  if (!room) return null;

  if (!room.players.some((p) => p.id === socket.id)) {
    return null;
  }

  return room;
}

// EFECTOS DE CASILLAS

function getSpaceEffect(position, nickname) {
  if (BOARD[position - 1]?.type === "finish") {
    return {
      points: 20,
      message: `🏰 ${nickname} completó una vuelta por Hogwarts: +20 monedas.`,
    };
  }

  if (BOARD[position - 1]?.type === "trap") {
    return {
      points: -10,
      message: `🕷️ ${nickname} cayó en una trampa: -10 monedas.`,
    };
  }

  if (BOARD[position - 1]?.type === "bonus") {
    return {
      points: 20,
      message: `🪙 ${nickname} encontró magia: +20 monedas.`,
    };
  }

  return {
    points: 0,
    message: `✨ ${nickname} llegó a la casilla ${position}.`,
  };
}

// PREGUNTAS ALEATORIAS

function chooseQuestion(game) {
  if (game.usedQuestions.length >= QUESTIONS.length) {
    game.usedQuestions = [];
  }

  const available = QUESTIONS.map((question, index) => ({
    question,
    index,
  })).filter(({ index }) => !game.usedQuestions.includes(index));

  const selected = available[crypto.randomInt(0, available.length)];

  game.usedQuestions.push(selected.index);

  // Barajar las opciones evita memorizar una letra en lugar de la respuesta.
  const options = selected.question.options.map((text, index) => ({
    text,
    correct: index === selected.question.answer,
  }));
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return {
    ...selected.question,
    options: options.map((option) => option.text),
    answer: options.findIndex((option) => option.correct),
  };
}

function nextTurn(game) {
  game.turn = (game.turn + 1) % game.players.length;
}

const challenges = createChallengeController({ updateRoom, nextTurn });

// CONEXIONES MULTIJUGADOR

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  // CREAR SALA

  socket.on("create-room", (data, callback) => {
    if (socket.data.roomCode) {
      return callback?.({
        ok: false,
        error: "Ya perteneces a una sala.",
      });
    }

    const nickname = String(data?.nickname || "")
      .trim()
      .slice(0, 20);

    if (!nickname) {
      return callback?.({
        ok: false,
        error: "Ingresa un nombre.",
      });
    }

    const code = generateCode();

    const room = {
      code,
      status: "waiting",
      players: [
        {
          id: socket.id,
          nickname,
          character: null,
        },
      ],
      game: null,
    };

    rooms.set(code, room);

    socket.join(code);
    socket.data.roomCode = code;

    callback?.({
      ok: true,
      room: publicRoom(room),
    });

    console.log("Sala creada:", code);
  });

  // UNIRSE A SALA

  socket.on("join-room", (data, callback) => {
    if (socket.data.roomCode) {
      return callback?.({
        ok: false,
        error: "Ya perteneces a una sala.",
      });
    }

    const code = String(data?.code || "")
      .trim()
      .toUpperCase();

    const nickname = String(data?.nickname || "")
      .trim()
      .slice(0, 20);

    const room = rooms.get(code);

    if (!nickname) {
      return callback?.({
        ok: false,
        error: "Ingresa un nombre.",
      });
    }

    if (!room) {
      return callback?.({
        ok: false,
        error: "La sala no existe.",
      });
    }

    if (room.status !== "waiting") {
      return callback?.({
        ok: false,
        error: "La sala no acepta jugadores.",
      });
    }

    if (room.players.length >= 2) {
      return callback?.({
        ok: false,
        error: "La sala está llena.",
      });
    }

    room.players.push({
      id: socket.id,
      nickname,
      character: null,
    });

    room.status = "ready";
    room.game = null;

    socket.join(code);
    socket.data.roomCode = code;

    updateRoom(room);

    callback?.({
      ok: true,
      room: publicRoom(room),
    });
  });

  // SELECCIONAR PERSONAJE

  socket.on("select-character", (data, callback) => {
    const room = getPlayerRoom(socket);

    if (!room) {
      return callback?.({
        ok: false,
        error: "No perteneces a una sala.",
      });
    }

    if (room.status === "playing" || room.status === "finished") {
      return callback?.({
        ok: false,
        error: "La partida ya comenzó.",
      });
    }

    const character = data?.character;

    if (
      !character ||
      !Number.isInteger(character.id) ||
      character.id < 1 ||
      character.id > 8
    ) {
      return callback?.({
        ok: false,
        error: "Personaje no válido.",
      });
    }

    const occupied = room.players.some(
      (p) => p.id !== socket.id && p.character?.id === character.id,
    );

    if (occupied) {
      return callback?.({
        ok: false,
        error: "Ese personaje ya está ocupado.",
      });
    }

    const player = room.players.find((p) => p.id === socket.id);

    // El cliente elige un ID; los datos visuales válidos vienen del catálogo compartido.
    player.character = {
      ...characters.find((item) => item.id === character.id),
    };

    updateRoom(room);

    callback?.({
      ok: true,
      room: publicRoom(room),
    });
  });

  // ========================================
  // INICIAR PARTIDA
  // ========================================

  socket.on("start-game", (_data, callback) => {
    const room = getPlayerRoom(socket);

    if (!room) {
      return callback?.({
        ok: false,
        error: "Sala no encontrada.",
      });
    }

    if (room.players[0]?.id !== socket.id) {
      return callback?.({
        ok: false,
        error: "Solo el creador puede iniciar.",
      });
    }

    if (
      room.status !== "ready" ||
      room.players.length !== 2 ||
      !room.players.every((p) => p.character)
    ) {
      return callback?.({
        ok: false,
        error: "Ambos jugadores deben elegir personaje.",
      });
    }

    room.game = {
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        character: p.character,
        position: 0,
        points: 0,
        trophies: 0,
        laps: 0,
        totalSteps: 0,
      })),

      turn: 0,
      dice: null,
      winner: null,

      message: `🎲 ¡Comienza la aventura! Turno de ${room.players[0].nickname}.`,

      rollNumber: 0,
      challenge: null,
      usedQuestions: [],
    };

    room.status = "playing";

    updateRoom(room);

    callback?.({ ok: true });
  });

  // ========================================
  // LANZAR DADO
  // ========================================

  socket.on("roll-dice", (_data, callback) => {
    const room = getPlayerRoom(socket);

    if (!room || room.status !== "playing" || !room.game) {
      return callback?.({
        ok: false,
        error: "No hay una partida activa.",
      });
    }

    const game = room.game;

    if (game.challenge) {
      return callback?.({
        ok: false,
        error: "Primero deben resolver el reto mágico.",
      });
    }

    const player = game.players[game.turn];

    if (player.id !== socket.id) {
      return callback?.({
        ok: false,
        error: "Todavía no es tu turno.",
      });
    }

    const result = crypto.randomInt(1, 7);

    // Acumulamos los pasos reales del dado.
    player.totalSteps = (player.totalSteps ?? 0) + result;

    // La longitud del recorrido viene del mapa compartido.
    const destination = ((player.totalSteps - 1) % TOTAL) + 1;

    // Calculamos las vueltas completadas.
    const newLaps = Math.floor(player.totalSteps / TOTAL);

    const completedLap = newLaps > (player.laps ?? 0);

    player.position = destination;
    player.laps = newLaps;

    game.dice = result;
    game.rollNumber += 1;

    const space = BOARD[destination - 1];
    const isChallenge = space.type === "solo" || space.type === "duel";

    // Acreditar la vuelta antes del reto, que mantiene el turno y retorna aquí.
    const lapBonus = completedLap && destination !== TOTAL ? 20 : 0;
    player.points += lapBonus;

    if (isChallenge) {
      challenges.start(room, chooseQuestion(game), space.type);
      return callback?.({ ok: true });
    }

    if (space.type === "memory") {
      challenges.start(room, createMemoryQuestion(), "solo");
      return callback?.({ ok: true });
    }
    if (space.type === "surprise") {
      const event = applySurprise(game, crypto.randomInt(0, SURPRISES.length));
      challenges.startSurprise(room, event);
      return callback?.({ ok: true });
    }

    const effect = getSpaceEffect(destination, player.nickname);

    player.points = Math.max(0, player.points + effect.points);

    game.message = effect.message;

    if (lapBonus > 0) {
      game.message += ` 🏰 ¡Vuelta completada! +20 monedas adicionales.`;
    }

    nextTurn(game);

    updateRoom(room);

    callback?.({ ok: true });
  });

  // ========================================
  // RESPONDER PREGUNTA
  // ========================================

  socket.on("answer-challenge", (data, callback) => {
    const room = getPlayerRoom(socket);

    if (!room || room.status !== "playing" || !room.game) {
      return callback?.({
        ok: false,
        error: "No hay una partida activa.",
      });
    }

    callback?.(challenges.answer(room, socket.id, data));
  });

  // ========================================
  // COMPRAR TROFEO
  // ========================================

  socket.on("buy-trophy", (_data, callback) => {
    const room = getPlayerRoom(socket);

    if (!room || room.status !== "playing" || !room.game) {
      return callback?.({
        ok: false,
        error: "No hay una partida activa.",
      });
    }

    const game = room.game;

    if (game.challenge) {
      return callback?.({
        ok: false,
        error: "Primero deben resolver el reto mágico.",
      });
    }

    const player = game.players.find((p) => p.id === socket.id);

    if (!player) {
      return callback?.({
        ok: false,
        error: "Jugador no encontrado.",
      });
    }

    if (player.points < TROPHY_PRICE) {
      return callback?.({
        ok: false,
        error: `Necesitas ${TROPHY_PRICE} monedas para comprar un trofeo.`,
      });
    }

    if (player.trophies >= TROPHIES_TO_WIN) {
      return callback?.({
        ok: false,
        error: "Ya tienes todos los trofeos.",
      });
    }

    player.points -= TROPHY_PRICE;
    player.trophies += 1;

    if (player.trophies >= TROPHIES_TO_WIN) {
      game.winner = game.players.findIndex((p) => p.id === socket.id);

      room.status = "finished";

      game.message = `🏆 ¡${player.nickname} consiguió 2 trofeos y ganó la Copa de Hogwarts!`;
    } else {
      game.message = `🏆 ${player.nickname} compró un trofeo. ¡Le falta uno para ganar!`;
    }

    updateRoom(room);

    callback?.({
      ok: true,
      trophies: player.trophies,
      points: player.points,
    });
  });

  // ========================================
  // REINICIAR PARTIDA
  // ========================================

  socket.on("restart-game", (_data, callback) => {
    const room = getPlayerRoom(socket);

    if (!room || !room.game) {
      return callback?.({
        ok: false,
        error: "No hay una partida para reiniciar.",
      });
    }

    if (room.players[0]?.id !== socket.id) {
      return callback?.({
        ok: false,
        error: "Solo el creador puede reiniciar.",
      });
    }

    challenges.cancel(room);

    room.game.players.forEach((p) => {
      p.position = 0;
      p.points = 0;
      p.trophies = 0;
      p.laps = 0;
      p.totalSteps = 0;
    });

    room.game.turn = 0;
    room.game.dice = null;
    room.game.winner = null;
    room.game.rollNumber = 0;
    room.game.challenge = null;
    room.game.usedQuestions = [];

    room.game.message = "✨ ¡Nueva aventura! Jugador 1, lanza el dado.";

    room.status = "playing";

    updateRoom(room);

    callback?.({ ok: true });
  });

  // ========================================
  // DESCONEXIÓN
  // ========================================

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room) return;

    challenges.cancel(room);
    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length === 0) {
      rooms.delete(code);

      console.log("Sala eliminada:", code);
    } else {
      room.status = "waiting";
      room.game = null;

      updateRoom(room);
    }

    console.log("Desconectado:", socket.id);
  });
});

// SERVIDOR HTTP

app.get("/", (_req, res) => {
  res.send("Servidor Hogwarts Party funcionando");
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🏰 Servidor Hogwarts Party escuchando en puerto ${PORT}`);
});
