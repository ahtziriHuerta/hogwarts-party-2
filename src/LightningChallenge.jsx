import { useEffect, useRef, useState } from "react";
import ChallengeMedia from "./ChallengeMedia";
import ChallengeSpells from "./ChallengeSpells";
import "./Spells.css";

// Este reloj solo dibuja la cuenta atrás. El servidor decide si una respuesta llegó a tiempo.
// Usar el tiempo restante enviado evita depender de la hora configurada en el celular.
function useCountdown(challenge) {
  const deadline =
    challenge.phase === "results"
      ? challenge.revealUntil
      : challenge.phase === "memorizing"
        ? challenge.previewUntil
        : ["loading", "watching"].includes(challenge.phase)
          ? challenge.preparationUntil
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
  onMediaStatus,
  inventory = [],
  onUseSpell,
}) {
  const dialog = useRef(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [spellBusy, setSpellBusy] = useState(false);
  const remaining = useCountdown(challenge);
  const isResults = challenge.phase === "results";
  const isMemorizing = challenge.phase === "memorizing";
  const isPreparing = ["loading", "watching"].includes(challenge.phase);
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
    spellBusy ||
    remaining <= 0;
  const count = challenge.answeredPlayerIds.length;
  const hasSpellAction =
    onUseSpell &&
    canParticipate &&
    !answered &&
    !busy &&
    remaining > 0 &&
    (inventory.length > 0 ||
      challenge.spellUses?.some((entry) => entry.playerId === mySocketId));

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);

  function answer(index) {
    if (locked || hiddenOptions.includes(index)) return;
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
      className={`challenge-modal ${challenge.media ? "has-visual" : ""} ${hasSpellAction && challenge.phase === "answering" ? "has-spells" : ""}`}
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
          {isPreparing ? "⏳" : `${Math.ceil(remaining / 1000)} s`}
        </span>
      </header>
      {isSurprise ? (
        <p className="challenge-meta">
          {challenge.playerName} encontró una carta.
        </p>
      ) : (
        <p className="challenge-meta">
          {challenge.category} ·{" "}
          {challenge.kind === "visual"
            ? challenge.mediaType === "video"
              ? "Clip corto"
              : "Ilustración"
            : challenge.kind === "true-false"
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
      {!isResults && !isPreparing && (
        <div className="challenge-progress" aria-hidden="true">
          <span
            style={{
              width: `${Math.min(100, (remaining / (isMemorizing ? challenge.previewDurationMs : challenge.durationMs)) * 100)}%`,
            }}
          />
        </div>
      )}
      {isPreparing ? (
        <p className="challenge-question">
          {challenge.phase === "loading"
            ? "Preparando el reto visual…"
            : "Observa el clip. La pregunta aparecerá después."}
        </p>
      ) : isMemorizing ? (
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

      <div className={challenge.media ? "challenge-visual-layout" : undefined}>
        {challenge.media && (
          <ChallengeMedia
            key={challenge.id}
            challenge={challenge}
            mySocketId={mySocketId}
            onStatus={onMediaStatus}
          />
        )}
        {isPreparing ? (
          <p className="challenge-footer media-status" role="status">
            {!canParticipate
              ? `Solo responde ${challenge.playerName}. Tu saldo no cambia.`
              : challenge.phase === "loading"
                ? "El reloj espera a que el contenido esté listo."
                : challenge.viewedPlayerIds?.includes(mySocketId)
                  ? "Esperando a que termine el rival…"
                  : "Pulsa Ver clip. Después tendrás 20 segundos para responder."}
          </p>
        ) : isResults ? (
          <>
            {!isSurprise && (
              <p className="challenge-correct-answer">
                ✓ Respuesta:{" "}
                <strong>{challenge.options[challenge.correctAnswer]}</strong>
              </p>
            )}
            <div
              className={`challenge-results ${isSolo ? "solo-results" : ""}`}
            >
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
                        : `${result.timedOut ? "Tiempo agotado" : "Respuesta incorrecta"} · ${result.protectedByShield ? "Escudo · sin pérdida" : result.penalty > 0 ? `−${result.penalty}` : challenge.wrongPenalty > 0 ? "saldo en 0" : "sin pérdida"}`}
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
                    aria-label={`${String.fromCharCode(65 + index)} ${option}${hiddenOptions.includes(index) ? " · Descartada por la pista" : ""}`}
                    aria-pressed={selected === index}
                    className={`challenge-option option-${index} ${selected === index ? "selected" : ""} ${hiddenOptions.includes(index) ? "eliminated" : ""}`}
                    disabled={locked || hiddenOptions.includes(index)}
                    onClick={() => answer(index)}
                  >
                    <span className="challenge-letter" aria-hidden="true">
                      {shapes[index]}
                    </span>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              {hasSpellAction && !error ? (
                <ChallengeSpells
                  challenge={challenge}
                  mySocketId={mySocketId}
                  inventory={inventory}
                  onUse={onUseSpell}
                  onHint={setHiddenOptions}
                  hintApplied={hiddenOptions.length === 2}
                  onBusy={setSpellBusy}
                />
              ) : (
                <p
                  className={`challenge-footer ${error ? "challenge-error" : ""}`}
                  role={error ? "alert" : "status"}
                >
                  {challenge.notice && (
                    <span className="challenge-notice">
                      {challenge.notice}{" "}
                    </span>
                  )}
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
              )}
            </>
          )
        )}
      </div>
    </dialog>
  );
}
