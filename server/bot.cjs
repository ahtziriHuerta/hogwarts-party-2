const crypto = require("node:crypto");

// Probabilidades y pausas acotadas: incluso el experto puede fallar.
const LEVELS = {
  apprentice: { accuracy: 45, minMs: 6000, maxMs: 9500 },
  wizard: { accuracy: 65, minMs: 3500, maxMs: 6500 },
  expert: { accuracy: 82, minMs: 2000, maxMs: 4000 },
};

function createBotController({
  rollDice,
  buyTrophy,
  buySpell,
  challenges,
  randomInt = (min, max) => crypto.randomInt(min, max),
  clock = {
    now: () => Date.now(),
    schedule: (callback, delay) => setTimeout(callback, delay),
    cancel: (timer) => clearTimeout(timer),
  },
}) {
  function cancel(room) {
    if (room.botAction) clock.cancel(room.botAction.timer);
    room.botAction = null;
  }

  function answer(room, bot, challenge, level) {
    let hidden = [];
    const spellId =
      challenge.options.length === 4 && bot.inventory.includes("hint")
        ? "hint"
        : challenge.mode === "duel" && bot.inventory.includes("shield")
          ? "shield"
          : null;
    if (spellId) {
      const effect = challenges.useSpell(room, bot.id, {
        challengeId: challenge.id,
        spellId,
      });
      if (effect.ok) hidden = effect.hiddenOptions ?? [];
    }
    const correct =
      randomInt(0, 100) <
      Math.min(95, level.accuracy + (hidden.length ? 12 : 0));
    const wrong = challenge.options
      .map((_, index) => index)
      .filter((index) => index !== challenge.answer && !hidden.includes(index));
    challenges.answer(room, bot.id, {
      challengeId: challenge.id,
      answer: correct ? challenge.answer : wrong[randomInt(0, wrong.length)],
    });
  }

  function plan(room, bot) {
    const { game } = room;
    const challenge = game.challenge;
    if (!challenge) {
      if (game.players[game.turn]?.id !== bot.id) return null;
      return {
        key: `turn:${game.rollNumber}`,
        delay: 1800,
        run: () => {
          // Ahorrar para los trofeos tiene prioridad; no gastar las últimas monedas.
          if (bot.points >= 100) buyTrophy(room, bot.id);
          if (room.status !== "playing") return;
          if (bot.points >= 45 && bot.inventory.length < 2) {
            const spellId = bot.inventory.includes("hint") ? "shield" : "hint";
            buySpell(game, bot.id, spellId);
          }
          rollDice(room, bot.id);
        },
      };
    }
    if (!challenge.participantIds.includes(bot.id)) return null;
    const data = { challengeId: challenge.id };
    if (challenge.phase === "loading" && !challenge.readyPlayerIds.has(bot.id))
      return {
        key: `${challenge.id}:ready`,
        delay: 250,
        run: () =>
          challenges.mediaStatus(room, bot.id, { ...data, status: "ready" }),
      };
    if (
      challenge.phase === "watching" &&
      !challenge.viewedPlayerIds.has(bot.id)
    )
      return {
        key: `${challenge.id}:viewed`,
        delay:
          Math.max(
            0,
            challenge.watchStartedAt +
              challenge.media.durationSeconds * 1000 -
              clock.now(),
          ) + 250,
        run: () =>
          challenges.mediaStatus(room, bot.id, { ...data, status: "viewed" }),
      };
    if (challenge.phase === "answering" && !challenge.responses.has(bot.id)) {
      const level = LEVELS[room.difficulty];
      return {
        key: `${challenge.id}:answer`,
        delay: randomInt(level.minMs, level.maxMs + 1),
        run: () => answer(room, bot, challenge, level),
      };
    }
    return null;
  }

  function sync(room) {
    const bot = room.game?.players.find((player) => player.isBot);
    if (
      room.mode !== "solo" ||
      room.status !== "playing" ||
      !bot ||
      room.game.winner !== null
    ) {
      cancel(room);
      return;
    }
    const next = plan(room, bot);
    if (next && room.botAction?.key === next.key) return;
    cancel(room);
    if (!next) return;
    const game = room.game;
    const action = { key: next.key, timer: null };
    room.botAction = action;
    action.timer = clock.schedule(() => {
      // Ni un reinicio ni una sala eliminada pueden ejecutar trabajo anterior.
      if (
        room.botAction !== action ||
        room.game !== game ||
        room.status !== "playing"
      )
        return;
      room.botAction = null;
      next.run();
    }, next.delay);
    action.timer?.unref?.();
  }

  return { sync, cancel };
}

module.exports = { createBotController };
