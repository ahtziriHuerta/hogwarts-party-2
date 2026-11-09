import React from "react";
import { createRoot } from "react-dom/client";
import MagicBoard from "../../src/MagicBoard";
import characters from "../../shared/characters.json";
import board from "../../shared/board.json";
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
  position: scene === "edge" ? board.length - 1 + index : 12,
  totalSteps: scene === "edge" ? board.length - 1 + index : 12,
  laps: 0,
}));
const now = Date.now();
const isDuel = [
  "challenge",
  "boolean",
  "results",
  "solo",
  "solo-watch",
  "solo-results",
  "memory-preview",
  "memory-question",
  "memory-watch",
  "memory-results",
  "surprise",
].includes(scene);
const isMemory = scene?.startsWith("memory");
const isSolo = scene?.startsWith("solo") || isMemory;
const isResults = [
  "results",
  "solo-results",
  "memory-results",
  "surprise",
].includes(scene);
const challenge = isDuel
  ? {
      id: "fixture-duel",
      phase: isResults ? "results" : "answering",
      mode: isSolo ? "solo" : "duel",
      playerName: players[0].nickname,
      participantIds: isSolo ? ["player-0"] : ["player-0", "player-1"],
      wrongPenalty: isSolo ? 0 : 10,
      difficulty: "Difícil",
      category: "Objetos",
      kind: scene === "boolean" ? "true-false" : "trivia",
      points: 30,
      maxSpeedBonus: isSolo ? 0 : 10,
      serverNow: now,
      deadlineAt: now + 20_000,
      durationMs: 20_000,
      participantCount: isSolo ? 1 : 2,
      answeredPlayerIds: isResults ? ["player-0"] : [],
      question:
        scene === "boolean"
          ? "La espada de Gryffindor fue fabricada por duendes."
          : "¿Quién fue el primer propietario conocido de la Varita de Saúco?",
      options:
        scene === "boolean"
          ? ["Verdadero", "Falso"]
          : ["Dumbledore", "Antioch Peverell", "Grindelwald", "Draco Malfoy"],
      ...(isResults
        ? {
            correctAnswer: 1,
            revealUntil: now + 5000,
            results: players
              .filter((_, index) => !isSolo || index === 0)
              .map((player, index) => ({
                playerId: player.id,
                nickname: player.nickname,
                correct: index === 0,
                timedOut: index === 1,
                basePoints: index === 0 ? 30 : 0,
                speedBonus: index === 0 && !isSolo ? 10 : 0,
                penalty: index === 0 || isSolo ? 0 : 10,
                earned: index === 0 ? (isSolo ? 30 : 40) : -10,
              })),
          }
        : {}),
    }
  : null;
if (isMemory) {
  Object.assign(challenge, {
    kind: "memory",
    category: "Memoria",
    difficulty: "Observación",
    points: 25,
    phase:
      scene === "memory-preview"
        ? "memorizing"
        : isResults
          ? "results"
          : "answering",
    previewUntil: now + 5000,
    previewDurationMs: 5000,
    ...(scene === "memory-preview"
      ? {
          question: undefined,
          options: undefined,
          memorySequence: [
            { icon: "🦉", name: "Búho" },
            { icon: "🧹", name: "Escoba" },
            { icon: "🪄", name: "Varita" },
            { icon: "📚", name: "Libros" },
            { icon: "🕯️", name: "Vela" },
          ],
        }
      : {
          question: "¿Qué símbolo ocupaba la posición 3?",
          options: ["🪄 Varita", "🦉 Búho", "🧹 Escoba", "🕯️ Vela"],
        }),
    ...(isResults
      ? {
          correctAnswer: 0,
          results: [
            {
              playerId: "player-0",
              nickname: players[0].nickname,
              earned: 25,
              correct: true,
              basePoints: 25,
              speedBonus: 0,
              penalty: 0,
            },
          ],
        }
      : {}),
  });
}
if (scene === "surprise")
  Object.assign(challenge, {
    kind: "surprise",
    mode: "event",
    participantIds: [],
    participantCount: 0,
    points: 0,
    wrongPenalty: 0,
    maxSpeedBonus: 0,
    question: undefined,
    options: undefined,
    eventTitle: "Escarbato travieso",
    eventDescription: "Tu escarbato toma hasta 10 monedas del rival.",
    results: players.map((player, index) => ({
      playerId: player.id,
      nickname: player.nickname,
      earned: index === 0 ? 10 : -10,
    })),
  });

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
      mySocketId={
        scene === "solo-watch" || scene === "memory-watch"
          ? "player-1"
          : "player-0"
      }
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
