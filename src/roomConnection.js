export const SERVER_WAIT_MS = 90_000;
export const WAIT_MESSAGE =
  "Esperando al servidor. La primera conexión puede tardar más de un minuto.";

// Render gratuito puede despertar después del primer error de transporte.
// Conservamos el intento y dejamos que Socket.IO reconecte, con un límite total.
export function requestRoom(
  socket,
  eventName,
  payload,
  { onWaiting, onResult },
  clock = {
    schedule: (callback, delay) => setTimeout(callback, delay),
    cancel: (timer) => clearTimeout(timer),
  },
) {
  let active = true;
  let sent = false;
  let noticeTimer;
  let deadlineTimer;

  function cleanupWaiting() {
    clock.cancel(noticeTimer);
    clock.cancel(deadlineTimer);
    socket.off("connect", send);
    socket.off("connect_error", waiting);
  }

  function cancel() {
    active = false;
    cleanupWaiting();
  }

  function finish(result) {
    if (!active) return;
    cancel();
    onWaiting("");
    onResult(result);
  }

  function waiting() {
    if (active && !sent) onWaiting(WAIT_MESSAGE);
  }

  function send() {
    if (!active || sent) return;
    sent = true;
    cleanupWaiting();
    onWaiting("");
    socket.timeout(15_000).emit(eventName, payload, (timeoutError, result) => {
      finish(
        timeoutError
          ? {
              ok: false,
              error:
                "El servidor no respondió a la solicitud. Vuelve a intentar.",
            }
          : result || { ok: false, error: "No se pudo entrar a la sala." },
      );
    });
  }

  if (socket.connected) send();
  else {
    socket.on("connect", send);
    socket.on("connect_error", waiting);
    noticeTimer = clock.schedule(waiting, 8000);
    deadlineTimer = clock.schedule(
      () =>
        finish({
          ok: false,
          error:
            "No se pudo conectar con el servidor después de 90 segundos. Vuelve a intentar.",
        }),
      SERVER_WAIT_MS,
    );
    socket.connect();
  }

  return cancel;
}
