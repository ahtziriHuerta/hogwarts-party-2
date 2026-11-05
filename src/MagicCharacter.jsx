
export default function MagicCharacter({
  size = 150,
  primary = "#9e303e",
  secondary = "#e8b95b",
  hair = "#62453f",
  skin = "#f8d5ad",
  eyes = "#477e85",
  hairstyle = "short",
}) {
  const hairStyles = {
    short: (
      <path
        d="M38 47 Q34 17 65 17 Q96 17 92 48
           Q80 31 65 35 Q48 31 38 47"
        fill={hair}
      />
    ),

    wavy: (
      <>
        <path
          d="M35 48 Q27 17 65 15 Q103 17 95 48
             Q84 28 65 32 Q46 28 35 48"
          fill={hair}
        />
        <path
          d="M37 40 Q23 57 34 80 Q25 94 39 102
             L47 75 Z"
          fill={hair}
        />
        <path
          d="M93 40 Q107 57 96 80 Q105 94 91 102
             L83 75 Z"
          fill={hair}
        />
      </>
    ),

    side: (
      <path
        d="M35 49 Q30 17 64 17 Q98 17 94 49
           Q79 39 72 25 Q55 45 35 49"
        fill={hair}
      />
    ),

    long: (
      <>
        <path
          d="M34 48 Q29 14 65 14 Q101 14 96 48
             L101 105 L84 105 L84 46
             Q65 30 46 46 L46 105 L29 105 Z"
          fill={hair}
        />
      </>
    ),

    curly: (
      <>
        {[
          [39, 38],
          [47, 25],
          [60, 20],
          [73, 20],
          [86, 27],
          [94, 40],
          [34, 51],
          [96, 51],
        ].map(([cx, cy], index) => (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r="12"
            fill={hair}
          />
        ))}
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 130 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Estudiante de magia"
      style={{
        display: "block",
        flexShrink: 0,
        maxWidth: "100%",
      }}
    >
      {/* SOMBRA */}
      <ellipse
        cx="65"
        cy="153"
        rx="42"
        ry="6"
        fill="#000000"
        opacity="0.2"
      />

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

      <path
        d="M61 112 L69 112"
        stroke={secondary}
        strokeWidth="3"
      />

      <path
        d="M59 123 L70 123"
        stroke={secondary}
        strokeWidth="3"
      />

      {/* BORDES DE LA TÚNICA */}
      <path
        d="M43 103 L58 150"
        stroke={primary}
        strokeWidth="5"
      />

      <path
        d="M87 103 L72 150"
        stroke={primary}
        strokeWidth="5"
      />

      <path
        d="M43 103 L58 150"
        stroke={secondary}
        strokeWidth="1.5"
      />

      <path
        d="M87 103 L72 150"
        stroke={secondary}
        strokeWidth="1.5"
      />

      {/* CUELLO */}
      <rect
        x="55"
        y="88"
        width="20"
        height="20"
        rx="8"
        fill={skin}
      />

      {/* OREJAS */}
      <ellipse
        cx="35"
        cy="66"
        rx="7"
        ry="11"
        fill={skin}
      />

      <ellipse
        cx="95"
        cy="66"
        rx="7"
        ry="11"
        fill={skin}
      />

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
      <ellipse
        cx="52"
        cy="65"
        rx="4"
        ry="5"
        fill="#ffffff"
      />

      <ellipse
        cx="78"
        cy="65"
        rx="4"
        ry="5"
        fill="#ffffff"
      />

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
      {hairStyles[hairstyle] || hairStyles.short}

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

      <text
        x="97.5"
        y="129"
        fontSize="10"
        textAnchor="middle"
        fill={secondary}
      >
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

      <circle
        cx="120"
        cy="94"
        r="3"
        fill="#ffdf83"
      />

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
