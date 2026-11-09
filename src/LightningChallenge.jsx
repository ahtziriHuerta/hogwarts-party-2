import { useEffect, useRef, useState } from "react";

// Este reloj solo dibuja la cuenta atrás. El servidor decide si una respuesta llegó a tiempo.
// Usar el tiempo restante enviado evita depender de la hora configurada en el celular.
function useCountdown(challenge) {
  const deadline =
    challenge.phase === "results"
      ? challenge.revealUntil
      : challenge.phase === "memorizing"
        ? challenge.previewUntil
        : challenge.deadlineAt;
  const initial = Math.max(0, deadline - challenge.serverNow);
  const [remaining, setRemaining] = useState(initial);
  useEffect(() => {
    const localEnd =
      performance.now() + Math.max(0, deadline - challenge.serverNow);
    const tick = () => setRemaining(Math.max(0, localEnd - performance.now()));
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [deadline, challenge.serverNow]);
  return remaining;
}

const shapes = ["▲", "◆", "●", "■"];

export default function LightningChallenge({
  challenge,
  mySocketId,
  onAnswer,
}) {
  const dialog = useRef(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const remaining = useCountdown(challenge);
  const isResults = challenge.phase === "results";
  const isMemorizing = challenge.phase === "memorizing";
  const isMemory = challenge.kind === "memory";
  const isSurprise = challenge.kind === "surprise";
  const answered = sent || challenge.answeredPlayerIds.includes(mySocketId);
  const canParticipate = challenge.participantIds.includes(mySocketId);
  const isSolo = challenge.mode === "solo";
  const locked =
    !canParticipate ||
    challenge.phase !== "answering" ||
    answered ||
    busy ||
    remaining <= 0;
  const count = challenge.answeredPlayerIds.length;

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);

  function answer(index) {
    if (locked) return;
    setSelected(index);
    setBusy(true);
    setError("");
    onAnswer(challenge.id, index, (result) => {
      setBusy(false);
      if (result?.ok) setSent(true);
      else {
        setSelected(null);
        setError(result?.error || "No se pudo enviar. Intenta de nuevo.");
      }
    });
  }

  return (
    <dialog
      ref={dialog}
      className="challenge-modal"
      aria-labelledby="lightning-title"
      onCancel={(event) => event.preventDefault()}
    >
      <header className="challenge-header">
        <h2 id="lightning-title">
          {isSurprise
            ? "🎁 Casilla sorpresa"
            : isResults
              ? "✨ Resultados del reto"
              : isMemory
                ? "🧠 Reto de memoria"
                : isSolo
                  ? "🪄 Reto individual"
                  : "⚡ Duelo contra rival"}
        </h2>
        <span
          className={`challenge-clock ${remaining <= 5000 && !isResults ? "clock-urgent" : ""}`}
          role="timer"
          aria-label="Tiempo restante"
        >
          {Math.ceil(remaining / 1000)} s
        </span>
      </header>
      {isSurprise ? (
        <p className="challenge-meta">
          {challenge.playerName} encontró una carta.
        </p>
      ) : (
        <p className="challenge-meta">
          {challenge.category} ·{" "}
          {challenge.kind === "true-false"
            ? "Verdadero o falso"
            : challenge.difficulty}{" "}
          · 🪙 {challenge.points}
          {challenge.maxSpeedBonus > 0
            ? ` + hasta ${challenge.maxSpeedBonus} por rapidez`
            : ""}
          {" · "}Fallo/tiempo:{" "}
          {challenge.wrongPenalty > 0
            ? `−${challenge.wrongPenalty}`
            : "sin pérdida"}
        </p>
      )}
      {!isResults && (
        <div className="challenge-progress" aria-hidden="true">
          <span
            style={{
              width: `${Math.min(100, (remaining / (isMemorizing ? challenge.previewDurationMs : challenge.durationMs)) * 100)}%`,
            }}
          />
        </div>
      )}
      {isMemorizing ? (
        <>
          <p className="challenge-question">
            Memoriza el orden. Los símbolos desaparecerán.
          </p>
          <ol className="memory-sequence" aria-label="Secuencia para memorizar">
            {challenge.memorySequence.map((symbol, index) => (
              <li key={index}>
                <small>{index + 1}</small>
                <span aria-hidden="true">{symbol.icon}</span>
                <strong>{symbol.name}</strong>
              </li>
            ))}
          </ol>
          <p className="challenge-footer" role="status">
            {canParticipate
              ? "Observa: después responderás sobre una posición."
              : `${challenge.playerName} está memorizando. Tu saldo no cambia.`}
          </p>
        </>
      ) : isSurprise ? (
        <>
          <h3 className="surprise-title">{challenge.eventTitle}</h3>
          <p className="challenge-question">{challenge.eventDescription}</p>
        </>
      ) : (
        <p className="challenge-question">{challenge.question}</p>
      )}

      {isResults ? (
        <>
          {!isSurprise && (
            <p className="challenge-correct-answer">
              ✓ Respuesta:{" "}
              <strong>{challenge.options[challenge.correctAnswer]}</strong>
            </p>
          )}
          <div className={`challenge-results ${isSolo ? "solo-results" : ""}`}>
            {challenge.results.map((result) => (
              <article
                key={result.playerId}
                className={`challenge-result ${result.playerId === mySocketId ? "my-result" : ""}`}
              >
                <strong className="result-name" title={result.nickname}>
                  {result.nickname}
                  {result.playerId === mySocketId ? " · Tú" : ""}
                </strong>
                <span className="result-earned">
                  {isSurprise ? "" : result.correct ? "✓ " : "✕ "}
                  {result.earned > 0 ? "+" : result.earned < 0 ? "−" : ""}
                  {Math.abs(result.earned)} 🪙
                </span>
                <small>
                  {isSurprise
                    ? result.earned > 0
                      ? "Monedas recibidas"
                      : result.earned < 0
                        ? "Monedas descontadas"
                        : "Sin cambio de saldo"
                    : result.correct
                      ? `${result.basePoints} por acertar${result.speedBonus > 0 ? ` + ${result.speedBonus} de rapidez` : ""}`
                      : `${result.timedOut ? "Tiempo agotado" : "Respuesta incorrecta"} · ${result.penalty > 0 ? `−${result.penalty}` : challenge.wrongPenalty > 0 ? "saldo en 0" : "sin pérdida"}`}
                </small>
              </article>
            ))}
          </div>
          <p className="challenge-footer" role="status">
            Volvemos al tablero en {Math.ceil(remaining / 1000)} s.
          </p>
        </>
      ) : (
        !isMemorizing && (
          <>
            <div className="challenge-options">
              {challenge.options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`${String.fromCharCode(65 + index)} ${option}`}
                  aria-pressed={selected === index}
                  className={`challenge-option option-${index} ${selected === index ? "selected" : ""}`}
                  disabled={locked}
                  onClick={() => answer(index)}
                >
                  <span className="challenge-letter" aria-hidden="true">
                    {shapes[index]}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
            <p
              className={`challenge-footer ${error ? "challenge-error" : ""}`}
              role={error ? "alert" : "status"}
            >
              {error ||
                (!canParticipate
                  ? `Solo responde ${challenge.playerName}. Tu saldo no cambia.`
                  : busy
                    ? "Enviando…"
                    : answered
                      ? `✓ Respuesta enviada · ${count}/${challenge.participantCount} respondieron`
                      : remaining <= 0
                        ? "¡Tiempo! Esperando resultados…"
                        : `Toca una opción para responder · ${count}/${challenge.participantCount} respondieron`)}
            </p>
          </>
        )
      )}
    </dialog>
  );
}
