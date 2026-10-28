import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Batch 57.2 — strikte Trennung Offline-Unit-Tests vs. DB-Integrationstests.
//
//   VITEST_INTEGRATION=1  → läuft AUSSCHLIESSLICH `**/*.int.test.{ts,tsx}`
//                          (echte Lovable-Cloud-DB nötig).
//   sonst                → läuft AUSSCHLIESSLICH offline-fähige Unit-/Komponenten-
//                          tests, schließt `**/*.int.test.{ts,tsx}` aus.
//
// Damit ist der Offline-Lauf (`npm run test:unit` / `npm test`) reproduzierbar
// ohne Netz und ohne DB grün; Integrationstests laufen verpflichtend, wenn
// die CI `CMS_DB_AVAILABLE=true` setzt.

const INTEGRATION = process.env.VITEST_INTEGRATION === "1";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: INTEGRATION
      ? ["src/**/*.int.test.{ts,tsx}"]
      : ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: INTEGRATION
      ? ["**/node_modules/**", "**/dist/**"]
      : [
          "**/node_modules/**",
          "**/dist/**",
          "src/**/*.int.test.{ts,tsx}",
        ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
