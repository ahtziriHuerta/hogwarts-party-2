const crypto = require("node:crypto");

const ANSWER_MS = 20_000;
const RESULTS_MS = 5_000;
const MAX_SPEED_BONUS = 10;
const DUEL_PENALTY = 10;

// El servidor controla el plazo, las monedas y el avance del turno.
// El reloj inyectable permite probar vencimientos sin esperar tiempo real.
function createChallengeController({
  updateRoom,
  nextTurn,
  clock = {
    now: () => Date.now(),
    schedule: (callback, delay) => setTimeout(callback, delay),
    cancel: (timer) => clearTimeout(timer),
  },
}) {
  function clearTimer(room) {
    if (room.challengeTimer != null) clock.cancel(room.challengeTimer);
    room.challengeTimer = null;
  }

  function cancel(room) {
    clearTimer(room);
    if (room.game) room.game.challenge = null;
  }

  function schedule(room, challenge, delay, callback) {
    clearTimer(room);
    const game = room.game;
    room.challengeTimer = clock.schedule(
      () => {
        // Un temporizador antiguo nunca debe afectar otra partida o sala.
        if (
          room.status !== "playing" ||
          room.game !== game ||
          game.challenge !== challenge
        )
          return;
        callback();
      },
      Math.max(0, delay),
    );
    room.challengeTimer?.unref?.();
  }

  function finish(room) {
    clearTimer(room);
    room.game.challenge = null;
    nextTurn(room.game);
    room.game.message = `🎲 Reto terminado. Turno de ${room.game.players[room.game.turn].nickname}.`;
    updateRoom(room);
  }

  function reveal(room) {
    const game = room.game;
    const challenge = game?.challenge;
    if (!challenge || challenge.phase !== "answering") return;
    clearTimer(room);
    challenge.phase = "results";
    challenge.revealUntil = clock.now() + RESULTS_MS;
    challenge.results = game.players
      .filter((player) => challenge.participantIds.includes(player.id))
      .map((player) => {
        const response = challenge.responses.get(player.id);
        const correct = response?.answer === challenge.answer;
        const speedBonus = correct
          ? Math.round(
              challenge.maxSpeedBonus *
                Math.max(
                  0,
                  Math.min(
                    1,
                    (challenge.deadlineAt - response.answeredAt) / ANSWER_MS,
                  ),
                ),
            )
          : 0;
        // Solo el duelo arriesga monedas; el descuento real nunca supera el saldo.
        const penalty = correct
          ? 0
          : Math.min(challenge.wrongPenalty, player.points);
        const earned = correct
          ? challenge.points + speedBonus
          : penalty > 0
            ? -penalty
            : 0;
        player.points += earned;
        return {
          playerId: player.id,
          nickname: player.nickname,
          answer: response?.answer ?? null,
          correct,
          timedOut: !response,
          basePoints: correct ? challenge.points : 0,
          speedBonus,
          penalty,
          earned,
        };
      });
    game.message = "✨ Reto terminado. ¡Mira los resultados!";
    schedule(room, challenge, RESULTS_MS, () => finish(room));
    updateRoom(room);
  }

  function expire(room, challenge) {
    // Comprobar la hora real también cubre un temporizador que se adelante.
    const remaining = challenge.deadlineAt - clock.now();
    if (remaining > 0)
      return schedule(room, challenge, remaining, () =>
        expire(room, challenge),
      );
    reveal(room);
  }

  function start(room, question, mode = "duel") {
    cancel(room);
    const startedAt = clock.now();
    const challenge = {
      ...question,
      options: [...question.options],
      id: crypto.randomUUID(),
      phase: "answering",
      mode,
      playerName: room.game.players[room.game.turn].nickname,
      participantIds:
        mode === "solo"
          ? [room.game.players[room.game.turn].id]
          : room.game.players.map((player) => player.id),
      wrongPenalty: mode === "duel" ? DUEL_PENALTY : 0,
      maxSpeedBonus: mode === "duel" ? MAX_SPEED_BONUS : 0,
      responses: new Map(),
      startedAt,
      deadlineAt: startedAt + ANSWER_MS,
      durationMs: ANSWER_MS,
    };
    room.game.challenge = challenge;
    room.game.message =
      mode === "solo"
        ? `🪄 Reto individual de ${challenge.playerName}: acertar suma, fallar no resta.`
        : "⚡ Duelo: ambos responden. Fallar o dejar pasar el tiempo resta 10 monedas.";
    schedule(room, challenge, ANSWER_MS, () => expire(room, challenge));
    updateRoom(room);
  }

  function answer(room, playerId, data) {
    const challenge = room.game?.challenge;
    if (!challenge) return { ok: false, error: "No hay un reto pendiente." };
    if (data?.challengeId !== challenge.id)
      return { ok: false, error: "El reto ya cambió." };
    if (challenge.phase !== "answering")
      return { ok: false, error: "El reto ya terminó." };
    const receivedAt = clock.now();
    if (receivedAt >= challenge.deadlineAt) {
      reveal(room);
      return { ok: false, error: "Se acabó el tiempo." };
    }
    if (!challenge.participantIds.includes(playerId))
      return { ok: false, error: "No participas en este reto." };
    if (challenge.responses.has(playerId))
      return { ok: false, error: "Ya enviaste tu respuesta." };
    if (
      !Number.isInteger(data?.answer) ||
      data.answer < 0 ||
      data.answer >= challenge.options.length
    ) {
      return { ok: false, error: "Selecciona una respuesta válida." };
    }
    challenge.responses.set(playerId, {
      answer: data.answer,
      answeredAt: receivedAt,
    });
    if (challenge.responses.size === challenge.participantIds.length)
      reveal(room);
    else updateRoom(room);
    // No revelar acierto ni puntuación mientras el otro jugador todavía puede responder.
    return { ok: true };
  }

  function publicChallenge(challenge) {
    if (!challenge) return null;
    const visible = {
      id: challenge.id,
      phase: challenge.phase,
      question: challenge.question,
      options: [...challenge.options],
      category: challenge.category,
      kind: challenge.kind,
      difficulty: challenge.difficulty,
      points: challenge.points,
      mode: challenge.mode,
      playerName: challenge.playerName,
      participantIds: [...challenge.participantIds],
      wrongPenalty: challenge.wrongPenalty,
      maxSpeedBonus: challenge.maxSpeedBonus,
      deadlineAt: challenge.deadlineAt,
      durationMs: challenge.durationMs,
      serverNow: clock.now(),
      participantCount: challenge.participantIds.length,
      answeredPlayerIds: [...challenge.responses.keys()],
    };
    if (challenge.phase === "results") {
      visible.correctAnswer = challenge.answer;
      visible.results = challenge.results.map((result) => ({ ...result }));
      visible.revealUntil = challenge.revealUntil;
    }
    return visible;
  }

  return { start, answer, cancel, publicChallenge };
}

module.exports = { createChallengeController };
