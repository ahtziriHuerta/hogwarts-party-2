# Entrega 3: producto final con conexión en red

Material preparado **sin portada**, para incorporar la portada propia de la estudiante.

## Revisión del informe: 13 de noviembre de 2026

El informe desarrolla el planteamiento del problema, objetivos, requisitos, decisiones técnicas, estados, eventos y fragmentos reales del servidor. Añade casos con precondiciones, pasos, resultados esperados y obtenidos, cinco capturas nuevas, mediciones locales, conclusiones y referencias. El anexo B relaciona la evidencia con cada criterio de la consigna. El modo **individual contra la máquina** tiene un apartado propio (6.2), con dificultades y funcionamiento del bot, y sus pruebas se desarrollan en 8.4. `assets/individual-maquina.png` conserva una captura de la batería del 11 de noviembre.

Se conserva la fecha de la batería completa del **11 de noviembre**: 56 pruebas de lógica y 38 de navegador. La [verificación adicional del 13 de noviembre](evidencias/red-adicional.json) registra **nueve comprobaciones** con dos clientes conectados, transporte WebSocket observado, rechazos de acciones inválidas, resultados y desconexión. Son comprobaciones adicionales de una secuencia, no una nueva ejecución de los 94 casos históricos. Las mediciones son locales y no representan capacidad ni latencia por Internet.

## Archivos

- [Informe final](INFORME_FINAL.md): sistema de red, organización del código, resultados y optimizaciones futuras.
- [Protocolo y puntos de revisión](PROTOCOLO.md): procedimientos y secuencia de eventos.
- [Guion de exposición y demostración](GUION_PRESENTACION.md): recorrido de 8–10 minutos y preguntas técnicas.
- [Resumen de verificación](evidencias/resultados.json) y salidas de [lógica](evidencias/unitarias.txt), [interfaz](evidencias/interfaz.txt), [análisis estático](evidencias/lint.txt) y [compilación](evidencias/build.txt).
- Entregables exportados: [informe PDF](entregables/Informe_final.pdf), [informe Word](entregables/Informe_final.docx), [presentación PowerPoint](entregables/Presentacion_clase.pptx), [diapositivas PDF](entregables/Presentacion_clase.pdf) y [guion PDF](entregables/Guion_presentacion.pdf).
- `assets/`: arquitectura y capturas de las pruebas. `red-sala.png`, `red-pregunta-a.png`, `red-pregunta-b.png`, `red-resultados-a.png` y `red-resultados-b.png` proceden de la ejecución adicional y se incluyen en el informe revisado. Las capturas anteriores se conservan para las diapositivas; `hechizos-visibles.png` es un escenario visual determinista.

## Reproducir la evidencia adicional

Desde la raíz del repositorio, después de `npm ci` y `npx playwright install chromium`, ejecutar en tres terminales de macOS/Linux:

```bash
# Terminal 1: servidor con recorrido de prueba; no usar este fixture en producción.
PORT=3002 node --require ./tests/fixtures/fixed-dice.cjs server/index.cjs
```

```bash
# Terminal 2: cliente conectado al servidor de prueba.
VITE_SERVER_URL=http://localhost:3002 npm run dev -- \
  --mode browser-tests --host 127.0.0.1 --port 5174 --strictPort
```

```bash
# Terminal 3: regenerar el JSON y las cinco capturas como un mismo conjunto.
node docs/fase-3/evidencias/verificar-red.mjs
```

Se puede indicar un Chromium del sistema con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. El [script](evidencias/verificar-red.mjs) fuerza dos duelos mediante un fixture existente y elige respuestas consultando el banco del servidor. Los clientes y sus sockets son reales; el azar y las respuestas están controlados para verificar saldos. El servidor normal sigue usando un dado aleatorio. Al terminar, detener los dos servidores. Para ejecutar después `npm run test:ui`, los puertos 3002 y 5174 deben estar libres.

## Correspondencia con la consigna

| Entregable o criterio | Material preparado | Acción para la entrega |
| --- | --- | --- |
| Videojuego funcional con red | Cliente en Netlify, servidor en Render, salas de dos jugadores. | Probar el enlace desde la red del aula antes de exponer. |
| Código actualizado y documentado | Código de esta rama, README, protocolo e informe. | Entregar la rama `codex/mobile-visual-improvements` o su ZIP. |
| Informe final | Explicación de red, pruebas, resultados y mejoras futuras. | Añadir la portada propia y revisar el formato solicitado por la maestra. |
| Estabilidad y desempeño | Pruebas, límites documentados, recursos ligeros y manejo de esperas. | No presentar las pruebas funcionales como un ensayo de carga. |
| Presentación clara y demostración efectiva | Diapositivas, notas y guion de demostración. | La exposición está pendiente de realizar por la estudiante; demostrar con dos clientes humanos. |

El modo contra el bot es complementario. La demostración principal de interacción entre jugadores se realiza con **dos personas en la misma sala**. Las herramientas mencionadas por la consigna son recomendaciones; el informe identifica las tecnologías realmente utilizadas.
