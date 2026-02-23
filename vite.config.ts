
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
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor libraries
          'three': ['three'],
          'react': ['react', 'react-dom'],
          'reactflow': ['reactflow'],
          'three-drei': ['@react-three/drei'],
          'three-fiber': ['@react-three/fiber'],
          // Media and encoding libraries
          'mediabunny': ['mediabunny'],
          // Compression and utilities
          'pako': ['pako'],
        }
      }
    }
  },
  server: {
    middlewareMode: true, 
  }
});
