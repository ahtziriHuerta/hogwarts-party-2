
import { socket } from "./socket";

export default function RoomLobby({
  room,
  onBack,
  onChooseCharacter,
  onStartGame,
  error,
}) {
  if (!room) return null;

  const isHost = room.players[0]?.id === socket.id;
  const isFull = room.players.length === 2;
  const allSelected =
    isFull && room.players.every((p) => p.character);

  const myPlayer = room.players.find(
    (p) => p.id === socket.id
  );

  return (
    <section className="welcome room-lobby">
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← Salir de la sala
      </button>

      <div className="castle">🏰</div>
      <h2>¡Sala mágica creada!</h2>

      <p className="description">
        Comparte este código con el segundo jugador.
      </p>

      <div className="room-code-display">
        <span>CÓDIGO DE SALA</span>
        <h1>{room.code}</h1>

        <button
          type="button"
          className="secondary"
          onClick={() =>
            navigator.clipboard.writeText(room.code)
          }
        >
          📋 Copiar código
        </button>
      </div>

      <h3>
        Jugadores conectados ({room.players.length}/2)
      </h3>

      <div className="room-player-list">
        {room.players.map((player, index) => (
          <div key={player.id} className="room-player">
            🧙 Jugador {index + 1}: {player.nickname}

            <p>
              {player.character
                ? `✨ ${player.character.name} · ${player.character.house}`
                : "⏳ Sin personaje"}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p className="room-error" role="alert">
          ⚠️ {error}
        </p>
      )}

      {!isFull ? (
        <p className="description">
          ⏳ Esperando al segundo jugador...
        </p>
      ) : (
        <>
          <p className="description">
            ✨ ¡Los dos jugadores están conectados!
          </p>

          <button
            type="button"
            className="secondary"
            onClick={onChooseCharacter}
          >
            {myPlayer?.character
              ? "🪄 Cambiar mi personaje"
              : "🪄 Elegir personaje"}
          </button>

          {allSelected ? (
            isHost ? (
              <button
                type="button"
                className="primary"
                onClick={onStartGame}
              >
                🏰 Comenzar aventura
              </button>
            ) : (
              <p className="description">
                ⏳ Esperando que el creador inicie la aventura...
              </p>
            )
          ) : (
            <p className="description">
              Ambos deben elegir personaje para comenzar.
            </p>
          )}
        </>
      )}
    </section>
  );
}
