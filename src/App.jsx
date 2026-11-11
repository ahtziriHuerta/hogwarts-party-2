import { useEffect, useRef, useState } from "react";
import "./App.css";
import CharacterSelection from "./CharacterSelection";
import MagicBoard from "./MagicBoard";
import RoomLobby from "./RoomLobby";
import board from "../shared/board.json";
import botLevels from "../shared/bot-levels.json";
import { socket } from "./socket";
import { requestRoom } from "./roomConnection";

function App() {
  const [screen, setScreen] = useState("home");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [difficulty, setDifficulty] = useState("wizard");

  const pendingConnection = useRef(null);
  const guideDialog = useRef(null);

  // CONEXIÓN CON EL SERVIDOR
  useEffect(() => {
    const handleRoomUpdated = (updatedRoom) => {
      setRoom(updatedRoom);

      if (
        updatedRoom.status === "playing" ||
        updatedRoom.status === "finished"
      ) {
        setScreen("board");
      } else {
        setScreen((previous) => (previous === "board" ? "lobby" : previous));
      }
    };

    const handleDisconnect = () => {
      pendingConnection.current?.();
      pendingConnection.current = null;
      setLoading(false);
      setConnectionMessage("");
      setRoom(null);
      setScreen((previous) =>
        ["board", "lobby", "characters"].includes(previous) ? "home" : previous,
      );
      setError("Se perdió la conexión con el servidor.");
    };

    socket.on("room-updated", handleRoomUpdated);
    socket.on("disconnect", handleDisconnect);

    socket.connect();

    return () => {
      // Cada intento elimina sus listeners: una reconexión no debe repetir solicitudes.
      pendingConnection.current?.();
      pendingConnection.current = null;
      socket.off("room-updated", handleRoomUpdated);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  // SALIR DE LA SALA
  function leaveRoom() {
    pendingConnection.current?.();
    pendingConnection.current = null;
    socket.disconnect();
    socket.connect();

    setRoom(null);
    setRoomCode("");
    setNickname("");
    setError("");
    setLoading(false);
    setConnectionMessage("");
    setScreen("home");
  }

  // CREAR SALA O UNIRSE
  function submitRoom(event) {
    event.preventDefault();

    const name = nickname.trim();

    if (!name || loading || pendingConnection.current) return;

    const solo = screen === "solo";
    const creating = screen === "create" || solo;

    if (!creating && !roomCode.trim()) {
      setError("Ingresa el código de la sala.");
      return;
    }

    setError("");
    setLoading(true);
    setConnectionMessage("");

    const eventName = solo
      ? "create-solo-room"
      : creating
        ? "create-room"
        : "join-room";

    const payload = creating
      ? { nickname: name, ...(solo ? { difficulty } : {}) }
      : {
          nickname: name,
          code: roomCode.trim().toUpperCase(),
        };

    pendingConnection.current = requestRoom(socket, eventName, payload, {
      onWaiting: setConnectionMessage,
      onResult: (response) => {
        pendingConnection.current = null;
        setLoading(false);
        if (!response?.ok) {
          setError(response?.error || "No se pudo entrar a la sala.");
          return;
        }
        setRoom(response.room);
        setRoomCode(response.room.code);
        setScreen("lobby");
      },
    });
  }

  // SELECCIONAR PERSONAJE
  function selectCharacter(character) {
    setError("");

    socket
      .timeout(5000)
      .emit("select-character", { character }, (timeoutError, response) => {
        if (timeoutError) {
          setError("El servidor no respondió.");
          return;
        }

        if (!response?.ok) {
          setError(response?.error || "No se pudo elegir personaje.");
          return;
        }

        setRoom(response.room);
        setScreen("lobby");
      });
  }

  // INICIAR PARTIDA
  function startGame() {
    setError("");

    socket.timeout(5000).emit("start-game", {}, (timeoutError, response) => {
      if (timeoutError) {
        setError("El servidor no respondió.");
        return;
      }

      if (!response?.ok) {
        setError(response?.error || "No se pudo iniciar la partida.");
      }
    });
  }

  // ACCIONES DEL TABLERO
  function sendGameAction(eventName, done) {
    socket.timeout(5000).emit(eventName, {}, (timeoutError, response) => {
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
        },
      );
    });
  }

  const isHost = room?.players?.[0]?.id === socket.id;

  return (
    <main className="game">
      {/* PANTALLA DE INICIO */}
      {screen === "home" && (
        <section className="welcome home-screen">
          <div className="home-intro">
            <div className="hero-crest" aria-hidden="true">
              🏰
            </div>

            <p className="subtitle">EL MUNDO MÁGICO TE ESPERA</p>

            <h1>Hogwarts Party</h1>

            <p className="description">
              Lanza los dados, supera desafíos mágicos y compite por la Copa de
              Hogwarts.
            </p>

            <div className="game-facts">
              <span>1–2 jugadores</span>
              <span>{board.length} casillas</span>
              <span>Una copa en juego</span>
            </div>
          </div>
          <div className="home-actions">
            {error && (
              <p className="room-error" role="alert">
                {error}
              </p>
            )}
            <div className="buttons">
              <button
                type="button"
                className="primary"
                aria-label="Jugar solo"
                onClick={() => {
                  setNickname("");
                  setRoomCode("");
                  setDifficulty("wizard");
                  setError("");
                  setScreen("solo");
                }}
              >
                🧙 Jugar solo
              </button>
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

            <button
              type="button"
              className="secondary rules-button"
              onClick={() => guideDialog.current.showModal()}
            >
              Cómo jugar
            </button>
            <dialog
              ref={guideDialog}
              className="welcome-guide"
              aria-labelledby="welcome-guide-title"
            >
              <header>
                <h2 id="welcome-guide-title">Cómo jugar</h2>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => guideDialog.current.close()}
                >
                  Cerrar
                </button>
              </header>
              <ol>
                <li>
                  Juega solo contra un rival automático o comparte una sala.
                </li>
                <li>Elijan sus personajes. El creador inicia la aventura.</li>
                <li>
                  Lancen el dado por turnos. Hay retos individuales sin
                  penalización y duelos contra el rival: fallar resta 10
                  monedas.
                </li>
                <li>
                  En Tienda, compra trofeos por 100 monedas. ¡Consigue dos y
                  gana!
                </li>
              </ol>
            </dialog>
            <p className="footer">Una aventura para uno o dos</p>
          </div>
        </section>
      )}

      {/* CREAR SALA O UNIRSE */}
      {["create", "join", "solo"].includes(screen) && (
        <section
          className={`welcome room-form ${screen === "solo" ? "solo-form" : ""}`}
        >
          <button
            type="button"
            className="back-button"
            onClick={() => {
              if (loading) leaveRoom();
              else {
                setError("");
                setConnectionMessage("");
                setScreen("home");
              }
            }}
          >
            {loading ? "← Cancelar" : "← Volver"}
          </button>

          <header className="room-form-intro">
            <div className="castle" aria-hidden="true">
              🧙‍♂️
            </div>

            <h2>
              {screen === "solo"
                ? "Jugar solo"
                : screen === "create"
                  ? "Crear sala mágica"
                  : "Unirse a sala"}
            </h2>

            <p className="description">
              {screen === "solo"
                ? "Elige la dificultad de tu rival automático. También puede equivocarse."
                : screen === "create"
                  ? "Escribe tu nombre para crear una sala y compartir el código."
                  : "Escribe tu nombre y el código de la sala."}
            </p>
          </header>
          <form onSubmit={submitRoom}>
            <div className="form-field">
              <label htmlFor="nickname">Tu nombre de jugador</label>

              <input
                id="nickname"
                type="text"
                placeholder="Ej. Ahtziri"
                maxLength={20}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                required
              />
            </div>
            {screen === "solo" && (
              <div className="form-field">
                <label htmlFor="bot-difficulty">Dificultad del rival</label>
                <select
                  id="bot-difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  {botLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
                <p className="difficulty-description">
                  {
                    botLevels.find((level) => level.id === difficulty)
                      .description
                  }
                </p>
              </div>
            )}
            {screen === "join" && (
              <div className="form-field">
                <label htmlFor="room-code">Código de sala</label>

                <input
                  id="room-code"
                  type="text"
                  placeholder="Ej. ABC123"
                  maxLength={6}
                  value={roomCode}
                  onChange={(event) =>
                    setRoomCode(event.target.value.toUpperCase())
                  }
                  required
                />
              </div>
            )}

            {connectionMessage && (
              <p className="connection-status" role="status">
                {connectionMessage}
              </p>
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
                : screen === "solo"
                  ? "🧙 Preparar aventura"
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
        <CharacterSelection
          error={error}
          nickname={nickname}
          playerNumber={
            room.players.findIndex((player) => player.id === socket.id) + 1
          }
          takenCharacterIds={room.players
            .filter((player) => player.id !== socket.id && !player.isBot)
            .map((player) => player.character?.id)
            .filter(Boolean)}
          onBack={() => {
            setError("");
            setScreen("lobby");
          }}
          onNext={selectCharacter}
        />
      )}

      {/* TABLERO MULTIJUGADOR */}
      {screen === "board" &&
        (room?.game ? (
          <MagicBoard
            game={room.game}
            mySocketId={socket.id}
            isHost={isHost}
            onBack={leaveRoom}
            onRollDice={(done) => sendGameAction("roll-dice", done)}
            onRestart={(done) => sendGameAction("restart-game", done)}
          />
        ) : (
          <section className="welcome">
            <div className="castle">🏰</div>
            <h2>Preparando tablero...</h2>
            <p>Esperando información de la partida.</p>
          </section>
        ))}
    </main>
  );
}

export default App;
