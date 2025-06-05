import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  plugins: [tailwindcss(), react()],
  css: {
    postcss: "./postcss.config.js",
  },
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
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
