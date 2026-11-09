export default function MagicCharacter({
  size = 150,
  primary = "#9e303e",
  secondary = "#e8b95b",
  hair = "#62453f",
  skin = "#f8d5ad",
  eyes = "#477e85",
  hairstyle = "short",
}) {
  // La parte trasera se dibuja antes del rostro; el flequillo va encima.
  // Así el pelo largo y las trenzas cambian la silueta sin tapar los ojos.
  const backHair = {
    wavy: (
      <path
        d="M34 38 Q15 56 29 77 Q14 92 30 105 Q17 118 43 125 L48 68 L84 68 L88 124 Q114 119 101 102 Q116 86 102 73 Q114 49 95 34 Z"
        fill={hair}
      />
    ),
    long: (
      <path
        d="M29 44 Q26 10 65 10 Q104 10 101 44 L107 129 Q85 137 65 126 Q44 137 23 129 Z"
        fill={hair}
      />
    ),
    braids: (
      <g fill={hair} stroke="#000" strokeOpacity=".16" strokeWidth="1.5">
        <path d="M32 42 Q20 82 30 127 L44 127 L44 44 Z M86 44 L86 127 L100 127 Q110 82 98 42 Z" />
        {[73, 85, 97, 109, 121].map((y) => (
          <g key={y}>
            <ellipse
              cx="34"
              cy={y}
              rx="10"
              ry="9"
              transform={`rotate(${y % 24 ? -20 : 20} 34 ${y})`}
            />
            <ellipse
              cx="96"
              cy={y}
              rx="10"
              ry="9"
              transform={`rotate(${y % 24 ? 20 : -20} 96 ${y})`}
            />
          </g>
        ))}
        <path d="M28 128 L24 140 L40 140 L39 128 M91 128 L90 140 L106 140 L101 128" />
        <path
          d="M26 126 L42 126 M88 126 L104 126"
          stroke={secondary}
          strokeWidth="5"
          strokeOpacity="1"
        />
      </g>
    ),
    ponytail: (
      <g fill={hair}>
        <path d="M84 26 Q114 14 119 42 Q126 73 107 107 Q113 77 96 60 L89 42 Z" />
        <circle cx="94" cy="30" r="7" fill={secondary} />
      </g>
    ),
    afro: (
      <g fill={hair}>
        <ellipse cx="65" cy="46" rx="47" ry="40" />
        {[
          [25, 39],
          [31, 22],
          [47, 13],
          [65, 10],
          [84, 14],
          [100, 25],
          [106, 43],
          [103, 62],
          [26, 62],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="12" />
        ))}
      </g>
    ),
  };
  const frontHair = {
    short: (
      <path
        d="M34 49 L34 28 L43 30 L45 13 L57 24 L68 10 L74 23 L91 18 L97 49 L84 38 L73 40 L61 33 L48 42 Z"
        fill={hair}
      />
    ),
    wavy: (
      <path
        d="M30 49 Q24 13 61 13 Q101 8 101 49 Q89 29 75 31 Q66 56 48 50 Q57 39 53 32 Q40 38 30 49"
        fill={hair}
      />
    ),
    side: (
      <path
        d="M31 53 Q26 19 62 16 Q98 11 99 51 L86 42 L82 29 Q68 54 37 57 L50 42 Z"
        fill={hair}
      />
    ),
    long: (
      <path
        d="M29 54 Q25 10 65 10 Q104 10 101 54 L90 47 Q75 41 65 28 Q55 41 40 47 L36 77 L29 82 Z"
        fill={hair}
      />
    ),
    curly: (
      <g fill={hair}>
        {[
          [36, 37, 11],
          [44, 24, 12],
          [58, 19, 12],
          [74, 21, 12],
          [88, 29, 12],
          [95, 43, 9],
          [33, 50, 8],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    ),
    braids: (
      <path
        d="M29 53 Q24 14 65 12 Q105 14 101 53 L91 47 Q79 40 65 29 Q51 40 39 47 Z"
        fill={hair}
      />
    ),
    ponytail: (
      <path
        d="M31 51 Q24 15 62 14 Q98 12 99 51 L88 44 Q70 44 53 28 Q49 46 31 51 Z"
        fill={hair}
      />
    ),
    afro: (
      <path
        d="M29 52 Q25 24 65 24 Q105 24 101 52 L88 43 L77 47 L65 41 L53 47 L41 43 Z"
        fill={hair}
      />
    ),
  };
  const hairLabels = {
    short: "corto en puntas",
    wavy: "ondulado",
    side: "flequillo de lado",
    long: "largo",
    curly: "rizado",
    braids: "trenzas",
    ponytail: "coleta",
    afro: "afro",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 130 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Estudiante de magia con pelo ${hairLabels[hairstyle] ?? hairLabels.short}`}
      data-hairstyle={hairstyle}
      style={{
        display: "block",
        flexShrink: 0,
        maxWidth: "100%",
      }}
    >
      {/* SOMBRA */}
      <ellipse cx="65" cy="153" rx="42" ry="6" fill="#000000" opacity="0.2" />

      <g data-hair="back">{backHair[hairstyle]}</g>

      {/* TÚNICA */}
      <path
        d="M43 103
           Q22 107 17 137
           L12 150
           L118 150
           L113 137
           Q108 107 87 103 Z"
        fill="#222536"
        stroke="#121522"
        strokeWidth="2"
      />

      {/* CUELLO Y CAMISA */}
      <path
        d="M47 102 L65 132 L83 102
           L77 96 L53 96 Z"
        fill="#f4f1e9"
      />

      {/* CORBATA */}
      <path
        d="M61 107 L69 107 L72 116
           L65 135 L58 116 Z"
        fill={primary}
      />

      <path d="M61 112 L69 112" stroke={secondary} strokeWidth="3" />

      <path d="M59 123 L70 123" stroke={secondary} strokeWidth="3" />

      {/* BORDES DE LA TÚNICA */}
      <path d="M43 103 L58 150" stroke={primary} strokeWidth="5" />

      <path d="M87 103 L72 150" stroke={primary} strokeWidth="5" />

      <path d="M43 103 L58 150" stroke={secondary} strokeWidth="1.5" />

      <path d="M87 103 L72 150" stroke={secondary} strokeWidth="1.5" />

      {/* CUELLO */}
      <rect x="55" y="88" width="20" height="20" rx="8" fill={skin} />

      {/* OREJAS */}
      <ellipse cx="35" cy="66" rx="7" ry="11" fill={skin} />

      <ellipse cx="95" cy="66" rx="7" ry="11" fill={skin} />

      {/* ROSTRO */}
      <path
        d="M36 49
           Q36 30 65 30
           Q94 30 94 49
           L92 76
           Q87 99 65 102
           Q43 99 38 76 Z"
        fill={skin}
        stroke="#000000"
        strokeOpacity="0.08"
        strokeWidth="2"
      />

      {/* OJOS */}
      <ellipse cx="52" cy="65" rx="4" ry="5" fill="#ffffff" />

      <ellipse cx="78" cy="65" rx="4" ry="5" fill="#ffffff" />

      <circle cx="52" cy="65" r="2.8" fill={eyes} />
      <circle cx="78" cy="65" r="2.8" fill={eyes} />

      <circle cx="52.7" cy="64" r="1" fill="#ffffff" />
      <circle cx="78.7" cy="64" r="1" fill="#ffffff" />

      {/* CEJAS */}
      <path
        d="M45 56 Q52 53 59 57"
        stroke={hair}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M71 57 Q78 53 85 56"
        stroke={hair}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* NARIZ */}
      <path
        d="M65 67 L63 78 Q65 80 68 78"
        stroke="#a76e62"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* SONRISA */}
      <path
        d="M56 86 Q65 92 74 86"
        stroke="#995b59"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* CABELLO */}
      <g data-hair="front">{frontHair[hairstyle] || frontHair.short}</g>

      {/* ESCUDO DE LA CASA */}
      <path
        d="M90 116
           L105 116
           L105 130
           Q98 139 90 130 Z"
        fill={primary}
        stroke={secondary}
        strokeWidth="2"
      />

      <text x="97.5" y="129" fontSize="10" textAnchor="middle" fill={secondary}>
        ✦
      </text>

      {/* VARITA MÁGICA */}
      <line
        x1="112"
        y1="145"
        x2="120"
        y2="96"
        stroke="#65452e"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <circle cx="120" cy="94" r="3" fill="#ffdf83" />

      <path
        d="M120 85 L120 80
           M113 94 L108 94
           M127 94 L132 94"
        stroke="#ffdf83"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
