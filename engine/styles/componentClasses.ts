/**
 * Engine component-utility CSS — single source of truth for the
 * `t-btn`, `t-section-*`, `icon-btn`, `glass-panel`, `t-input`,
 * `t-dropdown`, `t-select` classes that shared UI components reference
 * (Button, SectionLabel, Slider, Dropdown, …).
 *
 * The Tailwind CDN parses any `<style type="text/tailwindcss">` block
 * present in the document at scan time. `injectEngineStyles()` appends
 * one to `document.head` so every app that mounts the engine inherits
 * the same component classes — no per-entry HTML duplication.
 *
 * Apps don't need to call this directly; `registerUI()` does it on
 * first invocation.
 */

const ENGINE_COMPONENT_CSS = `
@layer components {
    .t-label { @apply text-[10px] font-bold text-gray-500; }
    .t-label-sm { @apply text-[9px] font-bold text-gray-500; }
    .t-value { @apply text-xs font-mono text-gray-200; }
    .t-section-header { @apply px-3 py-1.5 bg-black/20 border-b border-white/5 flex items-center justify-between shrink-0; }
    .t-section-title { @apply text-[9px] font-bold text-gray-500; }
    .glass-panel { @apply bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]; }
    .panel-header { @apply flex items-center justify-between px-2 py-1.5 bg-gray-800/80 border-b border-white/10 select-none shrink-0; }
    .panel-section { @apply px-3 py-1.5 bg-black/20 border-b border-white/5 flex justify-between items-center shrink-0; }
    .icon-btn { @apply p-1.5 rounded transition-colors text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer; }
    .icon-btn-active { @apply bg-cyan-900/50 text-cyan-300 border border-cyan-700/50; }
    .icon-btn-danger { @apply text-red-500 hover:text-red-300 hover:bg-red-900/20; }
    .t-input { @apply w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 transition-colors; }
    .t-dropdown { @apply w-full bg-gradient-to-b from-[#1a1a1a] to-transparent border border-white/5 text-[10px] font-medium text-gray-300 tracking-tight rounded px-2 py-1 outline-none focus:border-cyan-500 appearance-none hover:bg-white/5 transition-colors cursor-pointer text-center; }
    .t-dropdown option { @apply bg-[#1a1a1a] text-gray-300; }
    .t-btn { @apply min-h-[26px] py-1 px-3 text-[9px] font-bold border rounded transition-all truncate flex items-center justify-center gap-2 select-none; }
    .t-btn-sm { @apply py-0.5 px-2 text-[9px] font-bold border rounded transition-all truncate flex items-center justify-center gap-1 select-none; }
    .t-btn-default { @apply bg-gradient-to-b from-[#1a1a1a] to-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20; }
    .t-select { @apply w-full bg-black/40 border border-white/10 text-[10px] font-medium text-gray-300 rounded px-2 py-1 outline-none focus:border-cyan-500/50 appearance-none hover:border-white/20 transition-colors cursor-pointer; }
    .t-select option { @apply bg-[#111] text-gray-300; }
}
`;

let _injected = false;

/**
 * Inject the engine's component CSS into the host document. Idempotent
 * (subsequent calls are no-ops). Safe in SSR / non-browser contexts:
 * skips when `document` is undefined.
 *
 * Marker attribute `data-engine-styles` lets HMR / re-imports detect
 * the existing tag and avoid duplicates if the module is hot-reloaded.
 */
export const injectEngineStyles = (): void => {
    if (_injected) return;
    if (typeof document === 'undefined') return;
    if (document.head.querySelector('style[data-engine-styles]')) {
        _injected = true;
        return;
    }
    const style = document.createElement('style');
    style.setAttribute('type', 'text/tailwindcss');
    style.setAttribute('data-engine-styles', 'true');
    style.textContent = ENGINE_COMPONENT_CSS;
    document.head.appendChild(style);
    _injected = true;
};
