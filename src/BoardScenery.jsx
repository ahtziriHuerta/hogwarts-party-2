// Ilustración decorativa local. Ningún paisaje cambia las reglas de las casillas.
// Los símbolos SVG se reutilizan para dar detalle sin cargar imágenes externas.
export default function BoardScenery() {
  return (
    <svg
      className="board-scenery"
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="map-land" x2=".8" y2="1">
          <stop stopColor="#203f45" />
          <stop offset=".5" stopColor="#172e37" />
          <stop offset="1" stopColor="#243e3a" />
        </linearGradient>
        <radialGradient id="map-light">
          <stop stopColor="#b9b66c" stopOpacity=".2" />
          <stop offset="1" stopColor="#b9b66c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="map-water" x2=".4" y2="1">
          <stop stopColor="#295c65" />
          <stop offset="1" stopColor="#163c4a" />
        </linearGradient>
        <linearGradient id="castle-stone" x2="1" y2=".7">
          <stop stopColor="#cec7a3" />
          <stop offset=".45" stopColor="#9da99d" />
          <stop offset="1" stopColor="#697e7b" />
        </linearGradient>
        <linearGradient id="castle-roof" x2="1" y2="1">
          <stop stopColor="#445963" />
          <stop offset="1" stopColor="#263844" />
        </linearGradient>
        <pattern
          id="map-grain"
          width="13"
          height="17"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="m2 2 2 1m5 9 2-1"
            stroke="#c7d2b6"
            strokeOpacity=".065"
            strokeWidth=".7"
          />
        </pattern>
        <pattern
          id="map-waves"
          width="45"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M3 9q9-5 18 0t18 0"
            fill="none"
            stroke="#a4c9c3"
            strokeOpacity=".16"
          />
        </pattern>
        <g id="map-fir">
          <path d="M0 8V-21" stroke="#173332" strokeWidth="3" />
          <path
            d="m0-44-15 25h7L-21-1h42L8-19h7Z"
            fill="#183c36"
            stroke="#547764"
            strokeWidth="1"
          />
          <path
            d="m0-40 1 37M0-28l9 7M0-18l14 10"
            stroke="#71947a"
            strokeOpacity=".28"
            fill="none"
          />
        </g>
        <g id="map-tower">
          <path
            d="M-15 2h30v79h-30Z"
            fill="url(#castle-stone)"
            stroke="#1d343a"
            strokeWidth="2"
          />
          <path
            d="M-22 5 0-41 22 5Z"
            fill="url(#castle-roof)"
            stroke="#8b9c92"
            strokeWidth="1.5"
          />
          <path d="M-10 13H9M-10 49H9" stroke="#71867f" />
          <path
            d="M-4 21v12h8V21a4 4 0 0 0-8 0Zm0 37v12h8V58a4 4 0 0 0-8 0Z"
            fill="#ecd39a"
            stroke="#526b68"
            strokeWidth="1.5"
          />
          <path d="M0-41v-13l19 4-19 6" fill="#c6a65f" stroke="#d8ba76" />
        </g>
        <g id="map-rock">
          <path
            d="m-30 4 13-20 23-3 30 19-11 13-37 3Z"
            fill="#375557"
            stroke="#76918a"
            strokeOpacity=".35"
          />
          <path
            d="m-17-16 9 18 33 11M-8 2l14-21"
            fill="none"
            stroke="#9ca996"
            strokeOpacity=".25"
          />
        </g>
      </defs>

      <path fill="url(#map-land)" d="M0 0h1200v600H0z" />
      <ellipse cx="890" cy="160" rx="340" ry="250" fill="url(#map-light)" />
      <ellipse cx="270" cy="400" rx="400" ry="280" fill="url(#map-light)" />
      {/* Curvas de nivel de un atlas antiguo. */}
      <g fill="none" stroke="#acb78d" strokeWidth="1" opacity=".12">
        <path d="M-50 215Q110 88 288 180T620 185 951 148 1250 220M-50 229Q110 103 288 194T620 199 951 162 1250 234M-50 244Q110 118 288 209T620 214 951 177 1250 249" />
        <path d="M-50 415Q80 306 243 389T612 368 946 390 1250 352M-50 431Q80 322 243 405T612 384 946 406 1250 368M-50 447Q80 338 243 421T612 400 946 422 1250 384" />
        <path d="M20 40Q280-32 530 33T1210 12M-10 554Q260 501 530 561T1210 541" />
      </g>
      <g className="map-forest">
        <path
          d="M53 195Q170 118 351 158l113 50-41 60-309 5Z"
          fill="#0d2b2b"
          opacity=".65"
        />
        {[
          [95, 210, 0.9],
          [123, 181, 0.8],
          [153, 218, 1.2],
          [187, 170, 0.9],
          [217, 205, 1.2],
          [250, 175, 1],
          [285, 208, 1.3],
          [320, 179, 0.9],
          [351, 220, 1.1],
          [390, 199, 0.85],
          [116, 245, 1.1],
          [192, 254, 1.25],
          [248, 249, 0.85],
          [319, 256, 1.2],
          [374, 256, 0.9],
        ].map(([x, y, scale], i) => (
          <use
            key={i}
            href="#map-fir"
            transform={`translate(${x} ${y}) scale(${scale})`}
          />
        ))}
      </g>
      {/* Lago, orilla y reflejos; el sendero queda en una capa superior. */}
      <path
        d="M381 366q50-55 136-26t134-8q54-19 118 12t98 36q39 20 6 50-67 39-155 8t-169 9q-68 14-152-15-64-23-16-66Z"
        fill="url(#map-water)"
        stroke="#93b9a0"
        strokeOpacity=".4"
        strokeWidth="3"
      />
      <path
        d="M381 366q50-55 136-26t134-8q54-19 118 12t98 36q39 20 6 50-67 39-155 8t-169 9q-68 14-152-15-64-23-16-66Z"
        fill="url(#map-waves)"
      />
      <path
        d="m531 385 22 9 20-9-6 20h-29Z"
        fill="#a59067"
        stroke="#293e40"
        strokeWidth="2"
      />
      <path d="M552 385v-28l21 25h-21" fill="#dbcfaa" stroke="#8c9d8e" />
      <g opacity=".8">
        <use href="#map-rock" x="417" y="440" />
        <use href="#map-rock" x="835" y="443" />
        <use href="#map-rock" x="898" y="363" />
      </g>

      {/* Hogwarts: torres, tejados, ventanas encendidas y acantilado. */}
      <g className="map-castle">
        <ellipse
          cx="866"
          cy="263"
          rx="159"
          ry="14"
          fill="#081e27"
          opacity=".55"
        />
        <path
          d="m718 242 56-20 194 7 47 33-36 13-43-13-34 12-50-17-68 8Z"
          fill="#4a6762"
          stroke="#8a9c85"
          strokeOpacity=".45"
        />
        <path
          d="M764 166h198v81H764Z"
          fill="url(#castle-stone)"
          stroke="#243e42"
          strokeWidth="2"
        />
        <path
          d="m747 168 42-37h151l36 37Z"
          fill="url(#castle-roof)"
          stroke="#9aaa95"
          strokeWidth="1.5"
        />
        <path
          d="M812 142v-20h12v20m70 0v-20h12v20"
          fill="#85978c"
          stroke="#385052"
          strokeWidth="2"
        />
        <path d="M774 206h179M779 237h173" stroke="#657d74" strokeWidth="2" />
        {[790, 817, 844, 884, 911, 938].map((x) => (
          <path
            key={x}
            d={`M${x} 180v15h7v-15a3.5 3.5 0 0 0-7 0Z`}
            fill="#efcf84"
            stroke="#526f68"
            strokeWidth="2"
          />
        ))}
        <path
          d="M848 246v-26a17 17 0 0 1 34 0v26"
          fill="#293e43"
          stroke="#a0ac91"
          strokeWidth="3"
        />
        <use href="#map-tower" transform="translate(763 162) scale(.8 1)" />
        <use href="#map-tower" transform="translate(962 162) scale(.8 1)" />
        <use href="#map-tower" transform="translate(801 142) scale(.8 1.25)" />
        <use href="#map-tower" transform="translate(921 132) scale(.75 1.35)" />
        <use href="#map-tower" transform="translate(862 102) scale(1 1.8)" />
        <path
          d="m829 256 36-13 37 13"
          fill="none"
          stroke="#bbc3a5"
          strokeWidth="3"
        />
      </g>
      {/* Puente de piedra y una pequeña cabaña al borde del bosque. */}
      <g transform="translate(193 393)">
        <path d="m-43 12 43-31 50 22v43l-93-2Z" fill="#31494a" />
        <path
          d="m-40 8 40-27 47 18M-37 17l76-9M-29 28l60-11"
          fill="none"
          stroke="#b8ad85"
          strokeWidth="3"
        />
        <path
          d="m-26 38 1-11q4-14 14-6l1 17m17 1V17q9-14 16-5l2 26"
          fill="#112e33"
          stroke="#8a987e"
          strokeWidth="2"
        />
      </g>
      <g transform="translate(1027 392)">
        <path
          d="M-25-10h50v45h-50Z"
          fill="#8f9c88"
          stroke="#28474a"
          strokeWidth="2"
        />
        <path d="m-36-9 35-31 37 31Z" fill="#3c5557" stroke="#b1ad88" />
        <path d="M-7 35V11h14v24" fill="#354d4d" />
        <path d="M15-23v-17h7v23" fill="#8a9c87" />
        <path d="M-17 2h8v10h-8m26-10h8v10H9" fill="#e7c384" />
      </g>
      {[
        [68, 405, 0.8],
        [91, 446, 1.15],
        [1120, 402, 1.4],
        [1081, 449, 1.1],
        [1149, 452, 0.9],
        [991, 426, 0.65],
      ].map(([x, y, scale], i) => (
        <use
          key={i}
          href="#map-fir"
          transform={`translate(${x} ${y}) scale(${scale})`}
        />
      ))}
      <path fill="url(#map-grain)" d="M0 0h1200v600H0z" />
      {/* Luna, brújula y chispas discretas, sin filtros costosos. */}
      <g transform="translate(57 74)">
        <circle r="22" fill="#e4d49e" opacity=".1" />
        <path d="M8-17A18 18 0 1 0 8 17 17 17 0 0 1 8-17" fill="#e2d5aa" />
        <circle cx="32" cy="-15" r="1.5" fill="#e7d5a1" />
      </g>
      <g
        transform="translate(1140 319)"
        stroke="#c5b37d"
        strokeWidth="1"
        fill="none"
        opacity=".7"
      >
        <circle r="22" />
        <circle r="27" strokeDasharray="1 5" />
        <path d="m0-33 5 27 28 6-28 5-5 28-5-28-28-5 28-6Z" />
        <path d="M0-19V19M-19 0h38" />
        <path d="m0-28 4 23-4 5-4-5Z" fill="#c5b37d" />
      </g>
      <g fill="#f4d899" className="map-fireflies">
        <circle cx="345" cy="190" r="2" />
        <circle cx="239" cy="362" r="2" />
        <circle cx="671" cy="403" r="2" />
        <circle cx="948" cy="91" r="2" />
        <circle cx="1041" cy="252" r="1.7" />
        <circle cx="483" cy="235" r="1.6" />
      </g>
      <g fill="none" stroke="#c6ab6f" strokeWidth="1.5" opacity=".65">
        <path d="M19 45V19h36m-28 20V27h12M1145 19h36v26m-20-18h12v12M19 555v26h36m-28-20v12h12M1145 581h36v-26m-20 18h12v-12" />
      </g>
    </svg>
  );
}
