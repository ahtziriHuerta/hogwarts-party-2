// Solo se precarga desde Playwright: el primer lanzamiento siempre llega a un reto.
// El servidor normal conserva crypto.randomInt para el dado y las preguntas.
const crypto = require("node:crypto");
const randomInt = crypto.randomInt;
crypto.randomInt = (min, max, ...rest) =>
  min === 1 && max === 7 ? 3 : randomInt(min, max, ...rest);
