const SURPRISES = [
  {
    title: "Bolsa olvidada",
    description: "Encontraste una bolsa: +20 monedas.",
    effect: "gain",
    amount: 20,
  },
  {
    title: "Felix Felicis",
    description: "La suerte líquida te acompaña: +30 monedas.",
    effect: "gain",
    amount: 30,
  },
  {
    title: "Poción derramada",
    description: "Una poción salió mal: pierdes hasta 10 monedas.",
    effect: "lose",
    amount: 10,
  },
  {
    title: "Escarbato travieso",
    description: "Tu escarbato toma hasta 10 monedas del rival.",
    effect: "steal",
    amount: 10,
  },
  {
    title: "Regalo compartido",
    description: "¡Una celebración! Cada jugador recibe 10 monedas.",
    effect: "shared",
    amount: 10,
  },
  {
    title: "Beca de Hogwarts",
    description: "Una ayuda para tu aventura: +15 monedas.",
    effect: "gain",
    amount: 15,
  },
];

// Solo recibe un índice elegido en el servidor. El cliente no decide el premio.
function applySurprise(game, index) {
  const card = SURPRISES[index];
  if (!card) throw new RangeError("Carta sorpresa no válida.");
  const actor = game.players[game.turn];
  const rival = game.players[(game.turn + 1) % game.players.length];
  const before = new Map(
    game.players.map((player) => [player.id, player.points]),
  );
  let affected = [actor];
  if (card.effect === "gain") actor.points += card.amount;
  if (card.effect === "lose")
    actor.points = Math.max(0, actor.points - card.amount);
  if (card.effect === "steal") {
    const amount = Math.min(card.amount, rival.points);
    rival.points -= amount;
    actor.points += amount;
    affected = [actor, rival];
  }
  if (card.effect === "shared") {
    game.players.forEach((player) => {
      player.points += card.amount;
    });
    affected = game.players;
  }
  return {
    title: card.title,
    description: card.description,
    results: affected.map((player) => ({
      playerId: player.id,
      nickname: player.nickname,
      earned: player.points - before.get(player.id),
    })),
  };
}
module.exports = { SURPRISES, applySurprise };
