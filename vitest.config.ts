import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import dotenv from "dotenv";

// Baca .env.local manual
const envResult = dotenv.config({ path: ".env.local" });

if (envResult.error) {
  console.error("❌ Gagal load .env.local:", envResult.error.message);
} else {
  console.log(
    "✅ .env.local loaded:",
    Object.keys(envResult.parsed ?? {}).join(", "),
  );
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    css: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "build"],

    // ✅ Inject dari process.env (yang sudah di-load dotenv)
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "",
      VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY ?? "",
    },

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/mocks/**",
        "src/vite-env.d.ts",
      ],
    },
  },
});
