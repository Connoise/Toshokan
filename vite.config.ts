import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed dev port and a non-clearing console.
// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5180,
    strictPort: true,
  },
  // Produce a relative-path build so the Tauri WebView can load assets.
  base: "./",
  build: {
    target: "es2021",
    outDir: "dist",
    emptyOutDir: true,
  },
});
