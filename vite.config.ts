import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  base: "./",

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/api/": {
        target: "http://127.0.0.1:8045",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('scheduler') ||
              id.includes('i18next')
            ) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('framer-motion')) {
              return 'animation';
            }
            if (id.includes('lucide-react') || id.includes('@ant-design/icons')) {
              return 'icons';
            }
            if (id.includes('zustand')) {
              return 'state';
            }
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            if (id.includes('@tauri-apps')) {
              return 'tauri';
            }
            if (id.includes('antd') || id.includes('@lobehub') || id.includes('@emotion')) {
              return 'ui-vendor';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 3000,
    minify: 'esbuild',
    target: 'esnext',
  },
}));

