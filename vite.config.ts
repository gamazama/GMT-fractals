
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' — new SW waits for user approval before activating.
      // This prevents silent stale-cache breakage on shader/formula updates.
      registerType: 'prompt',
      // Don't run SW in dev (avoids middleware-mode complexity with Express server).
      devOptions: { enabled: false },
      manifest: {
        name: 'GMT — Fractal Explorer',
        short_name: 'GMT',
        description: 'Real-time GPU-accelerated 3D fractal explorer',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        // './' matches base: './' in Vite config — safe for both root and subdirectory deploys.
        start_url: './',
        // 'id' pins the app identity independently of start_url.
        id: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            // 'any' only — 'maskable' requires a purpose-built icon with safe-zone
            // padding. Replace with a proper maskable icon file if desired.
            purpose: 'any',
          },
        ],
        screenshots: [
          {
            src: 'screenshots/desktop.png',
            sizes: '900x600',
            type: 'image/png',
            form_factor: 'wide',
            label: 'GMT Fractal Explorer — Desktop',
          },
        ],
      },
      workbox: {
        globPatterns: [
          // Vite-built assets (hashed filenames = safe to cache forever)
          '**/*.{js,css,html}',
          // Static engine assets
          'blueNoise.png',
          // Formula library — precache all .frag and .json so offline rendering
          // works for any formula without a prior online session.
          'formulas/**/*.{frag,json}',
          // Formula thumbnails shown in the formula picker
          'thumbnails/**/*.jpg',
          // Preset gallery (gallery.json index + .gmf scene files)
          'gmf/**/*.{gmf,json}',
        ],
        // Serve cached index.html for offline navigation.
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // CDN assets (Tailwind, jsdelivr) — try network, fall back to cache.
            urlPattern: /^https:\/\/(cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|esm\.sh)\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-cdn',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
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
        'toy-fluid': path.resolve(__dirname, 'toy-fluid.html'),
        'fractal-toy': path.resolve(__dirname, 'fractal-toy.html'),
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
        }
      }
    }
  },
  server: {
    port: 3400,
    // Standalone dev server (not middleware mode) — HMR WebSocket is
    // attached to the same HTTP server and works out of the box.
  }
});
