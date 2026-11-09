import { useState } from "react";
import MagicCharacter from "./MagicCharacter";

import characters from "../shared/characters.json";

export default function CharacterSelection({
  nickname,
  error,
  playerNumber = 1,
  takenCharacterIds = [],
  onBack,
  onNext,
}) {
  const [selected, setSelected] = useState(null);

  const selectedCharacter = characters.find(
    (character) =>
      character.id === selected && !takenCharacterIds.includes(character.id),
  );

  function handleSelect(character) {
    if (takenCharacterIds.includes(character.id)) {
      return;
    }

    setSelected(character.id);
  }

  function handleConfirm() {
    if (!selectedCharacter) {
      return;
    }

    onNext(selectedCharacter);
    setSelected(null);
  }

  return (
    <section className="character-selection">
      <button className="back-button" type="button" onClick={onBack}>
        ← Volver
      </button>

      <h2>🪄 Jugador {playerNumber}</h2>

      <p
        className={error ? "room-error" : undefined}
        role={error ? "alert" : undefined}
      >
        {error || `¡Hola, ${nickname}! Elige tu estudiante de magia.`}
      </p>

      <div className="character-grid">
        {characters.map((character) => {
          const isTaken = takenCharacterIds.includes(character.id);

          const isSelected = selected === character.id;

          return (
            <button
              key={character.id}
              type="button"
              disabled={isTaken}
              aria-pressed={isSelected && !isTaken}
              className={`character-card ${
                isSelected && !isTaken ? "selected" : ""
              } ${isTaken ? "character-taken" : ""}`}
              onClick={() => handleSelect(character)}
            >
              <MagicCharacter
                size={130}
                primary={character.primary}
                secondary={character.secondary}
                hair={character.hair}
                skin={character.skin}
                eyes={character.eyes}
                hairstyle={character.hairstyle}
              />

              <span>{character.name}</span>

              <small className="character-house">{character.house}</small>

              {isTaken && <span className="taken-label">🔒 Ocupado</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="primary"
        disabled={!selectedCharacter}
        onClick={handleConfirm}
      >
        Elegir personaje ✨
      </button>
    </section>
  );
}
