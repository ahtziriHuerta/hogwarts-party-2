const catalog = require("../shared/spells.json");

function buySpell(game, playerId, spellId) {
  if (game.winner !== null || game.challenge)
    return {
      ok: false,
      error: "Compra entre retos, antes de que termine la partida.",
    };
  const item = catalog.items.find((spell) => spell.id === spellId);
  const player = game.players.find((entry) => entry.id === playerId);
  if (!item || !player) return { ok: false, error: "Compra no válida." };
  if (player.inventory.length >= catalog.inventoryLimit)
    return { ok: false, error: "Tu inventario ya tiene dos hechizos." };
  if (player.points < item.cost)
    return { ok: false, error: `Necesitas ${item.cost} monedas.` };
  player.points -= item.cost;
  player.inventory.push(item.id);
  return { ok: true };
}

module.exports = { catalog, buySpell };
