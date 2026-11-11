// Solo se precarga desde Playwright, con un trabajador y una sala por prueba.
// El recorrido cubre duelo, individual, bono, memoria y sorpresa sin depender del azar.
const crypto = require("node:crypto");
const randomInt = crypto.randomInt;
const randomBytes = crypto.randomBytes;
const route = [3, 3, 3, 2, 3, 6, 4, 1, 2];
let roll = 0;
crypto.randomBytes = (size, ...args) => {
  if (size === 3) roll = 0; // El código de una sala usa tres bytes.
  return randomBytes(size, ...args);
};
crypto.randomInt = (min, max, ...rest) =>
  min === 1 && max === 7
    ? (route[roll++] ?? 3)
    : min === 0 && max === 12
      ? 0
      : min === 0 && max === 11
        ? 9
        : randomInt(min, max, ...rest);
