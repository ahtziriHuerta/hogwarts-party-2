import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:5174",
    headless: true,
    isMobile: true,
    hasTouch: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run server",
      env: { PORT: "3002" },
      url: "http://localhost:3002",
      reuseExistingServer: false,
    },
    {
      command:
        "npm run dev -- --mode browser-tests --host 0.0.0.0 --port 5174 --strictPort",
      env: { VITE_SERVER_URL: "http://localhost:3002" },
      url: "http://localhost:5174",
      reuseExistingServer: false,
    },
  ],
});
