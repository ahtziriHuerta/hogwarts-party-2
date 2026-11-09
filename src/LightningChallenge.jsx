import { useEffect, useRef, useState } from "react";

// Este reloj solo dibuja la cuenta atrás. El servidor decide si una respuesta llegó a tiempo.
// Usar el tiempo restante enviado evita depender de la hora configurada en el celular.
function useCountdown(challenge) {
  const deadline =
    challenge.phase === "results"
      ? challenge.revealUntil
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
  const answered = sent || challenge.answeredPlayerIds.includes(mySocketId);
  const locked = isResults || answered || busy || remaining <= 0;
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
          ⚡ {isResults ? "Resultados del reto" : "Reto relámpago"}
        </h2>
        <span
          className={`challenge-clock ${remaining <= 5000 && !isResults ? "clock-urgent" : ""}`}
          role="timer"
          aria-label="Tiempo restante"
        >
          {Math.ceil(remaining / 1000)} s
        </span>
      </header>
      <p className="challenge-meta">
        {challenge.category} ·{" "}
        {challenge.kind === "true-false"
          ? "Verdadero o falso"
          : challenge.difficulty}{" "}
        · ⭐ {challenge.points} + hasta {challenge.maxSpeedBonus} por rapidez
      </p>
      {!isResults && (
        <div className="challenge-progress" aria-hidden="true">
          <span
            style={{
              width: `${Math.min(100, (remaining / challenge.durationMs) * 100)}%`,
            }}
          />
        </div>
      )}
      <p className="challenge-question">{challenge.question}</p>

      {isResults ? (
        <>
          <p className="challenge-correct-answer">
            ✓ Respuesta:{" "}
            <strong>{challenge.options[challenge.correctAnswer]}</strong>
          </p>
          <div className="challenge-results">
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
                  {result.correct ? "✓" : "✕"} +{result.earned} ⭐
                </span>
                <small>
                  {result.timedOut
                    ? "No respondió a tiempo"
                    : result.correct
                      ? `${result.basePoints} por acertar + ${result.speedBonus} de rapidez`
                      : "Respuesta incorrecta"}
                </small>
              </article>
            ))}
          </div>
          <p className="challenge-footer" role="status">
            Volvemos al tablero en {Math.ceil(remaining / 1000)} s.
          </p>
        </>
      ) : (
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
              (busy
                ? "Enviando…"
                : answered
                  ? `✓ Respuesta enviada · ${count}/${challenge.participantCount} respondieron`
                  : remaining <= 0
                    ? "¡Tiempo! Esperando resultados…"
                    : `Toca una opción para responder · ${count}/${challenge.participantCount} respondieron`)}
          </p>
        </>
      )}
    </dialog>
  );
}
