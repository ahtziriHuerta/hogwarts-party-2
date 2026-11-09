// Símbolos vectoriales del tablero: se mantienen nítidos incluso en un celular.
export default function BoardIcon({ type, className = "" }) {
  const symbols = {
    solo: (
      <>
        <path d="m7 25 17-17 4 4-17 17Z" />
        <path d="m20 12 4 4M10 6v5M7.5 8.5h5M28 22v6M25 25h6M21 2v4M19 4h4" />
      </>
    ),
    duel: (
      <>
        <path d="m6 27 20-20 3 3-20 20ZM7 7l8 8m6 6 8 8-3 3-8-8M4 10l6-6M25 26l5-5" />
        <path d="m19 3-4 6h5l-3 5" />
      </>
    ),
    memory: (
      <>
        <path d="M17 8C12 4 6 5 4 7v21c4-2 8-2 13 1 5-3 9-3 13-1V7c-2-2-8-3-13 1Zm0 0v21M8 11l5 1M8 16l5 1M8 21l5 1" />
        <path d="m24 11 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L19 14.5l3.5-.5Z" />
      </>
    ),
    surprise: (
      <>
        <path d="M5 13h24v16H5ZM3 9h28v6H3ZM17 9v20M5 21h24" />
        <path d="M17 9C7 11 7 1 12 3c3 1 5 6 5 6Zm0 0c10 2 10-8 5-6-3 1-5 6-5 6Z" />
      </>
    ),
    bonus: (
      <>
        <circle cx="17" cy="17" r="13" />
        <circle cx="17" cy="17" r="9" />
        <path d="m17 10 2 4 4 .5-3 3 .5 4.5-3.5-2-3.5 2 .5-4.5-3-3 4-.5Z" />
      </>
    ),
    trap: (
      <>
        <ellipse cx="17" cy="21" rx="5" ry="7" />
        <circle cx="17" cy="11" r="3" />
        <path d="m12 17-5-4V8m5 13-7-2-2-5m9 11-6 2-3 4m19-14 5-4V8m-5 13 7-2 2-5m-9 11 6 2 3 4M17 2v6" />
      </>
    ),
    finish: (
      <>
        <path d="M5 29V14h7v15m10 0V14h7v15M12 29V10h10v19ZM3 14l5-7 6 7m6 0 6-7 5 7M10 10l7-8 7 8M15 29v-6a2 2 0 0 1 4 0v6M16 14h2m-2 4h2M3 30h28" />
      </>
    ),
    normal: (
      <>
        <path d="m17 3 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" />
        <path d="m27 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
      </>
    ),
    trophy: (
      <>
        <path d="M10 4h14v10c0 6-14 6-14 0ZM10 7H4v4c0 5 6 6 7 6m13-10h6v4c0 5-6 6-7 6M17 19v8m-6 3h12m-11-3h10" />
        <path d="m17 7 1.5 3 3.5.5-2.5 2.5.5 3-3-1.5-3 1.5.5-3-2.5-2.5 3.5-.5Z" />
      </>
    ),
    dice: (
      <>
        <rect x="4" y="4" width="26" height="26" rx="6" />
        <path
          d="M11 10h.1M23 10h.1M17 17h.1M11 24h.1M23 24h.1"
          strokeWidth="3.5"
        />
      </>
    ),
  };
  return (
    <svg
      className={`board-icon ${className}`}
      viewBox="0 0 34 34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {symbols[type] ?? symbols.normal}
    </svg>
  );
}
