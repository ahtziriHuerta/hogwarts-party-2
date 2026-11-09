# Hogwarts Party

Juego por turnos para dos personas, con React, Vite y Socket.IO.

## Ejecutar en local

Requiere Node.js 22.12 o posterior (recomendado Node.js 24).

```sh
npm ci
npm run server
```

En otra terminal:

```sh
npm run dev -- --host 0.0.0.0
```

Abre la dirección de Vite. Crea una sala, comparte el código y elige personajes
con un segundo navegador o dispositivo. El creador inicia la partida.

Para jugar desde un celular en la misma red, configura `VITE_SERVER_URL` en
un archivo `.env` con la IP de tu computadora, por ejemplo
`http://192.168.1.10:3001`, y reinicia Vite. Añade el origen del frontend
(por ejemplo `http://192.168.1.10:5173`) a `cors.origin` en `server/index.cjs`.

## Publicar

Configura `VITE_SERVER_URL` con la URL HTTPS de tu servidor **antes** de ejecutar
`npm run build`. Publica `dist/` como sitio estático y ejecuta `npm run server`
en un servicio compatible con Node.js y WebSockets. El servidor admite `PORT`.
Actualiza `cors.origin` con el dominio del frontend. `.env.example` muestra
la configuración local; no guardes secretos en variables `VITE_`, son públicas.

Las salas viven en memoria de un solo proceso. Reiniciar el servidor o perder
la conexión de un jugador devuelve la sala al estado de espera; no hay guardado
de partidas ni recuperación de sesión.

## Reglas

- Dos jugadores eligen personajes distintos y lanzan un dado por turnos.
- Magia: +20 puntos. Trampa: −10, sin bajar de cero.
- Los retos otorgan 10, 20 o 30 puntos al acertar y mantienen el turno hasta responder.
- Completar una vuelta otorga +20 puntos, también al aterrizar en un reto.
- Cada trofeo cuesta 100 puntos. Gana quien compre dos.

## Comprobar cambios

```sh
npm test
npm run lint
npm run build
```

## Organización

- `src/App.jsx`: navegación, conexión y acciones de sala.
- `src/RoomLobby.jsx`: jugadores y código compartido.
- `src/CharacterSelection.jsx`: selección del catálogo compartido.
- `src/MagicBoard.jsx`: tablero, fichas animadas y retos.
- `src/App.css`: diseño general y pantallas de entrada.
- `src/MagicBoard.css`: tablero y adaptación a pantallas pequeñas.
- `shared/characters.json`: catálogo único para navegador y servidor.
- `server/index.cjs`: salas, turnos, puntuación y validación de acciones.

Los estilos usan el ancho disponible y permiten desplazamiento vertical, incluso
en horizontal. Los controles táctiles miden al menos 48 píxeles y se respeta la
preferencia del sistema para reducir animaciones.
