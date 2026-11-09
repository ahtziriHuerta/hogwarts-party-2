import { useEffect, useRef, useState } from "react";
import "./App.css";
import CharacterSelection from "./CharacterSelection";
import MagicBoard from "./MagicBoard";
import RoomLobby from "./RoomLobby";
import board from "../shared/board.json";
import { socket } from "./socket";

function App() {
  const [screen, setScreen] = useState("home");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setRoom(null);
      setScreen("home");
      setError("Se perdió la conexión con el servidor.");
    };

    socket.on("room-updated", handleRoomUpdated);
    socket.on("disconnect", handleDisconnect);

    socket.connect();

    return () => {
      // Cada intento elimina sus listeners: una reconexión no debe repetir solicitudes.
      pendingConnection.current?.();
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

    const eventName = creating ? "create-room" : "join-room";

    const payload = creating
      ? { nickname: name }
      : {
          nickname: name,
          code: roomCode.trim().toUpperCase(),
        };

    const sendRoomRequest = () => {
      socket
        .timeout(15000)
        .emit(eventName, payload, (timeoutError, response) => {
          setLoading(false);

          if (timeoutError) {
            console.error("Error al crear/unirse a sala:", timeoutError);
            setError("El servidor no respondió a la solicitud.");
            return;
          }

          if (!response?.ok) {
            setError(response?.error || "No se pudo entrar a la sala.");
            return;
          }

          setRoom(response.room);
          setRoomCode(response.room.code);
          setScreen("lobby");
        });
    };

    if (socket.connected) {
      sendRoomRequest();
    } else {
      // Cada intento elimina sus listeners: una reconexión no debe repetir solicitudes.
      pendingConnection.current?.();
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
        pendingConnection.current = null;
      };
      const onConnect = () => {
        cleanup();
        sendRoomRequest();
      };
      const onError = () => {
        cleanup();
        setLoading(false);
        setError(
          "No se pudo conectar. Comprueba tu conexión y vuelve a intentar.",
        );
      };
      pendingConnection.current = cleanup;
      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
      timer = setTimeout(onError, 20000);
      socket.connect();
    }
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
              <span>2 jugadores</span>
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
                <li>Crea una sala y comparte el código con tu compañero.</li>
                <li>Elijan sus personajes. El creador inicia la aventura.</li>
                <li>
                  Lancen el dado por turnos. Hay retos individuales sin
                  penalización y duelos contra el rival: fallar resta 10
                  monedas.
                </li>
                <li>
                  Compra un trofeo con 100 monedas. ¡El primero en conseguir dos
                  gana!
                </li>
              </ol>
            </dialog>
            <p className="footer">Una aventura mágica multijugador</p>
          </div>
        </section>
      )}

      {/* CREAR SALA O UNIRSE */}
      {(screen === "create" || screen === "join") && (
        <section className="welcome room-form">
          <button
            type="button"
            className="back-button"
            disabled={loading}
            onClick={() => {
              setError("");
              setScreen("home");
            }}
          >
            ← Volver
          </button>

          <header className="room-form-intro">
            <div className="castle" aria-hidden="true">
              🧙‍♂️
            </div>

            <h2>
              {screen === "create" ? "Crear sala mágica" : "Unirse a sala"}
            </h2>

            <p className="description">
              {screen === "create"
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
        <CharacterSelection
          error={error}
          nickname={nickname}
          playerNumber={
            room.players.findIndex((player) => player.id === socket.id) + 1
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
