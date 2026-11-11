import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LightningChallenge from "../../src/LightningChallenge";
import questions from "../../server/media-questions.json";
import "../../src/index.css";
import "../../src/App.css";
import "../../src/MagicBoard.css";

const scene = new URLSearchParams(location.search).get("scene");
const source =
  questions[
    scene === "video"
      ? 10
      : scene === "video2"
        ? 11
        : Number(new URLSearchParams(location.search).get("index") ?? 0)
  ];
const fallback = {
  question: "¿Qué casa valora la valentía?",
  options: ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"],
};
window.mediaEvents = [];
export default function Fixture() {
  const [challenge, setChallenge] = useState(null);
  function start() {
    const now = Date.now();
    setChallenge({
      ...source,
      id: "media-fixture",
      phase: "loading",
      mode: "solo",
      mediaType: source.media.type,
      question: undefined,
      options: undefined,
      serverNow: now,
      preparationUntil: now + 10000,
      participantIds: ["host"],
      answeredPlayerIds: [],
      readyPlayerIds: [],
      viewedPlayerIds: [],
      participantCount: 1,
      playerName: "Luna",
      wrongPenalty: 0,
      maxSpeedBonus: 0,
      points: 20,
      durationMs: 20000,
    });
  }
  function status(_id, status, done) {
    window.mediaEvents.push(status);
    const now = Date.now();
    setChallenge((c) =>
      status === "failed"
        ? {
            ...c,
            ...fallback,
            id: "text-fallback",
            kind: "trivia",
            media: undefined,
            phase: "answering",
            notice: "Recurso no disponible: seguimos con una trivia.",
            serverNow: now,
            deadlineAt: now + 20000,
          }
        : status === "ready" && source.media.type === "video"
          ? {
              ...c,
              phase: "watching",
              readyPlayerIds: ["host"],
              preparationUntil: now + 20000,
              serverNow: now,
            }
          : {
              ...c,
              phase: "answering",
              question: source.question,
              options: source.options,
              readyPlayerIds: ["host"],
              media: source.media.type === "image" ? source.media : undefined,
              deadlineAt: now + 20000,
              serverNow: now,
            },
    );
    done({ ok: true });
  }
  return (
    <main className="game">
      <button onClick={start} className="primary">
        Probar reto visual
      </button>
      {challenge && (
        <LightningChallenge
          key={challenge.id}
          challenge={challenge}
          mySocketId="host"
          onMediaStatus={status}
          onAnswer={(_id, _answer, done) => {
            setChallenge((c) => ({ ...c, answeredPlayerIds: ["host"] }));
            done({ ok: true });
          }}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<Fixture />);
