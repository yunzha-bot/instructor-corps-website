import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  define: { __RHINE_MODELS__: "{}", __RHINE_NOVECENTO__: "false" },
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/entry.ts"],
    },
  },
  plugins: [react()],
});
