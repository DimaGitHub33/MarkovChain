/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

// The process diagram lives in docs/model-process-diagram (shared with the README).
// Serve it at /docs/ in development and copy it into dist/docs/ when building.
const DIAGRAM_DIR = new URL("../docs/model-process-diagram/", import.meta.url);

function processDiagram(): Plugin {
  const files = readdirSync(fileURLToPath(DIAGRAM_DIR));
  const read = (name: string) => readFileSync(fileURLToPath(new URL(name, DIAGRAM_DIR)));
  return {
    name: "process-diagram",
    configureServer(server) {
      server.middlewares.use("/docs", (req, res, next) => {
        const name = decodeURIComponent((req.url ?? "").split("?")[0].replace(/^\//, ""));
        if (!files.includes(name)) return next();
        res.setHeader("Content-Type", name.endsWith(".png") ? "image/png" : "application/xml");
        res.end(read(name));
      });
    },
    generateBundle() {
      for (const name of files) {
        this.emitFile({ type: "asset", fileName: `docs/${name}`, source: read(name) });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), processDiagram()],
  server: {
    port: 5173,
    proxy: { "/api": backend },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
