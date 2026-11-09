import { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import MagicCharacter from "./MagicCharacter";
import LightningChallenge from "./LightningChallenge";
import BoardScenery from "./BoardScenery";
import BoardIcon from "./BoardIcon";
import spaces from "../shared/board.json";
import { createBoardPath } from "../shared/board-layout";
import "./MagicBoard.css";

const TOTAL = spaces.length;
const STEP_DURATION = 420;

const path = createBoardPath(TOTAL);
// Curvas entre las mismas coordenadas que usan las casillas y las fichas.
const route = path
  .map(([x, y], index) => {
    if (index === 0) return `M${x * 10},${y * 6}`;
    const before = path[Math.max(0, index - 2)];
    const previous = path[index - 1];
    const after = path[Math.min(path.length - 1, index + 1)];
    return `C${(previous[0] + (x - before[0]) / 6) * 10},${(previous[1] + (y - before[1]) / 6) * 6} ${(x - (after[0] - previous[0]) / 6) * 10},${(y - (after[1] - previous[1]) / 6) * 6} ${x * 10},${y * 6}`;
  })
  .join(" ");

function getCoordinates(position) {
  if (position === 0) return [path[0][0] - 5.5, path[0][1]];

  const safe = Math.max(1, Math.min(TOTAL, Number(position) || 1));

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

// MOVIMIENTO ANIMADO DE LOS JUGADORES

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

    const movement = new AbortController();
    setMoving(true);

    function advance() {
      if (movement.signal.aborted) return;

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
        previous === 0 ? 0 : ((previous - 1) % TOTAL) + 1;

      const [x, y] = getCoordinates(previousPosition);
      const id = ++trailIdRef.current;

      setTrail((items) => [...items.slice(-8), { id, x, y }]);

      const trailTimer = setTimeout(() => {
        setTrail((items) => items.filter((star) => star.id !== id));
      }, 800);

      trailTimersRef.current.push(trailTimer);

      timerRef.current = setTimeout(advance, STEP_DURATION);
    }

    advance();

    return () => {
      movement.abort();

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
    visualSteps === 0 ? 0 : ((visualSteps - 1) % TOTAL) + 1;

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
          <CharacterAvatar character={player.character} size={70} />
        </div>

        <span className="moving-player-label">J{index + 1}</span>
      </div>
    </>
  );
}

// El diálogo nativo administra el foco, Escape y el regreso al botón de opciones.
function BoardOptions({ isHost, busy, onRestart, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="board-options"
      onClose={onClose}
      aria-labelledby="board-options-title"
    >
      <header>
        <h2 id="board-options-title">Guía de la partida</h2>
        <button
          type="button"
          className="secondary"
          onClick={() => dialog.current.close()}
        >
          Cerrar
        </button>
      </header>
      <p>{TOTAL} casillas · Gana dos trofeos de 100 monedas.</p>
      <ul>
        <li>🪙 Bono/vuelta: +20 monedas.</li>
        <li>🕷️ Trampa: −10; saldo mínimo 0.</li>
        <li>🪄 Individual, 20 s: +10–30; fallo sin pérdida.</li>
        <li>⚡ Duelo, 20 s: +10–40; fallo/tiempo −10.</li>
        <li>🧠 Memoria: observa 5 s; acierto +25, fallo 0.</li>
        <li>🎁 Sorpresa: premios, pérdidas o monedas del rival.</li>
      </ul>
      {isHost && (
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            onRestart();
            dialog.current.close();
          }}
        >
          ↻ Reiniciar partida para ambos
        </button>
      )}
    </dialog>
  );
}

// TABLERO PRINCIPAL

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
  const [showOptions, setShowOptions] = useState(false);

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

  const players = Array.isArray(game.players) ? game.players : [];

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

  const myPlayer = players.find((player) => player.id === mySocketId);

  const winningPlayer = winner === null ? null : players[winner] || null;

  const trophyPrice = game.trophyPrice ?? 100;
  const trophiesToWin = game.trophiesToWin ?? 2;

  const isMyTurn = winner === null && !challenge && current.id === mySocketId;

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
        setError(result?.error || "No se pudo completar la acción.");
      }
    });
  }

  function answerChallenge(challengeId, answer, done) {
    socket
      .timeout(10000)
      .emit(
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
        },
      );
  }

  function buyTrophy() {
    if (!canBuyTrophy) return;

    performAction((done) => {
      socket.timeout(10000).emit("buy-trophy", {}, (timeoutError, result) => {
        if (timeoutError) {
          done({
            ok: false,
            error: "El servidor no respondió.",
          });
          return;
        }

        done(result);
      });
    });
  }

  return (
    <section className="magic-board-screen">
      <header className="board-toolbar">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
          aria-label="Salir de la partida"
        >
          ← Salir
        </button>
        <div className="board-heading">
          <h2>Hogwarts Party</h2>
          <p className="board-turn-description" title={current.nickname}>
            {winningPlayer
              ? `🏆 Ganó ${winningPlayer.nickname}`
              : challenge
                ? challenge.kind === "surprise"
                  ? "🎁 Carta sorpresa"
                  : challenge.kind === "memory"
                    ? "🧠 Reto de memoria"
                    : challenge.mode === "solo"
                      ? "🪄 Reto individual"
                      : "⚡ Duelo contra rival"
                : isMyTurn
                  ? "🎲 ¡Es tu turno!"
                  : `⏳ Turno de ${current.nickname}`}
          </p>
        </div>
        <div
          className="dice-display"
          aria-label={`Último dado: ${dice ?? "sin lanzar"}`}
        >
          <BoardIcon type="dice" />
          <span className="dice-number">{dice ?? "–"}</span>
        </div>
        <button
          type="button"
          className="secondary board-options-button"
          aria-label="Opciones de la partida"
          onClick={() => setShowOptions(true)}
        >
          ☰ <span>Opciones</span>
        </button>
      </header>

      {/* TARJETAS DE LOS JUGADORES */}

      <div className="board-players">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`board-player ${
              turn === index && winner === null ? "board-player-active" : ""
            }`}
            style={{
              "--player-accent": player.character?.primary ?? "#edce87",
            }}
          >
            <CharacterAvatar character={player.character} size={85} />

            <div>
              <span className="player-status">
                {player.id === mySocketId ? "TÚ" : "COMPAÑERO"}
                {turn === index && winner === null ? " · EN TURNO" : ""}
              </span>
              <h3>{player.nickname}</h3>

              <p className="player-character">
                {player.character?.name ?? "Estudiante"} ·{" "}
                {player.character?.house ?? "Hogwarts"}
              </p>
              <div className="player-stats">
                <strong>
                  🪙 {player.points ?? 0}
                  <span className="stat-label"> monedas</span>
                </strong>
                <span>
                  🏆 {player.trophies ?? 0}/{trophiesToWin}
                </span>
                <span className="player-position">
                  Casilla {player.position ?? 0}/{TOTAL}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="board-legend" aria-label="Tipos de casilla">
        <span>
          <BoardIcon type="bonus" /> Bono +20
        </span>
        <span>
          <BoardIcon type="trap" /> Trampa −10
        </span>
        <span>
          <BoardIcon type="solo" /> Individual +10–30
        </span>
        <span>
          <BoardIcon type="duel" /> Duelo +10–40 / −10
        </span>
        <span>
          <BoardIcon type="memory" /> Memoria +25
        </span>
        <span>
          <BoardIcon type="surprise" /> Sorpresa
        </span>
        <span>
          <BoardIcon type="finish" /> Vuelta +20
        </span>
      </p>
      {/* CONTENEDOR DEL TABLERO Y LOS CONTROLES */}

      <div className="board-game-layout">
        {/* TABLERO */}

        <div className="board-landscape">
          <div className="board-map">
            <BoardScenery />
            <div className="map-place map-place-forest" aria-hidden="true">
              Bosque Prohibido
            </div>
            <div className="map-place map-place-lake" aria-hidden="true">
              Lago Negro
            </div>
            <div className="map-place map-place-castle" aria-hidden="true">
              Hogwarts
            </div>
            <svg
              className="board-path"
              viewBox="0 0 1000 600"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="route-shadow"
                d={route}
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="route-edge"
                d={route}
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="route-surface"
                d={route}
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="route-dashes"
                d={route}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* CASILLAS DEL MAPA COMPARTIDO */}

            {spaces.map((space, index) => {
              const [x, y] = path[index];

              return (
                <div
                  key={space.number}
                  className={`path-space ${space.type} ${current.position === space.number ? "space-current" : ""}`}
                  aria-label={`Casilla ${space.number}: ${
                    {
                      solo: "reto individual",
                      duel: "duelo contra rival",
                      memory: "reto de memoria",
                      surprise: "carta sorpresa",
                      bonus: "bono de 20 monedas",
                      trap: "trampa de 10 monedas",
                      normal: "camino",
                      finish: "vuelta completa",
                    }[space.type]
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                >
                  <small>{space.number}</small>
                  <BoardIcon type={space.type} />
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
        </div>

        {/* CONTROLES */}

        <div className="board-controls" data-finished={Boolean(winningPlayer)}>
          <div className="board-adventure" aria-hidden="true">
            <span className="adventure-caption">LA COPA TE ESPERA</span>
            <div className="adventure-crest">
              <BoardIcon type="trophy" />
            </div>
            <h3>Que comience la magia</h3>
            <p>Cada casilla, una nueva aventura.</p>
          </div>
          {winningPlayer && (
            <div className="board-victory">
              <h3>🏆 ¡Ganó {winningPlayer.nickname}!</h3>
              <p>La Copa de Hogwarts es tuya.</p>
            </div>
          )}

          <button
            type="button"
            className="primary board-roll-button"
            disabled={!isMyTurn || busy}
            onClick={() => performAction(onRollDice)}
          >
            <BoardIcon type="dice" />
            <span>
              {busy
                ? "Procesando..."
                : winningPlayer
                  ? "🏆 Partida terminada"
                  : challenge
                    ? "Actividad en curso"
                    : isMyTurn
                      ? "Lanzar dado"
                      : "⏳ Esperando tu turno"}
            </span>
          </button>

          {/* TIENDA DE TROFEOS */}

          <div className="trophy-shop">
            <p className="trophy-price">
              🏆 Meta: {trophiesToWin} trofeos · {trophyPrice} 🪙 c/u
            </p>
            <div className="trophy-progress" aria-hidden="true">
              <span
                style={{
                  width: `${Math.min(100, ((myPlayer?.points ?? 0) / trophyPrice) * 100)}%`,
                }}
              />
            </div>

            <button
              type="button"
              className="primary trophy-buy-button"
              disabled={!canBuyTrophy}
              onClick={buyTrophy}
            >
              <BoardIcon type="trophy" /> Comprar trofeo
            </button>

            {!winningPlayer &&
              !challenge &&
              (myPlayer?.points ?? 0) < trophyPrice && (
                <p className="trophy-hint">
                  Te faltan {trophyPrice - (myPlayer?.points ?? 0)} monedas para
                  comprar un trofeo.
                </p>
              )}
          </div>
        </div>
        <p className="board-message" role="status">
          {error || game.message}
        </p>
      </div>
      {/* FIN DE board-game-layout */}

      {showOptions && (
        <BoardOptions
          isHost={isHost}
          busy={busy}
          onRestart={() => performAction(onRestart)}
          onClose={() => setShowOptions(false)}
        />
      )}
      {/* PREGUNTA ALEATORIA */}

      {challenge && (
        <LightningChallenge
          key={challenge.id}
          challenge={challenge}
          mySocketId={mySocketId}
          onAnswer={answerChallenge}
        />
      )}
    </section>
  );
}
