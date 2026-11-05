import { useState } from "react";
import MagicCharacter from "./MagicCharacter";
import "./MagicBoard.css";

const TOTAL = 24;

const spaces = Array.from({ length: TOTAL }, (_, i) => {
  const number = i + 1;

  if (number === TOTAL) {
    return { number, type: "finish", icon: "🏆" };
  }

  if (number % 7 === 0) {
    return { number, type: "trap", icon: "🕷️" };
  }

  if (number % 5 === 0) {
    return { number, type: "bonus", icon: "⭐" };
  }

  if (number % 3 === 0) {
    return { number, type: "challenge", icon: "🪄" };
  }

  return { number, type: "normal", icon: "✨" };
});

export default function MagicBoard({ nickname, character, onBack }) {
  const [position, setPosition] = useState(0);
  const [points, setPoints] = useState(0);
  const [dice, setDice] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState(
    "¡Tu aventura comienza! Lanza el dado."
  );

  const finished = position === TOTAL;

  function rollDice() {
    if (rolling || finished) return;

    setRolling(true);
    setMessage("🎲 Lanzando el dado...");

    const result = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      const next = Math.min(position + result, TOTAL);
      const space = spaces[next - 1];

      setDice(result);
      setPosition(next);

      if (next === TOTAL) {
        setPoints((p) => p + 100);
        setMessage("🏆 ¡Llegaste a la Copa de Hogwarts! +100 puntos");
      } else if (space.type === "bonus") {
        setPoints((p) => p + 20);
        setMessage("⭐ ¡Encontraste magia! +20 puntos");
      } else if (space.type === "trap") {
        setPoints((p) => Math.max(0, p - 10));
        setMessage("🕷️ ¡Una trampa mágica! -10 puntos");
      } else if (space.type === "challenge") {
        setPoints((p) => p + 10);
        setMessage("🪄 ¡Superaste un reto mágico! +10 puntos");
      } else {
        setMessage(`✨ Avanzaste hasta la casilla ${next}.`);
      }

      setRolling(false);
    }, 650);
  }

  function restart() {
    setPosition(0);
    setPoints(0);
    setDice(null);
    setRolling(false);
    setMessage("¡Nueva aventura! Lanza el dado.");
  }

  return (
    <section className="magic-board-screen">
      <button className="back-button" onClick={onBack}>
        ← Volver
      </button>

      <h2>🏰 El tablero mágico</h2>
      <p>¡Bienvenido, {nickname}! Tu aventura comienza aquí.</p>

      <div className="board-player">
        <MagicCharacter
          size={115}
          primary={character.primary}
          secondary={character.secondary}
          hair={character.hair}
          skin={character.skin}
          eyes={character.eyes}
          hairstyle={character.hairstyle}
        />

        <div>
          <h3>{character.name}</h3>
          <p>{character.house}</p>
          <strong>⭐ {points} puntos</strong>
          <p>Casilla: {position} / {TOTAL}</p>
        </div>
      </div>

      <div className="magic-board">
        {spaces.map((space) => (
          <div
            key={space.number}
            className={`magic-space ${space.type} ${
              position === space.number ? "active" : ""
            }`}
          >
            <small>{space.number}</small>
            <span>{space.icon}</span>

            {position === space.number && (
              <span className="player-token">🧙</span>
            )}
          </div>
        ))}
      </div>

      <div className="board-controls">
        <div className="dice-display">
          {dice === null ? "🎲" : `🎲 ${dice}`}
        </div>

        <p className="board-message">{message}</p>

        <button
          className="primary"
          onClick={rollDice}
          disabled={rolling || finished}
        >
          {rolling
            ? "Lanzando..."
            : finished
            ? "¡Aventura completada!"
            : "🎲 Lanzar dado"}
        </button>

        <button className="secondary" onClick={restart}>
          ↻ Reiniciar tablero
        </button>
      </div>
    </section>
  );
}
