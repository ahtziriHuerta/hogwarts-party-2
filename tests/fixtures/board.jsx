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
const now = Date.now();
const isDuel = ["challenge", "boolean", "results"].includes(scene);
const challenge = isDuel
  ? {
      id: "fixture-duel",
      phase: scene === "results" ? "results" : "answering",
      difficulty: "Difícil",
      category: "Objetos",
      kind: scene === "boolean" ? "true-false" : "trivia",
      points: 30,
      maxSpeedBonus: 10,
      serverNow: now,
      deadlineAt: now + 20_000,
      durationMs: 20_000,
      participantCount: 2,
      answeredPlayerIds: scene === "results" ? ["player-0"] : [],
      question:
        scene === "boolean"
          ? "La espada de Gryffindor fue fabricada por duendes."
          : "¿Quién fue el primer propietario conocido de la Varita de Saúco?",
      options:
        scene === "boolean"
          ? ["Verdadero", "Falso"]
          : ["Dumbledore", "Antioch Peverell", "Grindelwald", "Draco Malfoy"],
      ...(scene === "results"
        ? {
            correctAnswer: 1,
            revealUntil: now + 5000,
            results: players.map((player, index) => ({
              playerId: player.id,
              nickname: player.nickname,
              correct: index === 0,
              timedOut: index === 1,
              basePoints: index === 0 ? 30 : 0,
              speedBonus: index === 0 ? 10 : 0,
              earned: index === 0 ? 40 : 0,
            })),
          }
        : {}),
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
