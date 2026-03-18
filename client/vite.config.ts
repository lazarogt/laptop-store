import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

const __dirname = import.meta.dirname;
const shouldAnalyze = process.env.ANALYZE === "true";

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: "gzip", ext: ".gz" }),
    compression({ algorithm: "brotliCompress", ext: ".br" }),
    ...(shouldAnalyze
      ? [
          visualizer({
            filename: path.resolve(__dirname, "reports/build-visualizer.html"),
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  base: "/",
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (
            id.includes("react") ||
            id.includes("scheduler") ||
            id.includes("@tanstack") ||
            id.includes("axios") ||
            id.includes("zod") ||
            id.includes("react-hook-form") ||
            id.includes("wouter")
          ) {
            return "vendor-core";
          }
          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("lucide-react") ||
            id.includes("embla-carousel-react") ||
            id.includes("input-otp") ||
            id.includes("react-resizable-panels")
          ) {
            return "vendor-ui";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          return "vendor-core";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
