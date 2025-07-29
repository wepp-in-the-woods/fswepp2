import * as path from "path";
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  plugins: [tailwindcss(), react()],
  resolve: {
    extensions: [".mjs", ".mts", ".js", ".ts", ".jsx", ".tsx", ".json"],
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
    allowedHosts: [
      "dev",                       // HAProxy health-check header
      "192.168.1.51",              // direct IP access
      "localhost",                 // local testing
      "fswepp2-dev.bearhive.duckdns.org" // public dev domain
    ],
    hmr: { host: "192.168.1.51", port: 5173 },
    middlewareMode: false,
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      }
    },
  },
});
