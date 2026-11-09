import { useState } from "react";
import { socket } from "./socket";

export default function RoomLobby({
  room,
  onBack,
  onChooseCharacter,
  onStartGame,
  error,
}) {
  const [copyMessage, setCopyMessage] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopyMessage("¡Código copiado!");
    } catch {
      setCopyMessage("Selecciona el código para copiarlo.");
    }
  }

  if (!room) return null;

  const isHost = room.players[0]?.id === socket.id;
  const isFull = room.players.length === 2;
  const allSelected =
    isFull && room.players.every((player) => player.character);
  const myPlayer = room.players.find((player) => player.id === socket.id);
  const status = !isFull
    ? "⏳ Esperando al segundo jugador…"
    : !allSelected
      ? "Ambos deben elegir personaje para comenzar."
      : isHost
        ? "✨ ¡Todo listo para comenzar!"
        : "⏳ Esperando que el creador inicie la aventura…";

  return (
    <section className="welcome room-lobby">
      <header className="lobby-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Salir de la sala
        </button>
        <h2>🏰 Sala de espera</h2>
      </header>

      {/* Código y jugadores comparten una fila en horizontal; las acciones tienen su propia fila. */}
      <div className="lobby-layout">
        <div className="room-code-display">
          <span>COMPARTE EL CÓDIGO</span>
          <h1>{room.code}</h1>
          <button type="button" className="secondary" onClick={copyCode}>
            📋 Copiar código
          </button>
          <span className="copy-feedback" role="status">
            {copyMessage}
          </span>
        </div>

        <section
          className="lobby-players"
          aria-labelledby="lobby-players-title"
        >
          <h3 id="lobby-players-title">Jugadores ({room.players.length}/2)</h3>
          <div className="room-player-list">
            {room.players.map((player, index) => (
              <div key={player.id} className="room-player">
                <strong title={player.nickname}>
                  🧙 J{index + 1} · {player.nickname}
                </strong>
                <p>
                  {player.character
                    ? `✨ ${player.character.name} · ${player.character.house}`
                    : "⏳ Sin personaje"}
                </p>
              </div>
            ))}
            {!isFull && (
              <div className="room-player empty-slot">
                <strong>🪄 Jugador 2 · Libre</strong>
                <p>Invita a tu compañero con el código.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="lobby-actions">
        <p
          className={error ? "room-error" : "lobby-status"}
          role={error ? "alert" : "status"}
        >
          {error || status}
        </p>
        {isFull && (
          <div className="lobby-buttons">
            <button
              type="button"
              className="secondary"
              onClick={onChooseCharacter}
            >
              {myPlayer?.character
                ? "🪄 Cambiar mi personaje"
                : "🪄 Elegir personaje"}
            </button>
            {allSelected && isHost && (
              <button type="button" className="primary" onClick={onStartGame}>
                🏰 Comenzar aventura
              </button>
            )}
          </div>
        )}
      </footer>
    </section>
  );
}
