
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: './', // CRITICAL: Makes paths relative (e.g., "assets/..." instead of "/assets/...")
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'mesh-export': path.resolve(__dirname, 'mesh-export.html'),
      },
      output: {
        manualChunks: {
          // Core vendor libraries (eagerly loaded)
          'three': ['three'],
          'react': ['react', 'react-dom'],
          'three-drei': ['@react-three/drei'],
          'three-fiber': ['@react-three/fiber'],
          // Compression (needed at startup for URL parsing)
          'pako': ['pako'],
          // Note: reactflow and mediabunny intentionally omitted —
          // they're only used by lazy-loaded components (FlowEditor, RenderPopup)
          // so Vite naturally bundles them with their consumers.
        }
      }
    }
  },
  server: {
    middlewareMode: true,
  }
});
