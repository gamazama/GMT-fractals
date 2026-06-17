/**
 * Engine runtime-injected CSS.
 *
 * The component-utility classes (`t-btn`, `t-section-*`, `icon-btn`,
 * `glass-panel`, `t-input`, `t-dropdown`, `t-select`, `panel-*`) USED to
 * live here as a `<style type="text/tailwindcss">` block that the Tailwind
 * Play CDN compiled at runtime. The Play CDN has been removed (it was a
 * production-fragility — a CDN blip rendered the app unstyled), so those
 * `@apply` rules are now compiled at BUILD time and live in `index.css`
 * under `@layer components`. Keep `index.css` in sync with the intent here.
 *
 * What remains injected at runtime is only the plain CSS below (scrollbars +
 * dark color-scheme) — real CSS with pseudo-elements that Tailwind can't
 * express. `registerUI()` calls `injectEngineStyles()` on first invocation.
 */

/**
 * Plain CSS the engine needs but Tailwind can't express directly:
 * scrollbar styling for `.custom-scroll`-marked containers (dock
 * content, dropdown menus, draggable windows, etc.) and the dark
 * color-scheme hint. Mirrors the rules previously inlined in
 * index.html so every entry HTML doesn't have to copy them.
 */
const ENGINE_PLAIN_CSS = `
html { background-color: #000; scrollbar-width: thin; scrollbar-color: #333 #000; color-scheme: dark; }
body::-webkit-scrollbar { width: 3px; }
body::-webkit-scrollbar-track { background: #000; }
body::-webkit-scrollbar-thumb { background-color: #444; border-radius: 3px; }
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
.custom-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
}
.custom-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    border: 3px solid transparent;
    background-clip: content-box;
}
.custom-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.25); }
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
    if (document.head.querySelector('style[data-engine-styles-plain]')) {
        _injected = true;
        return;
    }

    // Component-utility classes (t-btn / glass-panel / …) are compiled at
    // build time now (index.css @layer components), NOT injected here.
    // Plain CSS (scrollbars + color-scheme) goes in a regular <style>
    // tag — Tailwind directives in `text/tailwindcss` can't apply CSS
    // pseudo-elements like ::-webkit-scrollbar.
    const plainStyle = document.createElement('style');
    plainStyle.setAttribute('data-engine-styles-plain', 'true');
    plainStyle.textContent = ENGINE_PLAIN_CSS;
    document.head.appendChild(plainStyle);

    _injected = true;
};
