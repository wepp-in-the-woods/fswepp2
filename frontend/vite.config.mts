import path from "path";
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  plugins: [tailwindcss(), react()],
  css: {
    postcss: "./postcss.config.js",
  },
  resolve: {
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    loader: "tsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
        ".ts": "tsx",
      },
    },
  },
  test: {
    // vitest options
    globals: true,
    environment: "jsdom",
  },
  server: {
    port: 5173,
    strictPort: true,
    middlewareMode: false,
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
  },
});
