
import { useState } from "react";
import MagicCharacter from "./MagicCharacter";

const characters = [
  {
    id: 1,
    name: "Leo",
    house: "Gryffindor",
    hairstyle: "short",
    primary: "#9e303e",
    secondary: "#e8b95b",
    hair: "#62453f",
    skin: "#f8d5ad",
    eyes: "#477e85",
  },
  {
    id: 2,
    name: "Mia",
    house: "Gryffindor",
    hairstyle: "wavy",
    primary: "#9e303e",
    secondary: "#e8b95b",
    hair: "#35262e",
    skin: "#c98b65",
    eyes: "#79543a",
  },
  {
    id: 3,
    name: "Max",
    house: "Slytherin",
    hairstyle: "side",
    primary: "#236b4c",
    secondary: "#c4cbd0",
    hair: "#d7c38c",
    skin: "#f4d4b7",
    eyes: "#658c70",
  },
  {
    id: 4,
    name: "Sofi",
    house: "Slytherin",
    hairstyle: "long",
    primary: "#236b4c",
    secondary: "#c4cbd0",
    hair: "#292b37",
    skin: "#a66b4f",
    eyes: "#87664d",
  },
  {
    id: 5,
    name: "Noah",
    house: "Ravenclaw",
    hairstyle: "curly",
    primary: "#315d9b",
    secondary: "#bc9365",
    hair: "#3a3034",
    skin: "#8f5b43",
    eyes: "#67513e",
  },
  {
    id: 6,
    name: "Luna",
    house: "Ravenclaw",
    hairstyle: "braids",
    primary: "#315d9b",
    secondary: "#bc9365",
    hair: "#e1ba72",
    skin: "#ffe0bc",
    eyes: "#668cbd",
  },
  {
    id: 7,
    name: "Emma",
    house: "Hufflepuff",
    hairstyle: "ponytail",
    primary: "#d9ae39",
    secondary: "#252530",
    hair: "#a45d38",
    skin: "#e7ac82",
    eyes: "#648c61",
  },
  {
    id: 8,
    name: "Alex",
    house: "Hufflepuff",
    hairstyle: "curly",
    primary: "#d9ae39",
    secondary: "#252530",
    hair: "#24232e",
    skin: "#b98261",
    eyes: "#76543c",
  },
];

export default function CharacterSelection({
  nickname,
  playerNumber = 1,
  takenCharacterIds = [],
  onBack,
  onNext,
}) {
  const [selected, setSelected] = useState(null);

  const selectedCharacter = characters.find(
    (character) =>
      character.id === selected &&
      !takenCharacterIds.includes(character.id)
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
      <button
        className="back-button"
        type="button"
        onClick={onBack}
      >
        ← Volver
      </button>

      <h2>🪄 Jugador {playerNumber}</h2>

      <p>
        ¡Hola, {nickname}! Elige tu estudiante de magia.
      </p>

      <div className="character-grid">
        {characters.map((character) => {
          const isTaken = takenCharacterIds.includes(
            character.id
          );

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

              <small className="character-house">
                {character.house}
              </small>

              {isTaken && (
                <span className="taken-label">
                  🔒 Ocupado
                </span>
              )}
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
