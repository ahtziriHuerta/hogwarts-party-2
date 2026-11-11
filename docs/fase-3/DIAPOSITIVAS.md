# Contenido de la presentación (sin portada)

## 1. Producto final y objetivo

- Juego web 2D de tablero por turnos.
- Dos jugadores humanos conectados a una misma sala.
- Modo individual contra un bot como función adicional.
- Objetivo de red: sincronizar acciones, retos y resultados.

**Notas:** Abrir con el objetivo de la Fase 3. Aclarar que el modo individual es adicional y que la demostración principal usará dos clientes humanos. Mostrar el enlace o el código QR.

## 2. Arquitectura cliente–servidor

- Netlify entrega la interfaz y los recursos.
- Render conserva el estado válido de cada sala.
- Socket.IO intercambia eventos y acuses.
- Transportes: sondeo HTTPS y WebSocket seguro (WSS).

**Notas:** Señalar los dos clientes y el servidor autoritativo. No hay comunicación directa entre jugadores. Socket.IO puede empezar con sondeo y actualizarse a WebSocket; no es exclusivamente WebSocket.

## 3. De la sala a la partida

- 1. Crear sala y recibir un código de seis caracteres.
- 2. Unirse desde un segundo cliente.
- 3. Elegir personajes distintos.
- 4. El creador inicia y el servidor distribuye el estado.

**Notas:** Nombrar create-room, join-room, select-character y start-game. Explicar que el servidor valida existencia, capacidad y permisos antes de cambiar la partida.

## 4. El servidor decide y sincroniza

- El cliente solicita roll-dice: no propone el resultado.
- El servidor valida el turno y genera el dado.
- También calcula posiciones, monedas, compras y victoria.
- room-updated publica una vista limitada a los participantes.

**Notas:** Mostrar updateRoom y rollDice en server/index.cjs. Explicar que tener el mismo tablero dibujado no es suficiente: el estado llega del servidor y los clientes no pueden elegir sus premios.

## 5. Retos, plazos y privacidad

- 20 segundos para responder; 5 para ver resultados.
- Una respuesta por participante, validada en el servidor.
- El rival no ve la opción enviada antes del cierre.
- Imágenes y clips se preparan antes de iniciar el plazo.

**Notas:** Mostrar cómo un jugador responde y queda bloqueado mientras el otro sigue jugando. Al terminar, comparar el mismo resultado en ambos clientes. Las pistas se reciben mediante un acuse privado.

## 6. Estabilidad y límites actuales

- Espera de conexión de hasta 90 segundos y botón Cancelar.
- Reintentos sin duplicar la solicitud de entrada.
- Acciones fuera de turno y respuestas tardías se rechazan.
- Al desconectar se pierde la partida activa: aún no hay recuperación.

**Notas:** Explicar el arranque de Render gratuito y el aviso de espera. Distinguir reconectar el transporte de restaurar una partida. No afirmar que las sesiones están guardadas o que el juego funciona sin Internet.

## 7. Resultados comprobados

- 94 casos automatizados aprobados en la versión revisada.
- Dos clientes reales de navegador; reglas con reloj simulado.
- Pantallas verticales y horizontales desde 320×568 y 740×280.
- Análisis estático y compilación aprobados.

**Notas:** Mostrar evidencias/resultados.json. Aclarar que los relojes simulados prueban vencimientos y espera, no miden latencia real. No se hizo una prueba de carga ni validación formal de hardware físico.

## 8. Demostración ante la clase

- Crear una sala y compartir su código.
- Unirse, elegir personajes e iniciar desde el creador.
- Lanzar y comparar turno, posición y monedas.
- Resolver un duelo si aparece; mostrar la misma conclusión.

**Notas:** Usar dos dispositivos o dos páginas. El dado de producción es aleatorio, por lo que no se puede garantizar una casilla de duelo inmediata. Llevar capturas o la prueba automatizada identificada como respaldo. Probar antes el acceso desde la red del aula.

## 9. Mejoras y optimizaciones futuras

- Recuperar sesiones y persistir partidas.
- Medir latencia, memoria, tráfico y carga concurrente.
- Coordinar el estado si se utilizan varios procesos.
- Enviar cambios parciales y ampliar las pruebas en dispositivos físicos.

**Notas:** Priorizar recuperación de sesión y mediciones antes de asegurar escalabilidad. Recordar que las salas actuales viven en un Map en memoria de un proceso. La optimización aplicada hoy incluye SVG locales y descargar solo el medio activo.

## 10. Evidencia lista para revisión

- Informe: arquitectura, procedimientos, resultados y límites.
- Código: server/index.cjs, server/challenges.cjs y src/socket.js.
- Pruebas y evidencias incluidas con la entrega.
- El enlace público permite comprobar la interacción en red.

**Notas:** Cerrar relacionando cada entregable con la consigna. Tener el repositorio abierto en la rama correcta y el guion con respuestas técnicas. La exposición y las pruebas desde la red del aula las realiza la estudiante.
