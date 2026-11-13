// Regeneración opcional: necesita Chromium de Playwright y ffmpeg.
// El juego publica los archivos ya generados; no ejecuta este script al arrancar.
import { chromium } from "@playwright/test";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  "../public/quiz-media",
);
await mkdir(target, { recursive: true });
const drawings = [
  // Dragón con alas membranosas y una llama de tres colores.
  `<path d="m239 141-91-95 8 78-43 10 91 44m44-37 61-99 28 88 37 15-82 40" fill="#497f70" stroke="#a1ba83"/><path d="m156 124 48 54m-56-132 65 111m96-116-48 117m76-29-73 46" fill="none" stroke="#b4c18c" stroke-opacity=".5"/><path d="M190 178q-49 33-74-6 5 60 91 34l70-4 17-40-35-32-41 10Z" fill="#5f9b76"/><path d="m248 144 1-50 20-25 29 13 10 28-35 10-1 37" fill="#75ab7c"/><path d="m250 92-8-25 19 8m26 1 13-16-2 27m-80 56-10-19 19 8m-23 27-18-13 19 2" fill="#d4c18c"/><path d="M294 101h15l-9 10-25 4" fill="#346b5c"/><circle cx="281" cy="88" r="3" fill="#ffeaa4"/><path d="m212 196-6 29h-24m65-26 8 26h22" fill="none" stroke="#75ab7c" stroke-width="12"/><path d="m310 107 44-19-11 18 40 8-44 11 13 14-42-18" fill="#d48353"/><path d="m313 111 42-3-20 9 16 7-38-7" fill="#f5ca72"/>`,
  // Unicornio.
  `<path d="M162 154q10-46 63-35l37 11 21-53 28-19 20 13-15 43-19 37-7 28-83 5-50-11Z" fill="#e1e6db"/><path d="m296 65 10-38 5 35" fill="#edce87"/><path d="m284 76-9-13-5 54-14 29 20-3 21-49-6-15Z" fill="#afccc8"/><path d="M164 146q-42 11-42 57 19-21 37-23" fill="#adcac7"/><path d="m179 175-9 49h13l20-42m59-5 4 47h13l7-50" fill="#e1e6db"/><path d="m170 224-4 5h18m82-5v5h15" stroke="#a0bdbb" stroke-width="5"/><path d="m311 84 19 2-3 13-15 4" fill="#d4dfd8"/><circle cx="314" cy="75" r="2.5" fill="#334d52"/><path d="m277 100-8 28m11-39-9 29m-95 18q35 25 78 10" fill="none" stroke="#94b8b3" stroke-width="2"/>`,
  // Lechuza y carta.
  `<path d="M147 218h187" stroke="#987850" stroke-width="9"/><path d="M190 135q-26 20-18 55l28 17m93-72q27 20 18 55l-28 17" fill="#b4c5b8"/><ellipse cx="242" cy="157" rx="58" ry="63" fill="#dedfd0"/><path d="m188 110 9-57 27 21q18-9 36 0l28-21 9 57" fill="#d5dbcd"/><path d="M239 98q-34-39-48 1-12 38 49 50 61-12 49-50-14-40-48-1Z" fill="#f3ebd5"/><circle cx="215" cy="109" r="14" fill="#d0ae5a"/><circle cx="268" cy="109" r="14" fill="#d0ae5a"/><circle cx="215" cy="109" r="7" fill="#253842"/><circle cx="268" cy="109" r="7" fill="#253842"/><path d="m235 124 7 15 7-15" fill="#80654c"/><path d="m215 161 5 6 5-6m18 12 5 6 5-6m-38 12 5 6 5-6m25 4 5 6 5-6" fill="none" stroke="#97ac9e" stroke-width="2"/><path d="m222 211-2 12m40-12 2 12" stroke="#c1a466" stroke-width="6"/><path d="M312 173h70v46h-70Z" fill="#d9cca6" stroke="#b7a477"/><path d="m312 173 35 25 35-25m-70 46 22-23m48 23-22-23" fill="none" stroke="#a39067"/><circle cx="347" cy="197" r="6" fill="#965956"/>`,
  // Fénix.
  `<path d="M238 142Q160 116 122 55q2 69 76 121m46-34Q321 116 359 55q-2 69-77 121" fill="#bc6650"/><path d="m132 77 66 76m-53-59 58 68m141-85-66 76m53-59-58 68" stroke="#eab26a" stroke-width="3"/><path d="m227 171-33 64 39-26 7 33 10-33 39 26-33-64" fill="#df9d53"/><path d="m237 179-12 54 18-20 15 18-11-52" fill="#edce87"/><ellipse cx="241" cy="146" rx="27" ry="45" fill="#d68953"/><path d="M221 125q-8-44 19-47 24 2 12 35l-7 24" fill="#dca260"/><path d="m242 83 3-23 8 19m-16 1-10-20 1 26" stroke="#edce87" stroke-width="3"/><path d="m253 87 15 8-17 4" fill="#efd08a"/><circle cx="245" cy="88" r="2.5" fill="#263c44"/><path d="m170 190-8 16 12-6m141-13 8 20-16-9m-145-54-8 13m177-21 7 16" fill="none" stroke="#e1b96a" stroke-width="3"/>`,
  // Hipogrifo.
  `<path d="M164 154q4-36 61-31l45 9 12-42 32 2-10 45-11 49-96 2-36-16Z" fill="#a8b7ad"/><path d="m204 150-53-92q52 5 85 68l39 40m-26-19 56-104q4 66-30 110" fill="#718e8b" stroke="#a7bba8"/><path d="m162 75 44 67m-30-52 41 58m-25-41 35 50m62-93-26 72" stroke="#c8cfb8" stroke-width="2"/><path d="M284 103q-21-33 4-48 32-10 38 16l-7 28-17 17" fill="#d4d9c7"/><path d="m318 70 29 12-24 11-4-12" fill="#c5a568"/><circle cx="310" cy="69" r="3" fill="#273d44"/><path d="m180 178-10 46h14l21-42m64-2 5 44h14l6-42" fill="#9caaa1"/><path d="m171 225-6 7h22m85-7v7h21" stroke="#c6b078" stroke-width="4"/><path d="M165 147q-42 1-42 44l26-20" fill="#718c86"/>`,
  // Sombrero Seleccionador.
  `<ellipse cx="241" cy="205" rx="133" ry="25" fill="#5d493b" stroke="#bb9c69" stroke-width="2"/><path d="m150 196 34-88 43-65 26 33 57 7-44 21 19 35 27 59q-83 23-162-2Z" fill="#8f6d4b" stroke="#c0a575" stroke-width="2"/><path d="m184 108 49 22 33-26m-43-41 12 25 40 2m-111 79 39 9 74-9" fill="none" stroke="#594633" stroke-width="6"/><path d="m198 142 30 12-32 4m65-18-25 13 31 3m-57 27q30-17 57 0-31 17-57 0Z" fill="#3d3930"/><path d="m182 183-6 12m114-29 8 18m-87-73 5-12" stroke="#c0a575" stroke-width="2"/>`,
  // Snitch.
  `<path d="M210 145Q134 71 58 95q56 66 144 73m68-23Q346 71 422 95q-56 66-144 73" fill="#b9ccbd" stroke="#dfdec2" stroke-width="2"/><path d="m72 99 127 53M94 99l102 61m-82-60 79 68m213-69-127 53m105-53-102 61m82-60-79 68" stroke="#6f9290" stroke-width="2"/><circle cx="240" cy="157" r="47" fill="#bd9852" stroke="#edce87" stroke-width="3"/><circle cx="240" cy="157" r="37" fill="none" stroke="#edd49a"/><path d="M214 119q48 38 53 70m-61-57q34 3 65 27m-68 13q36-38 65-43m-48 73q-7-45 19-81" fill="none" stroke="#7f693e" stroke-width="3"/><path d="m230 130 4-8 4 8 8 3-8 4-4 8-4-8-8-4Z" fill="#f8e4aa"/>`,
  // Mandrágora.
  `<path d="m187 173 15 60h77l15-60Z" fill="#a87351" stroke="#ceaa76" stroke-width="2"/><path d="M180 164h122v18H180Z" fill="#b9855d" stroke="#ceaa76" stroke-width="2"/><path d="M218 103q-16 17-10 43l-21 14 23 4 10-13-1 34 18-14 6 14 19-14-5-23 12 14 23-2-24-18q2-36-19-41Z" fill="#af9368" stroke="#d2b584" stroke-width="2"/><path d="m225 104-17-22q-28-2-34-26 40-5 58 37m11 8-4-41q-22-15-13-39 36 14 25 59m0 22 16-38q27-18 43-9-9 34-44 34" fill="#608e6b" stroke="#a7b67f" stroke-width="2"/><path d="m220 123 9 3m15 0 9-3m-21 17q6 9 12 0" fill="none" stroke="#584c3b" stroke-width="3"/><path d="m207 196 11 29m51-29-5 29" stroke="#d5ad79" stroke-width="2"/>`,
  // Caldero.
  `<path d="M163 122q-40 3-28 37l25 5m157-42q40 3 28 37l-25 5" fill="none" stroke="#8b9c92" stroke-width="9"/><path d="M161 119q-26 91 39 103h80q65-12 39-103Z" fill="#344c52" stroke="#94a89b" stroke-width="3"/><ellipse cx="240" cy="122" rx="83" ry="21" fill="#77a475" stroke="#c1cba2" stroke-width="3"/><ellipse cx="240" cy="122" rx="67" ry="12" fill="#9cc584"/><path d="m190 216-10 18m110-18 10 18" stroke="#839b90" stroke-width="11"/><path d="m186 158q-4 24 15 34m41-100q-15-15 0-27m-33 23q-18-18-3-37m72 38q16-18 3-36" fill="none" stroke="#d2d8b3" stroke-width="3"/><circle cx="219" cy="98" r="7" fill="#9bc487"/><circle cx="274" cy="104" r="5" fill="#a7cc8e"/><circle cx="246" cy="42" r="6" fill="none" stroke="#b6d198" stroke-width="2"/>`,
  // Reliquias de la Muerte.
  `<path d="m240 48 109 174H131Z" fill="#ccba7720" stroke="#edce87" stroke-width="5" stroke-linejoin="round"/><circle cx="240" cy="164" r="58" fill="none" stroke="#c6d5c1" stroke-width="4"/><path d="M240 48v174" stroke="#f3ddb1" stroke-width="4"/><circle cx="240" cy="164" r="80" fill="none" stroke="#a9c1ac" stroke-opacity=".2" stroke-dasharray="2 8"/>`,
];
for (const [index, drawing] of drawings.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270"><defs><radialGradient id="bg"><stop stop-color="#2e5556"/><stop offset="1" stop-color="#102731"/></radialGradient></defs><path fill="url(#bg)" d="M0 0h480v270H0z"/><g fill="none" stroke="#b5ba8925"><ellipse cx="240" cy="146" rx="121" ry="101"/><ellipse cx="240" cy="146" rx="137" ry="115" stroke-dasharray="2 9"/></g><g fill="#d9cc9180"><circle cx="64" cy="55" r="1.5"/><circle cx="399" cy="64" r="2"/><circle cx="371" cy="211" r="1.5"/><path d="m85 174 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g><ellipse cx="240" cy="233" rx="115" ry="9" fill="#071e284d"/><g stroke-linecap="round" stroke-linejoin="round">${drawing}</g><path d="M15 36V15h24m402 0h24v21M15 234v21h24m402 0h24v-21" fill="none" stroke="#af9a6380" stroke-width="1.5"/></svg>`;
  await writeFile(
    join(target, `v${String(index + 1).padStart(2, "0")}.svg`),
    svg,
  );
}

const frames = await mkdtemp(join(tmpdir(), "hogwarts-clips-"));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
try {
  const page = await browser.newPage();
  await page.setContent(
    '<canvas id="scene" width="480" height="270"></canvas>',
  );
  for (const clip of [1, 2]) {
    for (let frame = 0; frame < 72; frame++) {
      const data = await page.evaluate(
        ({ clip, time }) => {
          const canvas = document.querySelector("canvas");
          const c = canvas.getContext("2d");
          const bg = c.createRadialGradient(240, 135, 10, 240, 135, 270);
          bg.addColorStop(0, "#2e5556");
          bg.addColorStop(1, "#102731");
          c.fillStyle = bg;
          c.fillRect(0, 0, 480, 270);
          c.strokeStyle = "#af9a6380";
          c.lineWidth = 1.5;
          c.strokeRect(15, 15, 450, 240);
          c.strokeStyle = "#aebd8828";
          c.beginPath();
          c.ellipse(240, 140, 136, 108, 0, 0, Math.PI * 2);
          c.stroke();
          if (clip === 1) {
            c.save();
            c.translate(160, 176);
            c.rotate(-0.7);
            c.fillStyle = "#9e7950";
            c.fillRect(-60, -5, 120, 10);
            c.fillStyle = "#edd49a";
            c.fillRect(38, -5, 22, 10);
            c.restore();
            const positions = [
              [230, 95],
              [315, 140],
              [245, 195],
            ];
            positions.forEach(([x, y], i) => {
              const progress = Math.max(
                0,
                Math.min(1, (time - 1 - i * 0.9) * 3),
              );
              if (!progress) return;
              c.save();
              c.translate(x, y);
              c.scale(progress, progress);
              c.fillStyle = "#f5d888";
              c.beginPath();
              for (let j = 0; j < 10; j++) {
                const a = -Math.PI / 2 + (j * Math.PI) / 5;
                const r = j % 2 ? 10 : 23;
                c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
              }
              c.closePath();
              c.fill();
              c.strokeStyle = "#fff1bf";
              c.lineWidth = 1.5;
              c.stroke();
              c.restore();
            });
          } else {
            const colors = ["#83b68a", "#9b83bb", "#77adc5", "#e4bc65"];
            c.strokeStyle = "#97ac9d";
            c.lineWidth = 7;
            c.beginPath();
            c.ellipse(153, 156, 25, 20, 0, 0, Math.PI * 2);
            c.ellipse(327, 156, 25, 20, 0, 0, Math.PI * 2);
            c.stroke();
            c.fillStyle = "#344c52";
            c.strokeStyle = "#94a89b";
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(160, 126);
            c.quadraticCurveTo(133, 215, 200, 220);
            c.lineTo(280, 220);
            c.quadraticCurveTo(347, 215, 320, 126);
            c.closePath();
            c.fill();
            c.stroke();
            c.fillStyle = colors[Math.min(3, Math.floor(time / 1.4))];
            c.beginPath();
            c.ellipse(240, 126, 82, 20, 0, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = "#c4d1b0";
            c.stroke();
            for (let i = 0; i < 5; i++) {
              const age = (time * 0.7 + i * 0.2) % 1;
              c.globalAlpha = 1 - age;
              c.beginPath();
              c.arc(
                199 + i * 20 + Math.sin(time + i) * 5,
                114 - age * 62,
                4 + age * 5,
                0,
                Math.PI * 2,
              );
              c.fill();
            }
            c.globalAlpha = 1;
            c.strokeStyle = "#91aa9b";
            c.lineWidth = 10;
            c.beginPath();
            c.moveTo(188, 217);
            c.lineTo(181, 232);
            c.moveTo(292, 217);
            c.lineTo(299, 232);
            c.stroke();
          }
          return canvas.toDataURL("image/png").split(",")[1];
        },
        { clip, time: frame / 12 },
      );
      await writeFile(
        join(frames, `${String(frame).padStart(3, "0")}.png`),
        Buffer.from(data, "base64"),
      );
    }
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      "12",
      "-i",
      join(frames, "%03d.png"),
      "-c:v",
      "libx264",
      "-profile:v",
      "baseline",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "31",
      "-preset",
      "slow",
      "-an",
      "-movflags",
      "+faststart",
      join(target, `c0${clip}.mp4`),
    ]);
  }
} finally {
  await browser.close();
  await rm(frames, { recursive: true, force: true });
}
console.log("10 ilustraciones SVG y 2 clips MP4 generados.");
