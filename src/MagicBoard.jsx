
import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import MagicCharacter from "./MagicCharacter";
import "./MagicBoard.css";

const TOTAL = 24;
const STEP_DURATION = 420;

const path = [
  [9, 82], [21, 82], [33, 82], [45, 82],
  [57, 82], [69, 82], [81, 82], [90, 70],
  [81, 58], [69, 58], [57, 58], [45, 58],
  [33, 58], [21, 58], [10, 46], [21, 34],
  [33, 34], [45, 34], [57, 34], [69, 34],
  [81, 34], [90, 22], [78, 12], [65, 12],
];

const spaces = Array.from({ length: TOTAL }, (_, i) => {
  const number = i + 1;

  if (number === TOTAL) {
    return { number, type: "finish", icon: "🏰" };
  }

  if (number % 7 === 0) {
    return { number, type: "trap", icon: "🕷️" };
  }

  if (number % 5 === 0) {
    return { number, type: "bonus", icon: "⭐" };
  }

  if (number % 3 === 0) {
    return { number, type: "challenge", icon: "🪄" };
  }

  return { number, type: "normal", icon: "✨" };
});

function getCoordinates(position) {
  if (position === 0) return [5, 82];

  const safe = Math.max(
    1,
    Math.min(TOTAL, Number(position) || 1)
  );

  return path[safe - 1];
}

function CharacterAvatar({ character, size = 70 }) {
  return (
    <MagicCharacter
      size={size}
      primary={character?.primary}
      secondary={character?.secondary}
      hair={character?.hair}
      skin={character?.skin}
      eyes={character?.eyes}
      hairstyle={character?.hairstyle}
    />
  );
}

// ==========================================
// MOVIMIENTO ANIMADO DE LOS JUGADORES
// ==========================================

function AnimatedToken({ player, index, resetKey }) {
  const targetSteps = Number(player.totalSteps) || 0;

  const [visualSteps, setVisualSteps] = useState(targetSteps);
  const [trail, setTrail] = useState([]);
  const [moving, setMoving] = useState(false);

  const currentRef = useRef(targetSteps);
  const previousResetRef = useRef(resetKey);
  const timerRef = useRef(null);
  const trailTimersRef = useRef([]);
  const trailIdRef = useRef(0);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Al reiniciar, regresar al inicio.
    if (previousResetRef.current !== resetKey) {
      previousResetRef.current = resetKey;

      trailTimersRef.current.forEach(clearTimeout);
      trailTimersRef.current = [];

      currentRef.current = targetSteps;
      setVisualSteps(targetSteps);
      setTrail([]);
      setMoving(false);
      return;
    }

    // Sincronizar si el contador retrocede.
    if (targetSteps < currentRef.current) {
      currentRef.current = targetSteps;
      setVisualSteps(targetSteps);
      setMoving(false);
      setTrail([]);
      return;
    }

    if (targetSteps === currentRef.current) {
      setMoving(false);
      return;
    }

    let cancelled = false;
    setMoving(true);

    function advance() {
      if (cancelled) return;

      if (currentRef.current >= targetSteps) {
        setMoving(false);
        timerRef.current = null;
        return;
      }

      const previous = currentRef.current;
      const next = previous + 1;

      currentRef.current = next;
      setVisualSteps(next);

      const previousPosition =
        previous === 0
          ? 0
          : ((previous - 1) % TOTAL) + 1;

      const [x, y] = getCoordinates(previousPosition);
      const id = ++trailIdRef.current;

      setTrail((items) => [
        ...items.slice(-8),
        { id, x, y },
      ]);

      const trailTimer = setTimeout(() => {
        setTrail((items) =>
          items.filter((star) => star.id !== id)
        );
      }, 800);

      trailTimersRef.current.push(trailTimer);

      timerRef.current = setTimeout(
        advance,
        STEP_DURATION
      );
    }

    advance();

    return () => {
      cancelled = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [targetSteps, resetKey]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      trailTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const visualPosition =
    visualSteps === 0
      ? 0
      : ((visualSteps - 1) % TOTAL) + 1;

  const [x, y] = getCoordinates(visualPosition);

  return (
    <>
      {trail.map((star) => (
        <div
          key={star.id}
          className={`magic-trail magic-trail-${index + 1}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
          }}
        >
          ✦
        </div>
      ))}

      <div
        className={`moving-player player-${index + 1} ${
          moving ? "moving-player-animated" : ""
        }`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
        }}
      >
        <div className="moving-player-character">
          <CharacterAvatar
            character={player.character}
            size={70}
          />
        </div>

        <span className="moving-player-label">
          J{index + 1}
        </span>
      </div>
    </>
  );
}

// ==========================================
// VENTANA DE PREGUNTAS
// ==========================================

function ChallengeModal({
  challenge,
  mySocketId,
  onAnswer,
}) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isMyChallenge =
    challenge.playerId === mySocketId;

  function submitAnswer() {
    if (!isMyChallenge || selected === null || busy) {
      return;
    }

    setBusy(true);
    setError("");

    onAnswer(challenge.id, selected, (result) => {
      setBusy(false);

      if (!result?.ok) {
        setError(
          result?.error || "No se pudo enviar la respuesta."
        );
      }
    });
  }

  return (
    <div className="challenge-overlay">
      <div
        className="challenge-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reto de Harry Potter"
      >
        <div className="challenge-icon">🪄</div>

        <h2>Desafío de Hogwarts</h2>

        <div className="challenge-meta">
          <span>{challenge.difficulty}</span>
          <span>⭐ {challenge.points} puntos</span>
        </div>

        <p className="challenge-question">
          {challenge.question}
        </p>

        {!isMyChallenge && (
          <p className="challenge-waiting">
            ⏳ El otro jugador está respondiendo...
          </p>
        )}

        <div className="challenge-options">
          {challenge.options.map((option, index) => (
            <button
              key={index}
              type="button"
              className={`challenge-option ${
                selected === index ? "selected" : ""
              }`}
              disabled={!isMyChallenge || busy}
              onClick={() => setSelected(index)}
            >
              <span className="challenge-letter">
                {String.fromCharCode(65 + index)}
              </span>

              <span>{option}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="room-error" role="alert">
            ⚠️ {error}
          </p>
        )}

        {isMyChallenge ? (
          <button
            type="button"
            className="primary challenge-submit"
            disabled={selected === null || busy}
            onClick={submitAnswer}
          >
            {busy ? "Comprobando..." : "✨ Responder"}
          </button>
        ) : (
          <p className="challenge-waiting">
            Esperando la respuesta...
          </p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// TABLERO PRINCIPAL
// ==========================================

export default function MagicBoard({
  game,
  mySocketId,
  isHost,
  onRollDice,
  onRestart,
  onBack,
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const previousRollRef = useRef(game?.rollNumber ?? 0);

  useEffect(() => {
    const current = game?.rollNumber ?? 0;

    if (current === 0 && previousRollRef.current !== 0) {
      setResetKey((value) => value + 1);
    }

    previousRollRef.current = current;
  }, [game?.rollNumber]);

  if (!game) {
    return (
      <section className="magic-board-screen">
        <h2>🏰 Preparando el tablero...</h2>
      </section>
    );
  }

  const players = Array.isArray(game.players)
    ? game.players
    : [];

  if (players.length !== 2) {
    return (
      <section className="magic-board-screen">
        <h2>🏰 Esperando jugadores...</h2>

        <button className="secondary" onClick={onBack}>
          ← Salir
        </button>
      </section>
    );
  }

  const turn = game.turn ?? 0;
  const dice = game.dice ?? null;
  const winner = game.winner ?? null;
  const challenge = game.challenge ?? null;

  const current = players[turn] || players[0];

  const myPlayer = players.find(
    (player) => player.id === mySocketId
  );

  const winningPlayer =
    winner === null ? null : players[winner] || null;

  const trophyPrice = game.trophyPrice ?? 100;
  const trophiesToWin = game.trophiesToWin ?? 2;

  const isMyTurn =
    winner === null &&
    !challenge &&
    current.id === mySocketId;

  const canBuyTrophy =
    Boolean(myPlayer) &&
    winner === null &&
    !challenge &&
    !busy &&
    (myPlayer.points ?? 0) >= trophyPrice &&
    (myPlayer.trophies ?? 0) < trophiesToWin;

  function performAction(action) {
    if (busy || typeof action !== "function") return;

    setBusy(true);
    setError("");

    action((result) => {
      setBusy(false);

      if (!result?.ok) {
        setError(
          result?.error || "No se pudo completar la acción."
        );
      }
    });
  }

  function answerChallenge(challengeId, answer, done) {
    socket.timeout(10000).emit(
      "answer-challenge",
      { challengeId, answer },
      (timeoutError, result) => {
        if (timeoutError) {
          done({
            ok: false,
            error: "El servidor no respondió.",
          });
          return;
        }

        done(result);
      }
    );
  }

  function buyTrophy() {
    if (!canBuyTrophy) return;

    performAction((done) => {
      socket.timeout(10000).emit(
        "buy-trophy",
        {},
        (timeoutError, result) => {
          if (timeoutError) {
            done({
              ok: false,
              error: "El servidor no respondió.",
            });
            return;
          }

          done(result);
        }
      );
    });
  }

  return (
    <section className="magic-board-screen">

      {/* ENCABEZADO */}

      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← Salir de la partida
      </button>

      <h2>🏰 El tablero mágico</h2>

      <p className="board-turn-description">
        {winningPlayer
          ? "🏆 ¡La aventura ha terminado!"
          : challenge
          ? "🪄 ¡Hay un reto mágico pendiente!"
          : isMyTurn
          ? "🎲 ¡Es tu turno!"
          : `⏳ Esperando a ${current.nickname}`}
      </p>

      <p className="trophy-goal">
        🏆 Consigue {trophiesToWin} trofeos para ganar.
        Cada uno cuesta {trophyPrice} ⭐.
      </p>

      {/* TARJETAS DE LOS JUGADORES */}

      <div className="board-players">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`board-player ${
              turn === index && winner === null
                ? "board-player-active"
                : ""
            }`}
          >
            <CharacterAvatar
              character={player.character}
              size={85}
            />

            <div>
              <h3>{player.nickname}</h3>

              <p>
                {player.character?.name ?? "Estudiante"}
                {" · "}
                {player.character?.house ?? "Hogwarts"}
              </p>

              <strong>
                ⭐ {player.points ?? 0} puntos
              </strong>

              <p>
                🏆 {player.trophies ?? 0}/{trophiesToWin} trofeos
              </p>

              <p>
                Casilla: {player.position ?? 0}/{TOTAL}
              </p>

              <p>
                🔄 Vueltas: {player.laps ?? 0}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CONTENEDOR DEL TABLERO Y LOS CONTROLES */}

      <div className="board-game-layout">

        {/* TABLERO */}

        <div className="board-landscape">
          <div className="board-moon">☾</div>
          <div className="board-castle">🏰</div>
          <div className="board-trees">🌲 🌲 🌲</div>

          <svg
            className="board-path"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={path
                .map(([x, y]) => `${x * 10},${y * 6}`)
                .join(" ")}
              fill="none"
              stroke="#12132c"
              strokeWidth="65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <polyline
              points={path
                .map(([x, y]) => `${x * 10},${y * 6}`)
                .join(" ")}
              fill="none"
              stroke="#b9945d"
              strokeWidth="48"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* LAS 24 CASILLAS */}

          {spaces.map((space, index) => {
            const [x, y] = path[index];

            return (
              <div
                key={space.number}
                className={`path-space ${space.type}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                <small>{space.number}</small>
                <span>{space.icon}</span>
              </div>
            );
          })}

          {/* FICHAS ANIMADAS */}

          {players.map((player, index) => (
            <AnimatedToken
              key={player.id}
              player={player}
              index={index}
              resetKey={resetKey}
            />
          ))}
        </div>

        {/* CONTROLES */}

        <div className="board-controls">
          {winningPlayer ? (
            <div className="board-victory">
              <h2>🏆 ¡Tenemos un ganador!</h2>
              <h3>{winningPlayer.nickname}</h3>

              <p>
                {winningPlayer.character?.name ?? "Estudiante"}
                {" · "}
                {winningPlayer.character?.house ?? "Hogwarts"}
              </p>

              <strong>
                🏆 {winningPlayer.trophies} trofeos
              </strong>
            </div>
          ) : (
            <h3>🎮 Turno de {current.nickname}</h3>
          )}

          <div
            key={game.rollNumber ?? 0}
            className="dice-display magical-dice"
          >
            <span className="dice-sparkle">✦</span>
            <span className="dice-number">
              {dice === null ? "🎲" : `🎲 ${dice}`}
            </span>
            <span className="dice-sparkle">✧</span>
          </div>

          <p className="board-message" role="status">
            {game.message}
          </p>

          {error && (
            <p className="room-error" role="alert">
              ⚠️ {error}
            </p>
          )}

          <button
            type="button"
            className="primary"
            disabled={!isMyTurn || busy}
            onClick={() => performAction(onRollDice)}
          >
            {busy
              ? "Procesando..."
              : winningPlayer
              ? "🏆 Partida terminada"
              : challenge
              ? "🪄 Resuelve el reto"
              : isMyTurn
              ? "🎲 Lanzar dado"
              : "⏳ Esperando tu turno"}
          </button>

          {/* TIENDA DE TROFEOS */}

          <div className="trophy-shop">
            <h3>🏆 Tienda de trofeos</h3>

            <p>
              Tus puntos: ⭐ {myPlayer?.points ?? 0}
            </p>

            <p>
              Tus trofeos: 🏆 {myPlayer?.trophies ?? 0}/
              {trophiesToWin}
            </p>

            <button
              type="button"
              className="primary trophy-buy-button"
              disabled={!canBuyTrophy}
              onClick={buyTrophy}
            >
              🏆 Comprar trofeo — {trophyPrice} ⭐
            </button>

            {!winningPlayer &&
              !challenge &&
              (myPlayer?.points ?? 0) < trophyPrice && (
                <p className="trophy-hint">
                  Te faltan{" "}
                  {trophyPrice - (myPlayer?.points ?? 0)}{" "}
                  puntos para comprar un trofeo.
                </p>
              )}
          </div>

          {isHost && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => performAction(onRestart)}
            >
              ↻ Reiniciar partida para ambos
            </button>
          )}
        </div>

      </div>
      {/* FIN DE board-game-layout */}

      {/* PREGUNTA ALEATORIA */}

      {challenge && (
        <ChallengeModal
          key={challenge.id}
          challenge={challenge}
          mySocketId={mySocketId}
          onAnswer={answerChallenge}
        />
      )}
    </section>
  );
}
