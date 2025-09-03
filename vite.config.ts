import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(() => {
  const extraDevPlugins: any[] = [];
  // Removed top-level await to keep config sync-friendly for some CI/build environments (Render)
  // Replit-specific cartographer plugin omitted in non-Replit deployments.
  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...extraDevPlugins,
    ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      // Proxy API to backend server (server listens on 5000 by default)
      '/api': 'http://localhost:5000',
    },
  },
};
});
