import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // dev: proxy API ไปที่ wrangler dev (port 8787)
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
