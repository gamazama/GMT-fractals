
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Makes paths relative (e.g., "assets/..." instead of "/assets/...")
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'mediabunny': path.resolve(__dirname, './utils/mediabunny.min.mjs'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    middlewareMode: true, 
  }
});
