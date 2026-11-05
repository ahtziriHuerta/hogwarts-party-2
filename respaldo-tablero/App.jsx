
import { useState } from "react";
import "./App.css";
import MagicCharacter from "./MagicCharacter";
import CharacterSelection from "./CharacterSelection";
import MagicBoard from "./MagicBoard";

function App() {
  const [screen, setScreen] = useState("home");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [entryMode, setEntryMode] = useState("create");

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
              className="primary"
              onClick={() => {
                setEntryMode("create");
                setRoomCode("");
                setScreen("create");
              }}
            >
              ✨ Crear partida
            </button>

            <button
              className="secondary"
              onClick={() => {
                setEntryMode("join");
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

      {/* CREAR O UNIRSE A PARTIDA */}
      {(screen === "create" || screen === "join") && (
        <section className="welcome room-form">
          <button
            className="back-button"
            onClick={() => setScreen("home")}
          >
            ← Volver
          </button>

          <div className="castle">🪄</div>

          <h2>
            {screen === "create"
              ? "Crear partida"
              : "Unirse a partida"}
          </h2>

          {screen === "create" && (
            <MagicCharacter size={180} />
          )}

          <p className="description">
            {screen === "create"
              ? "Prepárate para comenzar una aventura mágica."
              : "Ingresa el código que te compartió tu amigo."}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();

              if (!nickname.trim()) return;

              if (screen === "join" && !roomCode.trim()) {
                return;
              }

              setScreen("characters");
            }}
          >
            <label htmlFor="nickname">
              Tu nombre de jugador
            </label>

            <input
              id="nickname"
              type="text"
              placeholder="Ej. Ahtziri"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
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
                  placeholder="Ej. ABCD"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) =>
                    setRoomCode(e.target.value.toUpperCase())
                  }
                  required
                />
              </>
            )}

            <button
              type="submit"
              className="primary continue-button"
              disabled={
                !nickname.trim() ||
                (screen === "join" && !roomCode.trim())
              }
            >
              Continuar ✨
            </button>
          </form>
        </section>
      )}

      {/* SELECCIÓN DE PERSONAJES */}
      {screen === "characters" && (
        <CharacterSelection
          nickname={nickname}
          onBack={() => setScreen(entryMode)}
          onNext={(character) => {
            setSelectedCharacter(character);
            setScreen("ready");
          }}
        />
      )}

      {/* PERSONAJE LISTO */}
      {screen === "ready" && selectedCharacter && (
        <section className="welcome">

          <h2>¡Tu estudiante está listo!</h2>

          <MagicCharacter
            size={180}
            primary={selectedCharacter.primary}
            secondary={selectedCharacter.secondary}
            hair={selectedCharacter.hair}
            skin={selectedCharacter.skin}
            eyes={selectedCharacter.eyes}
            hairstyle={selectedCharacter.hairstyle}
          />

          <p className="description">
            {nickname}, elegiste a{" "}
            {selectedCharacter.name} de{" "}
            {selectedCharacter.house}.
          </p>

          <div className="buttons">
            <button
              className="secondary"
              onClick={() => setScreen("characters")}
            >
              ← Cambiar personaje
            </button>

            <button
              className="primary"
              onClick={() => setScreen("board")}
            >
              🏰 Comenzar aventura
            </button>
          </div>

        </section>
      )}

      {/* TABLERO MÁGICO */}
      {screen === "board" && selectedCharacter && (
        <MagicBoard
          nickname={nickname}
          character={selectedCharacter}
          onBack={() => setScreen("ready")}
        />
      )}

    </main>
  );
}

export default App;
