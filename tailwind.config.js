/** @type {import('tailwindcss').Config} */
// Build-time Tailwind config. Replaces the runtime `cdn.tailwindcss.com`
// Play CDN that every app entry used to load (a production-fragility: a CDN
// blip rendered the whole app unstyled = blank on the #000 theme). All six
// app entries now import `index.css` (the @tailwind directives) and Vite
// compiles only the classes found in the `content` globs below.
//
// IMPORTANT: classes assembled by string INTERPOLATION at runtime
// (e.g. `bg-${c}-500`) are NOT detected by content scanning and will be
// purged. The Play CDN generated those from the live DOM, so they worked
// before. If a colour/utility goes missing after this change, either switch
// the call site to full literal class strings or add the class to `safelist`.
export default {
  content: [
    './*.html',
    './*.tsx',
    './app-gmt/**/*.{ts,tsx}',
    './gradient-explorer/**/*.{ts,tsx}',
    './fluid-toy/**/*.{ts,tsx}',
    './fractal-toy/**/*.{ts,tsx}',
    './mesh-export/**/*.{ts,tsx}',
    './demo/**/*.{ts,tsx}',
    './engine/**/*.{ts,tsx}',
    './engine-gmt/**/*.{ts,tsx}',
    './palette/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
