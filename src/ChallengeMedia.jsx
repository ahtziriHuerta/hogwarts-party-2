import { useRef, useState } from "react";

// Solo monta el archivo del reto activo. No descarga el resto del catálogo.
export default function ChallengeMedia({ challenge, mySocketId, onStatus }) {
  const video = useRef(null);
  const sent = useRef(new Set());
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const participant = challenge.participantIds.includes(mySocketId);
  const preparing = ["loading", "watching"].includes(challenge.phase);
  const media = challenge.media;

  function report(status) {
    if (!participant || !preparing || sent.current.has(status)) return;
    sent.current.add(status);
    onStatus(challenge.id, status, (result) => {
      if (!result?.ok) {
        sent.current.delete(status);
        setError(result?.error || "No se pudo avisar al servidor.");
      }
    });
  }

  function fail() {
    setError("No se pudo cargar el archivo.");
    report("failed");
  }

  async function play() {
    setError("");
    try {
      await video.current.play();
      setPlaying(true);
    } catch {
      fail();
    }
  }

  return (
    <div className="challenge-media">
      <div className="challenge-media-frame">
        {media.type === "image" ? (
          <img
            src={media.src}
            alt={media.alt}
            width="480"
            height="270"
            decoding="async"
            onLoad={() => report("ready")}
            onError={fail}
          />
        ) : (
          <>
            <video
              ref={video}
              src={media.src}
              aria-label={media.alt}
              width="480"
              height="270"
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              onCanPlayThrough={() => report("ready")}
              onError={fail}
              onEnded={() => {
                setPlaying(false);
                setFinished(true);
                report("viewed");
              }}
            />
            {!playing && !finished && !error && (
              <button
                type="button"
                className="primary media-play"
                disabled={challenge.phase !== "watching"}
                onClick={play}
              >
                ▶ Ver clip · {media.durationSeconds} s
              </button>
            )}
            {finished && <span className="media-waiting">Clip terminado</span>}
          </>
        )}
      </div>
      {error && (
        <p className="media-error" role="status">
          {error}{" "}
          {participant && preparing && (
            <button
              type="button"
              className="secondary"
              onClick={() => report("failed")}
            >
              Continuar con trivia
            </button>
          )}
        </p>
      )}
    </div>
  );
}
