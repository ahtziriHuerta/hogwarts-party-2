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
    if (busy) return;
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
    <div className="challenge-footer challenge-spells">
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
                className="secondary"
                disabled={busy || !allowed}
                onClick={() => use(id)}
              >
                <BoardIcon type={id} />
                <span>
                  {recoverHint
                    ? "Recuperar pista"
                    : id === "shield"
                      ? "Usar escudo"
                      : "Usar pista"}
                  {!allowed && (
                    <small>
                      {id === "shield" ? "Solo duelos" : "4 opciones"}
                    </small>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <span role={error ? "alert" : "status"}>
        {error ||
          (busy
            ? "Activando…"
            : used === "shield"
              ? "Escudo activo · este duelo no te resta monedas."
              : used === "hint" && hintApplied
                ? "Pista aplicada · dos opciones descartadas."
                : "Un hechizo por reto · antes de responder.")}
      </span>
    </div>
  );
}
