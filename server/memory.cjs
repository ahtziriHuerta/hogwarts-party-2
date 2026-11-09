const crypto = require("node:crypto");
const SYMBOLS = [
  { icon: "🦉", name: "Búho" },
  { icon: "🧹", name: "Escoba" },
  { icon: "🪄", name: "Varita" },
  { icon: "📚", name: "Libros" },
  { icon: "🕯️", name: "Vela" },
  { icon: "🧪", name: "Poción" },
  { icon: "🗝️", name: "Llave" },
  { icon: "🐉", name: "Dragón" },
];
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function createMemoryQuestion() {
  const sequence = shuffle(SYMBOLS).slice(0, 5);
  const target = crypto.randomInt(0, sequence.length);
  const correct = sequence[target];
  const options = shuffle([
    correct,
    ...shuffle(SYMBOLS.filter((symbol) => symbol.name !== correct.name)).slice(
      0,
      3,
    ),
  ]);
  return {
    kind: "memory",
    category: "Memoria",
    difficulty: "Observación",
    points: 25,
    memorySequence: sequence.map((symbol) => ({ ...symbol })),
    question: `¿Qué símbolo ocupaba la posición ${target + 1}?`,
    options: options.map((symbol) => `${symbol.icon} ${symbol.name}`),
    answer: options.findIndex((symbol) => symbol.name === correct.name),
  };
}
module.exports = { createMemoryQuestion };
