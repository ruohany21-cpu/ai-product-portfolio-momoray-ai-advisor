import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": import.meta.dirname } },
  test: {
    environment: "jsdom",
    exclude: ["work/**", ".sites-runtime/**", "node_modules/**", "dist/**"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
