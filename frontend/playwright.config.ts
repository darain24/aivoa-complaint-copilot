import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: { viewport: { width: 1512, height: 982 }, headless: true },
  reporter: "list",
});
