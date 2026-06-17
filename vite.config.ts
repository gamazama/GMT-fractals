
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
        // Serve cached index.html for offline navigation to unknown
        // URLs (typos, deep links). The denylist excludes our actual
        // .html entry points so they get served from precache directly
        // instead of being swapped for the landing — without this,
        // clicking /dev/demo.html on the listing page would route
        // through NavigationRoute and return the cached index.html.
        //
        // ignoreURLParametersMatching strips ALL query params before the
        // precache lookup, so a deep-link like `app-gmt.html?gallery=<slug>`
        // resolves to the precached `app-gmt.html` instead of missing the
        // cache and falling through to navigateFallback (the listing page).
        // Without this, the default only ignores utm_/fbclid, so any
        // ?-param navigation served the launcher. The denylist regex also
        // tolerates a trailing query string (`.html?…`) as defence-in-depth
        // for any .html the precache hasn't covered.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\.html(\?|$)/],
        ignoreURLParametersMatching: [/.*/],
        // (No runtimeCaching for third-party CDNs — Tailwind is now compiled
        // at build time and reactflow CSS is bundled, so the app loads zero
        // runtime CDN resources. This removes the blank-page-on-CDN-blip class.)
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
        // Canonical root — the GMT app (same module as 'app-gmt' below). `/`
        // serves the app, so the SW navigateFallback ('index.html') resolves to
        // the app (never a menu) and prod's apex matches stable. (Was the static
        // launcher menu — that's now 'launcher' / launcher.html.)
        main: path.resolve(__dirname, 'index.html'),
        // Dev launcher — the static 6-app menu (no JS entry). Shipped but
        // unlinked in prod; the discovery page for the /dev preview.
        launcher: path.resolve(__dirname, 'launcher.html'),
        // Engine "Demo" app — the generic plugin-host showcase that
        // used to live at the root. Now has its own URL so the public
        // landing site can deep-link to it. Loads /index.tsx (kept as
        // the demo entry for minimal churn).
        demo: path.resolve(__dirname, 'demo.html'),
        'fractal-toy': path.resolve(__dirname, 'fractal-toy.html'),
        'fluid-toy': path.resolve(__dirname, 'fluid-toy.html'),
        'gradient-explorer': path.resolve(__dirname, 'gradient-explorer.html'),
        'app-gmt': path.resolve(__dirname, 'app-gmt.html'),
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
