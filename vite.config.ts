import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/onnx-demos/" : "/",

  plugins: [
    react(),
    tailwindcss(),

    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      open: true,
      template: "treemap", // IMPORTANT
    }),
  ],
}));
