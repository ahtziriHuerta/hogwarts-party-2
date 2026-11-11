import { useState } from "react";
import BoardIcon from "./BoardIcon";

export default function ChallengeSpells({
  challenge,
  mySocketId,
  inventory,
  onUse,
  onHint,
  hintApplied,
  onBusy,
  disabled = false,
  blockedMessage = "",
  answerError = "",
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const used =
    confirmed ||
    challenge.spellUses?.find((entry) => entry.playerId === mySocketId)
      ?.spellId;
  const recoverHint = used === "hint" && !hintApplied;
  const items = used ? (recoverHint ? ["hint"] : []) : [...new Set(inventory)];

  function use(spellId) {
    if (busy || disabled) return;
    setBusy(true);
    onBusy(true);
    setError("");
    onUse(challenge.id, spellId, (result) => {
      setBusy(false);
      onBusy(false);
      if (result?.ok) {
        setConfirmed(spellId);
        if (spellId === "hint") onHint(result.hiddenOptions);
      } else setError(result?.error || "Intenta de nuevo.");
    });
  }

  return (
    <section
      className="challenge-footer challenge-spells"
      aria-label="Tus hechizos"
    >
      <span
        className="spell-guidance"
        role={error || answerError ? "alert" : "status"}
      >
        <strong>{used ? "Hechizo usado" : "Tus hechizos"}</strong>
        {" · "}
        {error ||
          answerError ||
          (busy
            ? "Activando…"
            : blockedMessage ||
              (used === "shield"
                ? "Escudo activo · este duelo no te resta monedas."
                : used === "hint" && hintApplied
                  ? "Pista aplicada · dos opciones descartadas."
                  : "Usa uno antes de responder."))}
      </span>
      {items.length > 0 && (
        <div className="challenge-spell-buttons">
          {items.map((id) => {
            const allowed =
              id === "shield"
                ? challenge.mode === "duel"
                : challenge.options.length === 4;
            return (
              <button
                key={id}
                type="button"
                className="primary"
                disabled={busy || disabled || !allowed}
                onClick={() => use(id)}
              >
                <BoardIcon type={id} />
                <span>
                  {recoverHint
                    ? "Recuperar pista"
                    : id === "shield"
                      ? "Usar escudo"
                      : "Usar pista"}
                  {(!allowed || disabled) && (
                    <small>
                      {disabled
                        ? "Espera"
                        : id === "shield"
                          ? "Solo duelos"
                          : "4 opciones"}
                    </small>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
