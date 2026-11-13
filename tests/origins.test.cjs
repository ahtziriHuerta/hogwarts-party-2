const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedOrigin } = require("../server/origins.cjs");

test("CORS acepta los sitios propios y sus enlaces de Netlify, incluido el que fallaba", () => {
  const origins = [
    "https://videojuego3d.netlify.app",
    "https://6af3ff7634aee8e9018e93ad--videojuego3d.netlify.app",
    "https://deploy-preview-1--videojuego3d.netlify.app",
    "https://codex-mobile-visual-improvements--videojuego3d.netlify.app",
    "https://regal-pothos-2022c1.netlify.app",
    "https://deploy-preview-1--regal-pothos-2022c1.netlify.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ];
  for (const origin of origins)
    assert.equal(isAllowedOrigin(origin), true, origin);
  assert.equal(isAllowedOrigin(undefined), true);
});

test("CORS rechaza otros proyectos, dominios parecidos y orígenes que no son HTTPS", () => {
  const origins = [
    "https://otro-juego.netlify.app",
    "https://deploy-preview-1--otro-juego.netlify.app",
    "https://videojuego3d-falso.netlify.app",
    "https://falso-videojuego3d.netlify.app",
    "https://videojuego3d.netlify.app.ejemplo.com",
    "https://videojuego3d.netlify.app@ejemplo.com",
    "https://ejemplo.com/?site=videojuego3d.netlify.app",
    "https://videojuego3d.netlify.app:8443",
    "http://videojuego3d.netlify.app",
    "https://videojuego3d.netlify.app/ruta",
    "null",
  ];
  for (const origin of origins)
    assert.equal(isAllowedOrigin(origin), false, origin);
});
