# Hogwarts Party

Juego por turnos para una persona contra un rival automático o para dos personas,
con React, Vite y Socket.IO.

## Entrega académica: Fase 3

La documentación de la conexión en red está en [docs/fase-3](docs/fase-3/README.md).
Incluye el [informe final sin portada](docs/fase-3/INFORME_FINAL.md),
el [protocolo y guía del código](docs/fase-3/PROTOCOLO.md),
el [guion para la exposición](docs/fase-3/GUION_PRESENTACION.md),
los [resultados comprobados](docs/fase-3/evidencias/resultados.json) y las versiones
exportadas para entregar. La demostración de red debe utilizar dos clientes humanos;
el modo individual es adicional.

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

Abre la dirección de Vite. Pulsa **Jugar solo**, elige dificultad y personaje e
inicia la aventura. Para jugar con otra persona, crea una sala, comparte el código
y elige personajes con un segundo navegador o dispositivo. El creador inicia.

Para jugar desde un celular en la misma red, configura `VITE_SERVER_URL` en
un archivo `.env` con la IP de tu computadora, por ejemplo
`http://192.168.1.10:3001`, y reinicia Vite. Añade el origen del frontend
(por ejemplo `http://192.168.1.10:5173`) a `LOCAL_ORIGINS` en `server/origins.cjs`.

## Publicar

Configura `VITE_SERVER_URL` con la URL HTTPS de tu servidor **antes** de ejecutar
`npm run build`. Publica `dist/` como sitio estático y ejecuta `npm run server`
en un servicio compatible con Node.js y WebSockets. El servidor admite `PORT`.
Configura los dominios permitidos en `server/origins.cjs`. `.env.example` muestra
la configuración local; no guardes secretos en variables `VITE_`, son públicas.

`server/origins.cjs` admite `videojuego3d.netlify.app`, el nombre anterior
`regal-pothos-2022c1.netlify.app` y los enlaces de publicación, rama y vista previa
de ambos proyectos. Otros sitios de Netlify no tienen permiso. Si cambias el
nombre del proyecto, actualiza esta lista y vuelve a publicar el servidor en Render.
Un frontend que carga y muestra «No se pudo conectar» puede estar usando un
dominio que todavía no figura en los permisos del servidor.

En Render gratuito, el primer acceso puede tardar más de un minuto mientras
despierta la instancia. Crear, unirse y jugar solo esperan hasta **90 segundos**
para conectar, mantienen los reintentos de Socket.IO y muestran un aviso de espera
tras ocho segundos o un fallo inicial de transporte. Después de conectar se envía
una sola solicitud, con 15 segundos para su acuse. **Cancelar** vuelve al inicio
y evita que un intento anterior cree una sala o cambie la pantalla más tarde.
El cliente permite también probar el otro transporte si falla el primero.

Las salas viven en memoria de un solo proceso. Al desconectar, una sala compartida
vuelve a esperar jugadores y una individual se elimina junto con sus temporizadores.
Reiniciar el servidor elimina las partidas; no hay guardado ni recuperación de sesión.

## Jugar solo

En el inicio, **Jugar solo** pide nombre y dificultad. Los ocho personajes están
disponibles: el rival elige otro automáticamente, incluso si cambias tu selección.
La sala individual es privada y no se comparte un código para invitar personas.

| Dificultad | Acierto base del rival | Tiempo para responder |
| ---------- | ---------------------- | --------------------- |
| Aprendiz   | 45 %                   | 6–9,5 segundos        |
| Mago       | 65 %                   | 3,5–6,5 segundos      |
| Experto    | 82 %                   | 2–4 segundos          |

Son probabilidades programadas, no un servicio de IA. El bot puede equivocarse,
usa el mismo dado aleatorio, recibe las mismas penalizaciones y necesita dos
trofeos de 100 monedas para ganar. Su turno empieza tras una pausa de 1,8 segundos.
Compra primero un trofeo si puede y después un hechizo si le quedan al menos
45 monedas y espacio. Activa como máximo un hechizo por reto; una pista mejora
su probabilidad de acierto en 12 puntos, hasta un máximo del 95 %.

El rival espera la observación de memoria y la duración de los clips. En duelos
visuales, los veinte segundos comienzan cuando el humano también termina de cargar
o ver el recurso. En actividades exclusivas del bot, el observador no bloquea su
avance. Las respuestas y pistas privadas nunca se incluyen en el estado compartido.

Salir, reiniciar o terminar cancela los turnos y respuestas pendientes. Se mantiene
la conexión con Render: el modo individual no funciona sin conexión. No se añaden
dependencias, descargas de medios ni servicios externos para automatizar al rival.

## Reglas

- Dos participantes (dos personas o una persona y el bot) eligen personajes
  distintos y lanzan un dado por turnos.
- **36 casillas**, con 28 actividades: 8 individuales 🪄, 8 duelos ⚡,
  6 retos de memoria 🧠 y 6 cartas sorpresa 🎁.
- Individuales y duelos tienen 20 segundos para responder y 5 de resultados.

| Casilla       | Quién responde                    | Acierto                                   | Fallo o tiempo agotado                     |
| ------------- | --------------------------------- | ----------------------------------------- | ------------------------------------------ |
| 🪄 Individual | Solo quien cayó; el rival observa | +10, +20 o +30 monedas                    | 0, sin descuento                           |
| ⚡ Duelo      | Ambos, a la vez                   | +10, +20 o +30, más hasta +10 por rapidez | −10 monedas para quien falle o no responda |
| 🧠 Memoria    | Solo quien cayó; el rival observa | +25 monedas                               | 0, sin descuento                           |

En memoria aparecen cinco símbolos durante 5 segundos. Después desaparecen y
se pregunta cuál ocupaba una posición, con cuatro opciones y 20 segundos para
responder. La pregunta se envía cuando termina la observación; las respuestas
anticipadas se rechazan. Los resultados duran 5 segundos.

Las cartas sorpresa se resuelven al caer y se muestran a ambos durante 5 segundos:
premios de +15, +20 o +30, pérdida de hasta 10, tomar hasta 10 del rival o regalar
10 a cada jugador. El resultado muestra el cambio real de cada saldo y después
avanza el turno. El servidor elige la carta y aplica su efecto una sola vez.

El saldo nunca baja de cero: con 7 monedas, la penalización descuenta 7.
Cada jugador solo puede enviar una respuesta. Las soluciones permanecen ocultas
hasta que respondan todos los participantes o venza el plazo. Después avanza el
turno automáticamente. El observador de un reto individual no recibe premios
ni descuentos.

Hay además 4 casillas de bono (+20), 2 trampas (−10), 1 casilla normal y 1 castillo.
Completar una vuelta otorga +20, también al caer en una actividad. Estos bonos y
los retos individuales permiten recuperar saldo tras un duelo. Cada trofeo
cuesta 100 monedas; gana quien compre dos.

### Tienda e inventario

Abre **Tienda** entre actividades para comprar trofeos o preparar hasta dos
hechizos. Cualquier jugador puede comprar entre retos, aunque no le toque lanzar.
Cada hechizo ocupa un espacio; se permiten dos iguales.

| Hechizo | Precio     | Efecto                                                                                                                                                     |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escudo  | 5 monedas  | Actívalo antes de responder un duelo: evita la penalización de ese reto si fallas o vence el tiempo. No protege trampas ni sorpresas.                      |
| Pista   | 10 monedas | Descarta dos opciones incorrectas solo para ti; requiere una pregunta de cuatro opciones. Sirve en trivias, imágenes, clips y memoria después de observar. |

Cada participante puede activar **un hechizo por reto**, antes de responder y
dentro del plazo. Se consume al activarlo, incluso si aciertas. El servidor
comprueba inventario, precio, saldo y permisos; el cliente no decide descuentos.
La pista viaja solo en el acuse privado de quien la usa. Reintentar la misma
activación recupera su efecto sin consumir otro objeto. El escudo y la pista no
alteran el reloj ni los premios normales por acertar. Reiniciar vacía el inventario.

Los botones dorados **Usar escudo** y **Usar pista** aparecen **encima de las
respuestas**, en **Tus hechizos**. Si ya respondiste, siguen visibles pero
desactivados. El escudo indica «Solo duelos» en individuales y la pista indica
«4 opciones» en verdadero/falso. Al observar al rival o preparar memoria y medios,
se aclara que los objetos siguen guardados. El tablero muestra los nombres del
inventario y la tienda explica cómo activarlos tras la compra. Los trofeos cuentan
automáticamente y no tienen botón de activación.

La tienda comparte el espacio del botón de compra anterior y se cierra si el
rival inicia una actividad. Los trofeos se compran dentro de ella y no ocupan
inventario. No hay archivos multimedia, servicios ni dependencias adicionales.
El cliente muestra esta tienda cuando el servidor anuncia `game.spellShop`;
si Render aún ejecuta una versión anterior, conserva la compra directa de trofeos.

El banco mantiene 60 preguntas: 50 de cuatro opciones y 10 de verdadero/falso,
por categorías, sin repetición hasta agotarse. Las opciones se barajan.

### Retos visuales ligeros

Cada tercera pregunta individual o de duelo usa el catálogo visual: 10
ilustraciones originales y 2 clips animados de 6 segundos, sin sonido ni
reproducción automática. Los recursos visuales también se eligen sin repetir
hasta agotar su catálogo. No se añaden casillas al tablero.

El paquete completo pesa **36.734 bytes (menos de 40 KB)**. Cada navegador
descarga únicamente el recurso del reto activo desde `public/quiz-media/`, que
Vite copia a `dist/quiz-media/`. No hay reproductores externos ni descargas de
todo el catálogo al abrir el juego. Render solo envía las preguntas y sincroniza
los estados; Netlify sirve las imágenes y los clips como archivos estáticos.

El servidor espera a que los participantes carguen la imagen, o terminen de ver
el clip, antes de dar los 20 segundos completos para responder. En un individual,
el observador no bloquea la carga. Los clips se reproducen tocando **Ver clip**;
la pregunta permanece oculta hasta que terminen los participantes. Las imágenes
siguen visibles al responder. Se conservan los premios y penalizaciones del modo.

Si falla un archivo, pasan 10 segundos de carga o se agotan 20 segundos para ver
el clip, se sustituye por una trivia de texto. La sustitución no descuenta monedas
ni cambia el turno; responder esa trivia mantiene las reglas de individual o duelo.
Reiniciar o desconectar cancela también estas esperas.

Para publicar esta ampliación, Netlify y Render deben usar la misma versión del
código. Conserva `npm run build` y `dist` en Netlify, y `npm run server` en Render.
Tras actualizar ambos, recarga la página y crea una sala nueva. No se necesita
instalar herramientas de video en ninguno de los dos servicios.

`scripts/build-quiz-media.mjs` permite regenerar los recursos de forma opcional.
Solo para ese script se necesitan ffmpeg y el Chromium de Playwright. Los archivos
ya generados están incluidos en el repositorio; las pruebas vigilan un presupuesto
de 50 KB para el catálogo completo.

## Comprobar cambios

```sh
npm test
npm run lint
npm run build
```

## Organización

- `src/App.jsx`: navegación, conexión y acciones de sala.
- `src/socket.js`, `src/roomConnection.js`: transportes, espera y cancelación al entrar a una sala.
- `src/RoomLobby.jsx`: jugadores y código compartido.
- `src/CharacterSelection.jsx`: selección del catálogo compartido.
- `src/MagicBoard.jsx`: tablero, fichas animadas y acciones.
- `src/BoardScenery.jsx`: mapa ilustrado con castillo, bosque, lago y puente, en SVG local.
- `src/BoardIcon.jsx`: símbolos vectoriales de casillas y controles.
- `src/LightningChallenge.jsx`: reloj, respuestas simultáneas y resultados.
- `src/ChallengeMedia.jsx`: carga de un solo recurso, reproducción manual y avisos al servidor.
- `src/SpellShop.jsx`, `src/ChallengeSpells.jsx`: compra, inventario y activación de hechizos.
- `src/App.css`: diseño general y pantallas de entrada.
- `src/MagicBoard.css`: tablero y adaptación a pantallas pequeñas.
- `shared/characters.json`: catálogo único para navegador y servidor.
- `shared/board.json`: mapa único de las casillas y tipos para navegador y servidor.
- `shared/board-layout.js`: recorrido serpenteante generado a partir del número de casillas.
- `shared/spells.json`, `shared/bot-levels.json`: catálogo de hechizos y dificultades.
- `server/index.cjs`: salas, turnos, puntuación y validación de acciones.
- `server/origins.cjs`: dominios de Netlify y direcciones locales permitidos para la conexión.
- `server/challenges.cjs`: plazos, respuestas privadas y puntuación de los retos.
- `server/bot.cjs`, `server/spells.cjs`: acciones automáticas del rival y compras verificadas.
- `server/questions.json`: banco de preguntas y soluciones, usado por el servidor.
- `server/media-questions.json`: preguntas visuales y rutas de los archivos, con soluciones privadas.
- `server/memory.cjs`: secuencias y preguntas de memoria aleatorias.
- `server/surprises.cjs`: cartas sorpresa y cambios de saldo.

En celular horizontal, el inicio, crear/unirse a sala, la espera y la selección
de personajes caben cada uno en una sola pantalla. Inicio y formularios usan
dos columnas; la sala coloca el código junto a los jugadores y reserva una fila
para elegir personaje e iniciar. **Cómo jugar** abre una guía sin alargar el inicio.
El tablero, ambos marcadores, el dado y la compra de trofeos también comparten
una sola pantalla. La altura se adapta al espacio útil del
navegador con `100dvh` y respeta las zonas seguras de la pantalla. El botón
**Opciones** abre las reglas y el reinicio.
Los controles de la partida tienen al menos 44 píxeles de alto y se respeta la
preferencia del sistema para reducir animaciones.

En celular vertical, la barra coloca el título y el turno junto al dado y los
botones de salir y opciones, sin partir el nombre del juego. Los jugadores usan
tarjetas compactas y el mapa se reorganiza en **9 columnas y 4 filas**, con
casillas más grandes. El dado y la tienda comparten una fila bajo el mapa;
las reglas se consultan en Opciones. Girar el celular conserva la casilla, el
movimiento y la respuesta que ya se envió. Las vistas habituales caben en una
pantalla desde 320×568; con poco espacio adicional o texto ampliado se permite
desplazamiento vertical. Los retos y resultados también se ajustan a ese ancho.

El tablero tiene un estilo de atlas nocturno: marco dorado, curvas de nivel,
Hogwarts con ventanas encendidas, bosque, lago y un sendero ondulado. Las casillas
son medallones con un símbolo distinto por actividad y la casilla del jugador
en turno se resalta. Las ilustraciones son decorativas y se dibujan con SVG local,
sin descargas ni bibliotecas adicionales. Los detalles se ajustan al espacio;
en pantallas muy bajas se ocultan los nombres de los lugares para mantener
legibles los números. En computadora horizontal, el tablero también ocupa una
sola pantalla. Los marcadores usan el color del personaje y la tienda muestra el
avance hacia las monedas necesarias para el siguiente trofeo.

Los ocho personajes tienen siluetas de cabello distintas: corto en puntas,
ondulado, flequillo de lado, largo, rizado, trenzas, coleta y afro. La misma
apariencia se usa en la selección, los marcadores y las fichas.

## Pruebas de pantalla y personajes

```sh
npx playwright install chromium
npm run test:ui
```

Estas pruebas arrancan el frontend en el puerto 5174 y el servidor en 3002;
deben estar disponibles. Las 38 pruebas comprueban inicio, guía, formularios,
sala de espera/lista, partida, errores, victoria, opciones y preguntas sin
desplazamiento en 568×320, 667×375, 740×280, 844×390 y 932×430. Incluyen nombres
de 20 caracteres, código inexistente y éxito/fallo del permiso para copiar.
También revisan que los ocho personajes y el botón de confirmación quepan en
la selección, que los peinados tengan geometría distinta y que las trenzas y la
coleta se conserven al iniciar una sala real de dos jugadores. Los retos de cuatro
opciones, verdadero/falso, individuales, vista del observador, memoria, cartas
sorpresa y resultados se revisan en los cinco tamaños, junto con las 36 casillas
y las fichas en el final del recorrido.

La prueba usa dos navegadores y espera el plazo real de 20 segundos:
comprueba respuestas ocultas, bloqueo después de responder, saldos sincronizados,
penalización de duelo, avance automático y un reto individual donde el rival no
puede responder y fallar no cambia ningún saldo. También memoriza una secuencia,
responde al desaparecer los símbolos y verifica el premio de +25 y una carta
sorpresa en ambos navegadores. En un duelo con clip, un jugador termina primero
y espera al otro: ambos reciben después los 20 segundos completos, con saldos
sincronizados al responder. Solo para estas pruebas, el dado sigue una ruta
determinista mediante `tests/fixtures/fixed-dice.cjs`, precargado por Playwright;
el servidor normal mantiene su dado aleatorio.

Las pruebas visuales también reproducen los dos MP4 reales, comprueban que no
arranquen solos ni descarguen todo el catálogo, simulan una imagen lenta y un
archivo bloqueado y revisan la imagen, el video y la trivia de respaldo en los
cinco tamaños horizontales.

Cinco pruebas adicionales comprueban la partida vertical en 320×568, 360×640,
390×700, 412×823 y 430×932: título en una línea, nombres largos, turno propio o
del rival, salida, guía, fichas al inicio y final, victoria, trivias, memoria y
sorpresas. Las imágenes y los clips también se revisan en vertical. Una sala
real de dos jugadores comprueba que girar durante el movimiento y después de
responder conserve la posición y la respuesta enviada.

La tienda y sus dos espacios se comprueban en vertical y horizontal, también
con poco saldo o inventario lleno. Una sala real verifica compras, pista privada,
escudo, giro del dispositivo, saldos sincronizados y cierre de la tienda al lanzar
el rival. Los botones conservan al menos 44 píxeles de altura.

El modo individual añade cinco recorridos completos de inicio, dificultad,
personajes y tablero, en vertical y horizontal, desde 320×568 y 740×280. Una
partida real de un solo navegador comprueba respuestas y lanzamientos automáticos,
tienda, pistas en imágenes, giro del dispositivo, reinicio y salida.

Tres pruebas de conexión bloquean el servidor durante 55 segundos y verifican
que la espera siga visible sin error en vertical y horizontal, que solo se cree
una sala al conectar y que cancelar impida solicitudes tardías.

`npm test` ejecuta 56 pruebas: 46 del servidor, seis de conexión, dos de los dominios permitidos,
una del recorrido automático y una del presupuesto de los archivos visuales.
Incluyen las 36 casillas, todos los tipos de actividad, privacidad de las
respuestas, memoria en dos fases, las seis cartas, penalizaciones limitadas al
saldo, respuestas tardías o duplicadas, bonos, reinicios y desconexiones. Los
plazos se comprueban con reloj simulado; el recorrido se verifica con 1, 24, 36,
48 y 60 casillas. Los retos visuales añaden comprobaciones de carga compartida,
pregunta oculta durante los clips, duración mínima, vencimientos, sustitución sin
descuento, observadores y selección de un visual cada tres preguntas.
Las reglas de tienda cubren precios y dueño autoritativos, límite de objetos,
privacidad, activaciones repetidas, protección por fallo o vencimiento, respuestas
descartadas, permisos por tipo de pregunta, plazos y reinicio del inventario.
El rival añade pruebas de las tres dificultades, privacidad, personajes, salas
individuales, turnos, memoria, carga y reproducción, compras, victoria completa y
cancelación de acciones al reiniciar, desconectar o terminar.

Para usar un Chromium ya instalado, configura
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` con la ruta del ejecutable. Las pruebas
usan Chromium; queda pendiente comprobar Safari y dispositivos físicos.

## Si aparece «Invalid hook call» al arrancar

El código de `App` usa los hooks dentro del componente. Si el navegador falla
en el primer `useState`, comprueba también la instalación y la caché de Vite.
La configuración deduplica React y React DOM e incluye el renderizador desde
la optimización inicial. Las pruebas usan otra caché, para no reescribir la del
servidor de desarrollo abierto.

Detén el frontend con Control+C antes de reinstalar o actualizar dependencias.
Desde la carpeta del proyecto, ejecuta:

```sh
npm ci
npm run dev -- --force --port 5173 --strictPort
```

Abre la dirección indicada por esa terminal y recarga sin caché
(Command+Shift+R en Chrome para Mac). `--strictPort` muestra un error si otro
servidor ya ocupa ese puerto. No borres `package-lock.json`: `npm ci` instala
las versiones registradas ahí. Si persiste, conserva la nueva traza de la consola
para identificar qué módulos está cargando el navegador.

## Actualizar una partida con los retos nuevos

Después de descargar estos cambios, detén **frontend y servidor** con Control+C.
Arranca de nuevo `npm run server` y `npm run dev` en terminales distintas y crea
una sala nueva para jugar con el mapa de 36 casillas y todas las actividades.
El frontend y el servidor deben usar la misma versión del mapa y del protocolo
de retos.

Los plazos, premios y descuentos se calculan en el servidor; la cuenta atrás del navegador
solo los muestra. Reiniciar o desconectar cancela también los temporizadores,
para que un reto anterior no afecte a otra partida.
