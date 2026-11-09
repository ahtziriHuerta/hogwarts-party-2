import React from "react";
import { createRoot } from "react-dom/client";
import MagicBoard from "../../src/MagicBoard";
import characters from "../../shared/characters.json";
import "../../src/index.css";
import "../../src/App.css";

// Escenarios de diseño deterministas: no dependen de la suerte del dado ni de la red.
const scene = new URLSearchParams(location.search).get("scene");
const players = characters.slice(5, 7).map((character, index) => ({
  id: `player-${index}`,
  nickname: index === 0 ? "A".repeat(20) : "M".repeat(20),
  character,
  points: 100,
  trophies: scene === "winner" && index === 0 ? 2 : 0,
  position: scene === "edge" ? 23 + index : 12,
  totalSteps: scene === "edge" ? 23 + index : 12,
  laps: 0,
}));
const challenge =
  scene === "challenge"
    ? {
        id: 1,
        playerId: "player-0",
        difficulty: "Difícil",
        points: 30,
        question:
          "¿Quién fue el primer propietario conocido de la Varita de Saúco?",
        options: [
          "Dumbledore",
          "Antioch Peverell",
          "Grindelwald",
          "Draco Malfoy",
        ],
      }
    : null;
const game = {
  players,
  turn: 0,
  dice: 6,
  winner: scene === "winner" ? 0 : null,
  message: `❌ ${players[0].nickname} falló el reto. La respuesta era: Antioch Peverell.`,
  rollNumber: 1,
  trophyPrice: 100,
  trophiesToWin: 2,
  challenge,
};
createRoot(document.getElementById("root")).render(
  <main className="game">
    <MagicBoard
      game={game}
      mySocketId="player-0"
      isHost
      onRollDice={(done) =>
        done({
          ok: false,
          error: "El servidor no respondió. Intenta de nuevo.",
        })
      }
      onRestart={(done) => done({ ok: true })}
      onBack={() => {}}
    />
  </main>,
);
