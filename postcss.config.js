// Vite auto-loads this. Compiles the @tailwind directives in index.css and
// adds vendor prefixes. Both deps already in package.json (no new installs).
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
