const LOCAL_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

// Netlify usa -- delante del nombre del sitio para previews, ramas y permalinks.
// Aceptamos esas variantes solo para estos proyectos, nunca para todo netlify.app.
const NETLIFY_ORIGIN =
  /^https:\/\/(?:[a-z0-9-]+--)?(?:videojuego3d|regal-pothos-2022c1)\.netlify\.app$/;

function isAllowedOrigin(origin) {
  return (
    origin == null || LOCAL_ORIGINS.has(origin) || NETLIFY_ORIGIN.test(origin)
  );
}

module.exports = { isAllowedOrigin };
