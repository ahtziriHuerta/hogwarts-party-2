
const express = require("express");
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
    ],
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

const TOTAL = 24;
const TROPHY_PRICE = 100;
const TROPHIES_TO_WIN = 2;

// ==========================================
// PREGUNTAS DE HARRY POTTER
// ==========================================
// answer indica el índice de la respuesta correcta:
// 0 = A, 1 = B, 2 = C, 3 = D.

const QUESTIONS = [
  {
    question: "¿A qué casa pertenece Harry Potter?",
    options: [
      "Slytherin",
      "Ravenclaw",
      "Gryffindor",
      "Hufflepuff",
    ],
    answer: 2,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Cómo se llama la lechuza de Harry?",
    options: ["Hedwig", "Errol", "Pigwidgeon", "Fawkes"],
    answer: 0,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Cuál es el hechizo para desarmar?",
    options: ["Lumos", "Accio", "Protego", "Expelliarmus"],
    answer: 3,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Quién es el mejor amigo de Harry junto con Hermione?",
    options: ["Draco", "Ron", "Neville", "Cedric"],
    answer: 1,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Cuál es la plataforma del Expreso de Hogwarts?",
    options: ["9¾", "7½", "10", "8¾"],
    answer: 0,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Quién es el director de Hogwarts al comienzo de la saga?",
    options: ["Snape", "Hagrid", "Dumbledore", "Lupin"],
    answer: 2,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Qué deporte practican los estudiantes en escobas?",
    options: ["Quidditch", "Críquet", "Polo", "Duelo"],
    answer: 0,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Cuál es el nombre del banco de los magos?",
    options: ["Azkaban", "Gringotts", "Ollivanders", "Honeydukes"],
    answer: 1,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Qué hechizo produce luz en la punta de la varita?",
    options: ["Nox", "Accio", "Lumos", "Reparo"],
    answer: 2,
    difficulty: "Fácil",
    points: 10,
  },
  {
    question: "¿Quién enseña Pociones durante gran parte de la saga?",
    options: ["McGonagall", "Flitwick", "Hagrid", "Snape"],
    answer: 3,
    difficulty: "Fácil",
    points: 10,
  },

  // PREGUNTAS MEDIAS

  {
    question: "¿Cómo se llama el hipogrifo de Hagrid?",
    options: ["Aragog", "Buckbeak", "Norbert", "Fang"],
    answer: 1,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Qué objeto permite a Hermione asistir a varias clases a la vez?",
    options: ["Giratiempo", "Pensadero", "Traslador", "Recordadora"],
    answer: 0,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Cuál es el patronus de Harry?",
    options: ["Lobo", "Cierva", "Ciervo", "Águila"],
    answer: 2,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Qué hechizo sirve para atraer objetos?",
    options: ["Reparo", "Accio", "Alohomora", "Obliviate"],
    answer: 1,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Qué criatura vive en la Cámara de los Secretos?",
    options: ["Dragón", "Acromántula", "Trol", "Basilisco"],
    answer: 3,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Quién es el padrino de Harry?",
    options: [
      "Sirius Black",
      "Remus Lupin",
      "Arthur Weasley",
      "Severus Snape",
    ],
    answer: 0,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Qué objeto elige la casa de cada estudiante?",
    options: [
      "Copa de Fuego",
      "Sombrero Seleccionador",
      "Varita de Saúco",
      "Mapa del Merodeador",
    ],
    answer: 1,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Qué hechizo abre cerraduras?",
    options: [
      "Expelliarmus",
      "Expecto Patronum",
      "Alohomora",
      "Stupefy",
    ],
    answer: 2,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Cómo se llama el elfo doméstico que ayuda a Harry?",
    options: ["Kreacher", "Winky", "Hokey", "Dobby"],
    answer: 3,
    difficulty: "Media",
    points: 20,
  },
  {
    question: "¿Qué dragón enfrenta Harry en el Torneo de los Tres Magos?",
    options: [
      "Colacuerno húngaro",
      "Bola de Fuego chino",
      "Hocicorto sueco",
      "Verde galés",
    ],
    answer: 0,
    difficulty: "Media",
    points: 20,
  },

  // PREGUNTAS DIFÍCILES

  {
    question: "¿Cuál es el segundo nombre de Albus Dumbledore?",
    options: ["Brian", "Percival", "Wulfric", "Aberforth"],
    answer: 1,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Quién destruye el último horrocrux de Voldemort?",
    options: ["Harry", "Hermione", "Neville", "Ron"],
    answer: 2,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Cuál es el nombre completo de Voldemort antes de cambiarlo?",
    options: [
      "Tom Marvolo Riddle",
      "Tom Sirius Riddle",
      "Thomas Gaunt",
      "Tom Salazar",
    ],
    answer: 0,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Qué criatura representa el patronus de Snape?",
    options: ["Lobo", "Ciervo", "Fénix", "Cierva"],
    answer: 3,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Quién fabricó la primera snitch dorada?",
    options: [
      "Garrick Ollivander",
      "Bowman Wright",
      "Nicolas Flamel",
      "Godric Gryffindor",
    ],
    answer: 1,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Cómo se llama la madre de Voldemort?",
    options: [
      "Merope Gaunt",
      "Bellatrix Lestrange",
      "Walburga Black",
      "Hepzibah Smith",
    ],
    answer: 0,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Cuál es el núcleo de la varita de Harry?",
    options: [
      "Pelo de unicornio",
      "Fibra de corazón de dragón",
      "Pluma de fénix",
      "Pelo de thestral",
    ],
    answer: 2,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Quién fue el primer propietario conocido de la Varita de Saúco?",
    options: [
      "Dumbledore",
      "Antioch Peverell",
      "Grindelwald",
      "Draco Malfoy",
    ],
    answer: 1,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Qué horrocrux destruye Ron?",
    options: ["Diadema", "Diario", "Copa", "Guardapelo"],
    answer: 3,
    difficulty: "Difícil",
    points: 30,
  },
  {
    question: "¿Qué casa de Hogwarts fundó Rowena?",
    options: [
      "Ravenclaw",
      "Hufflepuff",
      "Slytherin",
      "Gryffindor",
    ],
    answer: 0,
    difficulty: "Difícil",
    points: 30,
  },
];

// ==========================================
// FUNCIONES DE SALAS
// ==========================================

function generateCode() {
  let code;

  do {
    code = crypto.randomBytes(3)
      .toString("hex")
      .toUpperCase();
  } while (rooms.has(code));

  return code;
}

// No enviamos la respuesta correcta al navegador.
function publicChallenge(challenge) {
  if (!challenge) return null;

  return {
    id: challenge.id,
    playerId: challenge.playerId,
    question: challenge.question,
    options: [...challenge.options],
    difficulty: challenge.difficulty,
    points: challenge.points,
  };
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
          challenge: publicChallenge(room.game.challenge),
          trophyPrice: TROPHY_PRICE,
          trophiesToWin: TROPHIES_TO_WIN,
        }
      : null,
  };
}

function updateRoom(room) {
  io.to(room.code).emit(
    "room-updated",
    publicRoom(room)
  );
}

function getPlayerRoom(socket) {
  const room = rooms.get(socket.data.roomCode);

  if (!room) return null;

  if (!room.players.some((p) => p.id === socket.id)) {
    return null;
  }

  return room;
}

// ==========================================
// EFECTOS DE CASILLAS
// ==========================================

function getSpaceEffect(position, nickname) {
  if (position === TOTAL) {
    return {
      points: 20,
      message:
        `🏰 ${nickname} completó una vuelta por Hogwarts: +20 puntos.`,
    };
  }

  if (position % 7 === 0) {
    return {
      points: -10,
      message:
        `🕷️ ${nickname} cayó en una trampa: -10 puntos.`,
    };
  }

  if (position % 5 === 0) {
    return {
      points: 20,
      message:
        `⭐ ${nickname} encontró magia: +20 puntos.`,
    };
  }

  return {
    points: 0,
    message:
      `✨ ${nickname} llegó a la casilla ${position}.`,
  };
}

// ==========================================
// PREGUNTAS ALEATORIAS
// ==========================================

function chooseQuestion(game) {
  if (game.usedQuestions.length >= QUESTIONS.length) {
    game.usedQuestions = [];
  }

  const available = QUESTIONS
    .map((question, index) => ({
      question,
      index,
    }))
    .filter(
      ({ index }) => !game.usedQuestions.includes(index)
    );

  const selected = available[
    crypto.randomInt(0, available.length)
  ];

  game.usedQuestions.push(selected.index);

  return {
    ...selected.question,
    options: [...selected.question.options],
  };
}

function nextTurn(game) {
  game.turn =
    (game.turn + 1) % game.players.length;
}

// ==========================================
// CONEXIONES MULTIJUGADOR
// ==========================================

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

    if (
      room.status === "playing" ||
      room.status === "finished"
    ) {
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
      (p) =>
        p.id !== socket.id &&
        p.character?.id === character.id
    );

    if (occupied) {
      return callback?.({
        ok: false,
        error: "Ese personaje ya está ocupado.",
      });
    }

    const player = room.players.find(
      (p) => p.id === socket.id
    );

    player.character = {
      id: character.id,
      name: character.name,
      house: character.house,
      primary: character.primary,
      secondary: character.secondary,
      hair: character.hair,
      skin: character.skin,
      eyes: character.eyes,
      hairstyle: character.hairstyle,
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
        error:
          "Ambos jugadores deben elegir personaje.",
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

      message:
        `🎲 ¡Comienza la aventura! Turno de ${room.players[0].nickname}.`,

      rollNumber: 0,
      challenge: null,
      usedQuestions: [],
      nextChallengeId: 0,
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

    if (
      !room ||
      room.status !== "playing" ||
      !room.game
    ) {
      return callback?.({
        ok: false,
        error: "No hay una partida activa.",
      });
    }

    const game = room.game;

    if (game.challenge) {
      return callback?.({
        ok: false,
        error:
          "Primero deben resolver el reto mágico.",
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

    
    const previousPosition = player.position;

    // Acumulamos los pasos reales del dado.
    player.totalSteps = (player.totalSteps ?? 0) + result;

    // Calculamos la posición dentro de las 24 casillas.
    const destination =
      ((player.totalSteps - 1) % TOTAL) + 1;

    // Calculamos las vueltas completadas.
    const newLaps = Math.floor(
      player.totalSteps / TOTAL
    );

    const completedLap = newLaps > (player.laps ?? 0);

    player.position = destination;
    player.laps = newLaps;


    game.dice = result;
    game.rollNumber += 1;

    // PRIORIDAD:
    // 24 = vuelta completada
    // múltiplos de 7 = trampa
    // múltiplos de 5 = bonus
    // múltiplos de 3 = reto

    const isChallenge =
      destination !== TOTAL &&
      destination % 3 === 0 &&
      destination % 5 !== 0 &&
      destination % 7 !== 0;

    if (isChallenge) {
      const question = chooseQuestion(game);

      game.nextChallengeId += 1;

      game.challenge = {
        id: game.nextChallengeId,
        playerId: player.id,
        question: question.question,
        options: question.options,
        answer: question.answer,
        difficulty: question.difficulty,
        points: question.points,
      };

      game.message =
        `🪄 ${player.nickname} debe responder un reto de Harry Potter.`;

      // El turno se mantiene hasta responder.
      updateRoom(room);

      return callback?.({ ok: true });
    }

    const effect = getSpaceEffect(
      destination,
      player.nickname
    );

    const lapBonus =
      completedLap && destination !== TOTAL
        ? 20
        : 0;

    player.points = Math.max(
      0,
      player.points + effect.points + lapBonus
    );

    game.message = effect.message;

    if (lapBonus > 0) {
      game.message +=
        ` 🏰 ¡Vuelta completada! +20 puntos adicionales.`;
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

    if (
      !room ||
      room.status !== "playing" ||
      !room.game
    ) {
      return callback?.({
        ok: false,
        error: "No hay una partida activa.",
      });
    }

    const game = room.game;
    const challenge = game.challenge;

    if (!challenge) {
      return callback?.({
        ok: false,
        error: "No hay un reto pendiente.",
      });
    }

    if (challenge.playerId !== socket.id) {
      return callback?.({
        ok: false,
        error:
          "Este reto pertenece al otro jugador.",
      });
    }

    if (data?.challengeId !== challenge.id) {
      return callback?.({
        ok: false,
        error: "El reto ya cambió.",
      });
    }

    const answer = data?.answer;

    if (
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer >= challenge.options.length
    ) {
      return callback?.({
        ok: false,
        error: "Selecciona una respuesta válida.",
      });
    }

    const player = game.players[game.turn];

    if (player.id !== socket.id) {
      return callback?.({
        ok: false,
        error: "No es tu turno.",
      });
    }

    const correct =
      answer === challenge.answer;

    const earned =
      correct ? challenge.points : 0;

    player.points += earned;

    game.message = correct
      ? `✨ ¡${player.nickname} acertó! +${earned} puntos.`
      : `❌ ${player.nickname} falló el reto. La respuesta era: ${challenge.options[challenge.answer]}.`;

    game.challenge = null;

    nextTurn(game);

    updateRoom(room);

    callback?.({
      ok: true,
      correct,
      earned,
      correctAnswer: challenge.answer,
    });
  });

  // ========================================
  // COMPRAR TROFEO
  // ========================================

  socket.on("buy-trophy", (_data, callback) => {
    const room = getPlayerRoom(socket);

    if (
      !room ||
      room.status !== "playing" ||
      !room.game
    ) {
      return callback?.({
        ok: false,
        error: "No hay una partida activa.",
      });
    }

    const game = room.game;

    if (game.challenge) {
      return callback?.({
        ok: false,
        error:
          "Primero deben resolver el reto mágico.",
      });
    }

    const player = game.players.find(
      (p) => p.id === socket.id
    );

    if (!player) {
      return callback?.({
        ok: false,
        error: "Jugador no encontrado.",
      });
    }

    if (player.points < TROPHY_PRICE) {
      return callback?.({
        ok: false,
        error:
          `Necesitas ${TROPHY_PRICE} puntos para comprar un trofeo.`,
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
      game.winner = game.players.findIndex(
        (p) => p.id === socket.id
      );

      room.status = "finished";

      game.message =
        `🏆 ¡${player.nickname} consiguió 2 trofeos y ganó la Copa de Hogwarts!`;
    } else {
      game.message =
        `🏆 ${player.nickname} compró un trofeo. ¡Le falta uno para ganar!`;
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
        error:
          "No hay una partida para reiniciar.",
      });
    }

    if (room.players[0]?.id !== socket.id) {
      return callback?.({
        ok: false,
        error:
          "Solo el creador puede reiniciar.",
      });
    }

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
    room.game.nextChallengeId = 0;

    room.game.message =
      "✨ ¡Nueva aventura! Jugador 1, lanza el dado.";

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

    room.players = room.players.filter(
      (p) => p.id !== socket.id
    );

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

// ==========================================
// SERVIDOR HTTP
// ==========================================

app.get("/", (_req, res) => {
  res.send(
    "Servidor Hogwarts Party funcionando"
  );
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🏰 Servidor Hogwarts Party escuchando en puerto ${PORT}`);
});
