import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Los hooks y el renderizador deben resolver la misma instancia de React.
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { include: ["react-dom/client"] },
  // Las pruebas pueden ejecutarse mientras Vite está abierto en otra terminal.
  cacheDir:
    mode === "browser-tests"
      ? "node_modules/.vite-browser-tests"
      : "node_modules/.vite",
}));
