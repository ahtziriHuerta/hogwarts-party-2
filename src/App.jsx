
import { useEffect, useState } from "react";
import "./App.css";
import CharacterSelection from "./CharacterSelection";
import MagicBoard from "./MagicBoard";
import RoomLobby from "./RoomLobby";
import { socket } from "./socket";

function App() {
  const [screen, setScreen] = useState("home");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // CONEXIÓN CON EL SERVIDOR
  useEffect(() => {
    const handleRoomUpdated = (updatedRoom) => {
      console.log("🏠 Sala actualizada:", updatedRoom);

      setRoom(updatedRoom);

      if (
        updatedRoom.status === "playing" ||
        updatedRoom.status === "finished"
      ) {
        setScreen("board");
      } else {
        setScreen((previous) =>
          previous === "board" ? "lobby" : previous
        );
      }
    };

    const handleDisconnect = () => {
      console.log("🔌 Servidor desconectado");
      setRoom(null);
      setScreen("home");
      setError("Se perdió la conexión con el servidor.");
    };

    socket.on("room-updated", handleRoomUpdated);
    socket.on("disconnect", handleDisconnect);

    socket.connect();

    return () => {
      socket.off("room-updated", handleRoomUpdated);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  // SALIR DE LA SALA
  function leaveRoom() {
    socket.disconnect();
    socket.connect();

    setRoom(null);
    setRoomCode("");
    setNickname("");
    setError("");
    setLoading(false);
    setScreen("home");
  }

  // CREAR SALA O UNIRSE
  function submitRoom(event) {
    event.preventDefault();

    const name = nickname.trim();

    if (!name || loading) return;

    const creating = screen === "create";

    if (!creating && !roomCode.trim()) {
      setError("Ingresa el código de la sala.");
      return;
    }

    setError("");
    setLoading(true);

    const eventName = creating
      ? "create-room"
      : "join-room";

    const payload = creating
      ? { nickname: name }
      : {
          nickname: name,
          code: roomCode.trim().toUpperCase(),
        };

    socket.timeout(5000).emit(
      eventName,
      payload,
      (timeoutError, response) => {
        setLoading(false);

        if (timeoutError) {
          setError("El servidor no respondió.");
          return;
        }

        if (!response?.ok) {
          setError(
            response?.error || "No se pudo entrar a la sala."
          );
          return;
        }

        console.log("✅ Sala creada o encontrada:", response.room);

        setRoom(response.room);
        setRoomCode(response.room.code);
        setScreen("lobby");
      }
    );
  }

  // SELECCIONAR PERSONAJE
  function selectCharacter(character) {
    setError("");

    socket.timeout(5000).emit(
      "select-character",
      { character },
      (timeoutError, response) => {
        if (timeoutError) {
          setError("El servidor no respondió.");
          return;
        }

        if (!response?.ok) {
          setError(
            response?.error || "No se pudo elegir personaje."
          );
          return;
        }

        setRoom(response.room);
        setScreen("lobby");
      }
    );
  }

  // INICIAR PARTIDA
  function startGame() {
    console.log("🏰 Comenzar aventura");

    setError("");

    socket.timeout(5000).emit(
      "start-game",
      {},
      (timeoutError, response) => {
        console.log("🎮 Respuesta del servidor:", response);

        if (timeoutError) {
          setError("El servidor no respondió.");
          return;
        }

        if (!response?.ok) {
          setError(
            response?.error || "No se pudo iniciar la partida."
          );
        }
      }
    );
  }

  // ACCIONES DEL TABLERO
  function sendGameAction(eventName, done) {
    socket.timeout(5000).emit(
      eventName,
      {},
      (timeoutError, response) => {
        if (timeoutError) {
          done?.({
            ok: false,
            error: "El servidor no respondió.",
          });
          return;
        }

        done?.(
          response || {
            ok: false,
            error: "Error desconocido.",
          }
        );
      }
    );
  }

  const isHost = room?.players?.[0]?.id === socket.id;

  return (
    <main className="game">

      {/* PANTALLA DE INICIO */}
      {screen === "home" && (
        <section className="welcome">
          <div className="castle">🏰</div>

          <p className="subtitle">
            EL MUNDO MÁGICO TE ESPERA
          </p>

          <h1>Hogwarts Party</h1>

          <p className="description">
            Lanza los dados, supera desafíos mágicos
            y compite por la Copa de Hogwarts.
          </p>

          <div className="buttons">
            <button
              type="button"
              className="primary"
              onClick={() => {
                setNickname("");
                setRoomCode("");
                setError("");
                setScreen("create");
              }}
            >
              ✨ Crear partida
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => {
                setNickname("");
                setRoomCode("");
                setError("");
                setScreen("join");
              }}
            >
              🪄 Unirse a partida
            </button>
          </div>

          <p className="footer">
            Una aventura mágica multijugador
          </p>
        </section>
      )}

      {/* CREAR SALA O UNIRSE */}
      {(screen === "create" || screen === "join") && (
        <section className="welcome room-form">

          <button
            type="button"
            className="back-button"
            onClick={() => {
              setError("");
              setScreen("home");
            }}
          >
            ← Volver
          </button>

          <div className="castle">🧙‍♂️</div>

          <h2>
            {screen === "create"
              ? "Crear sala mágica"
              : "Unirse a sala"}
          </h2>

          <p className="description">
            {screen === "create"
              ? "Escribe tu nombre para crear una sala y compartir el código."
              : "Escribe tu nombre y el código de la sala."}
          </p>

          <form onSubmit={submitRoom}>

            <label htmlFor="nickname">
              Tu nombre de jugador
            </label>

            <input
              id="nickname"
              type="text"
              placeholder="Ej. Ahtziri"
              maxLength={20}
              value={nickname}
              onChange={(event) =>
                setNickname(event.target.value)
              }
              required
            />

            {screen === "join" && (
              <>
                <label htmlFor="room-code">
                  Código de sala
                </label>

                <input
                  id="room-code"
                  type="text"
                  placeholder="Ej. ABC123"
                  maxLength={6}
                  value={roomCode}
                  onChange={(event) =>
                    setRoomCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  required
                />
              </>
            )}

            {error && (
              <p className="room-error" role="alert">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              className="primary continue-button"
              disabled={
                loading ||
                !nickname.trim() ||
                (screen === "join" && !roomCode.trim())
              }
            >
              {loading
                ? "Conectando..."
                : screen === "create"
                ? "✨ Crear sala"
                : "🪄 Unirse a sala"}
            </button>

          </form>
        </section>
      )}

      {/* SALA DE ESPERA */}
      {screen === "lobby" && room && (
        <RoomLobby
          room={room}
          error={error}
          onBack={leaveRoom}
          onChooseCharacter={() => {
            setError("");
            setScreen("characters");
          }}
          onStartGame={startGame}
        />
      )}

      {/* SELECCIÓN DE PERSONAJES */}
      {screen === "characters" && room && (
        <>
          {error && (
            <p className="room-error" role="alert">
              ⚠️ {error}
            </p>
          )}

          <CharacterSelection
            nickname={nickname}
            playerNumber={
              room.players.findIndex(
                (player) => player.id === socket.id
              ) + 1
            }
            takenCharacterIds={room.players
              .filter((player) => player.id !== socket.id)
              .map((player) => player.character?.id)
              .filter(Boolean)}
            onBack={() => {
              setError("");
              setScreen("lobby");
            }}
            onNext={selectCharacter}
          />
        </>
      )}

      {/* TABLERO MULTIJUGADOR */}
      {screen === "board" && (
        room?.game ? (
          <MagicBoard
            game={room.game}
            mySocketId={socket.id}
            isHost={isHost}
            onBack={leaveRoom}
            onRollDice={(done) =>
              sendGameAction("roll-dice", done)
            }
            onRestart={(done) =>
              sendGameAction("restart-game", done)
            }
          />
        ) : (
          <section className="welcome">
            <div className="castle">🏰</div>
            <h2>Preparando tablero...</h2>
            <p>Esperando información de la partida.</p>
          </section>
        )
      )}

    </main>
  );
}

export default App;
