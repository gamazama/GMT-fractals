/**
 * deep-zoom-prototype/DeepZoomApp.tsx — the shell of the deep-zoom tool (the embedded-page
 * prototype, moved aside 2026-10-08; dev-only, page `deep-zoom-prototype.html`).
 *
 * PURPOSE
 *   A full-window iframe running the standalone Mandelbulb perturbation renderer
 *   (`public/deep-zoom-prototype-core/index.html?embed=1`), with the tool's own interface laid over it:
 *   top bar, depth gauge, one side panel at a time, first-run guide, a toast line.
 *
 * SEAMS
 *   - `connectCore` (./bridge) is the only way into the iframe. The resulting bridge is put in
 *     the store; slot components read it from there.
 *   - Slot components (`./ui/*`) take no props. This file decides WHERE each one sits; each slot
 *     decides what it shows. Slots are placed inside `pointer-events-none` containers whose
 *     direct children get `pointer-events-auto`, so the mouse reaches the renderer everywhere a
 *     slot does not draw.
 *   - Telemetry: polled here about 8 times a second into `store.telemetry`.
 *
 * PITFALLS
 *   - Keys go to whichever window has focus. The fly controls live in the iframe, so the tool's
 *     keys (Esc, B, J, H, /, 1-3, Home, Backspace) are listened for on BOTH windows, and a click that lands on the bare backdrop of an overlay
 *     container never happens (they are pointer-events-none) — the click reaches the iframe and
 *     focuses it by itself.
 *   - React StrictMode mounts effects twice in dev; the connect effect is cancellation-safe.
 *   - Stacking uses the repo's shell tiers through `<Layer>`; never a raw z-index here.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Layer } from '../components/ui';
import { connectCore } from './bridge';
import { useDeepZoom } from './store';
import type { PanelId } from './store';
import { TopBar } from './ui/TopBar';
import { DepthGauge, dzActions, useDzChrome } from './ui/DepthGauge';
import { LocationsPanel } from './ui/LocationsPanel';
import { RecordPanel } from './ui/RecordPanel';
import { LookPanel } from './ui/LookPanel';
import { HelpPanel, openHelp } from './ui/HelpPanel';
import { Onboarding } from './ui/Onboarding';

/** Relative on purpose: the build uses `base: './'` and is also served from a subdirectory. */
const CORE_SRC = './deep-zoom-prototype-core/index.html?embed=1';
const TELEMETRY_MS = 125;
const TOAST_MS = 3200;

/** Direct children of a pass-through container take the mouse; the container itself does not. */
const PASS = 'pointer-events-none [&>*]:pointer-events-auto';

export function DeepZoomApp() {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const bridge = useDeepZoom((s) => s.bridge);
    const panel = useDeepZoom((s) => s.panel);
    const onboarded = useDeepZoom((s) => s.onboarded);
    const toast = useDeepZoom((s) => s.toast);
    const [error, setError] = useState<string | null>(null);
    const [waited, setWaited] = useState(0);

    // Connect to the renderer once the iframe exists.
    useEffect(() => {
        const iframe = frameRef.current;
        if (!iframe) return;
        let cancelled = false;
        const { setBridge, setTelemetry } = useDeepZoom.getState();
        connectCore(iframe).then(
            (b) => {
                if (cancelled) return;
                try { setTelemetry(b.telemetry()); } catch { /* first sample arrives with the poll */ }
                setBridge(b);
                b.focus();
            },
            (e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); },
        );
        return () => { cancelled = true; setBridge(null); };
    }, []);

    // Seconds counter for the loading card.
    useEffect(() => {
        if (bridge || error) return;
        const t0 = performance.now();
        const id = window.setInterval(() => setWaited(Math.floor((performance.now() - t0) / 1000)), 500);
        return () => window.clearInterval(id);
    }, [bridge, error]);

    // Telemetry poll.
    useEffect(() => {
        if (!bridge) return;
        const id = window.setInterval(() => {
            try { useDeepZoom.getState().setTelemetry(bridge.telemetry()); } catch { /* frame reloading */ }
        }, TELEMETRY_MS);
        return () => window.clearInterval(id);
    }, [bridge]);

    // Frame progress of a path render. The core writes 'frame f/n' into its own progress box,
    // which `?embed=1` hides; it is read here so the top bar and the Record panel can show it.
    // Lives in the shell, not the Record panel, because a render outlives that panel closing.
    const exporting = useDeepZoom((s) => !!s.telemetry?.exporting);
    useEffect(() => {
        if (!bridge || !exporting) return;
        const read = () => {
            // innerHTML, not textContent: the core writes 'frame 3/300<br><small>1280px ...', and
            // textContent would run the total into the next number ('3001280').
            let html = '';
            try { html = bridge.win.document.querySelector('#loading .box')?.innerHTML || ''; } catch { /* frame gone */ }
            const m = /frame (\d+)\/(\d+)(?!\d)/.exec(html);
            const cur = useDzChrome.getState().renderInfo;
            if (m) {
                const frame = Number(m[1]), total = Number(m[2]);
                if (!cur || cur.frame !== frame || cur.total !== total) useDzChrome.getState().setRenderInfo({ frame, total });
            }
        };
        read();
        const id = window.setInterval(read, 250);
        return () => { window.clearInterval(id); useDzChrome.getState().setRenderInfo(null); };
    }, [bridge, exporting]);

    // The tool's keys, whichever window has the keyboard. None collides with the core's own keys
    // (grep `addEventListener('keydown'` in the core page: it uses 9 and 0, not 1-3, and none of
    // B, J, H, /, Home, Backspace).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const tag = ((e.target as HTMLElement | null)?.tagName || '').toLowerCase();
            const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
            const s = useDeepZoom.getState();
            if (e.key === 'Escape') {
                // Esc also cancels a render, a preview and a dive (the core handles those). Close
                // the panel only when nothing is running, so the result line stays in view.
                const t = s.telemetry;
                if ((t && (t.exporting || t.playing)) || useDzChrome.getState().dive) return;
                if (s.panel !== 'none') { s.setPanel('none'); s.bridge?.focus(); }
                return;
            }
            if (typing || e.repeat || !s.bridge) return;
            const toggle = (p: PanelId) => { s.setPanel(s.panel === p ? 'none' : p); };
            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            switch (k) {
                case 'b': dzActions.bookmark(); break;
                case 'j': dzActions.focusDive(); break;
                case 'h': dzActions.cycleOverlay(); break;
                case '/': if (s.panel === 'help') s.setPanel('none'); else openHelp(); break;
                case '1': toggle('locations'); break;
                case '2': toggle('record'); break;
                case '3': toggle('look'); break;
                case 'Home': dzActions.goHome(); break;
                case 'Backspace': dzActions.goBack(); break;
                default: return;
            }
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        const inner = bridge?.win;
        try { inner?.addEventListener('keydown', onKey); } catch { /* frame gone */ }
        return () => {
            window.removeEventListener('keydown', onKey);
            try { inner?.removeEventListener('keydown', onKey); } catch { /* frame gone */ }
        };
    }, [bridge]);

    // The toast clears itself.
    useEffect(() => {
        if (!toast) return;
        const id = window.setTimeout(() => useDeepZoom.getState().say(null), TOAST_MS);
        return () => window.clearTimeout(id);
    }, [toast]);

    const ready = !!bridge && !error;

    return (
        <div data-dz-shell className="relative w-screen h-screen overflow-hidden bg-black font-mono text-fg-secondary">
            <iframe
                ref={frameRef}
                src={CORE_SRC}
                title="Mandelbulb deep zoom renderer"
                allow="fullscreen"
                className="absolute inset-0 w-full h-full border-0 block bg-black"
            />

            {ready ? (
                <>
                    {/* Depth gauge: left edge, under the top bar. */}
                    <Layer tier="shellHud" position="absolute" data-dz-slot="gauge"
                        className={'left-0 top-12 bottom-0 flex items-center pl-2 ' + PASS}>
                        <DepthGauge />
                    </Layer>

                    {/* One side panel: right edge, under the top bar. */}
                    {panel !== 'none' ? (
                        <Layer tier="shellDock" position="absolute" data-dz-slot="panel" data-dz-panel={panel}
                            className={'right-2 top-12 bottom-2 flex items-start justify-end ' + PASS}>
                            {panel === 'locations' ? <LocationsPanel /> : null}
                            {panel === 'record' ? <RecordPanel /> : null}
                            {panel === 'look' ? <LookPanel /> : null}
                            {panel === 'help' ? <HelpPanel /> : null}
                        </Layer>
                    ) : null}

                    <Layer tier="shellTopbar" position="absolute" data-dz-slot="topbar"
                        className={'top-0 left-0 right-0 ' + PASS}>
                        <TopBar />
                    </Layer>

                    {!onboarded ? (
                        <Layer tier="shellRedock" position="absolute" data-dz-slot="onboarding"
                            className={'inset-0 flex items-center justify-center p-4 ' + PASS}>
                            <Onboarding />
                        </Layer>
                    ) : null}
                </>
            ) : null}

            {!bridge && !error ? (
                <Layer tier="shellLoading" position="absolute" data-dz-slot="loading"
                    className="inset-0 flex items-center justify-center pointer-events-none">
                    <div role="status" className="max-w-sm text-center bg-surface-section/90 border border-line/10 rounded px-5 py-4">
                        <div className="text-sm font-bold text-fg tracking-wide">Deep Zoom</div>
                        <div className="mt-1 text-[11px] text-fg-secondary">compiling the deep renderer - first load only</div>
                        <div className="mt-2 text-[10px] text-fg-dim tabular-nums">
                            {waited} s{waited >= 20 ? ' · the big shader can take a minute on a cold cache' : ''}
                        </div>
                    </div>
                </Layer>
            ) : null}

            {error ? (
                <Layer tier="shellLoading" position="absolute" data-dz-slot="error"
                    className="inset-0 flex items-center justify-center p-4 bg-black/70">
                    <div role="alert" className="max-w-lg bg-surface-section border border-danger/40 rounded px-5 py-4">
                        <div className="text-sm font-bold text-danger tracking-wide">The deep renderer did not start</div>
                        <pre className="mt-2 text-[11px] text-fg-secondary whitespace-pre-wrap break-words max-h-60 overflow-auto">{error}</pre>
                        <div className="mt-2 text-[10px] text-fg-dim">
                            It needs WebGL2 with float render targets on a real GPU. Try a current desktop Chrome, Edge or Firefox.
                        </div>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-3 text-[11px] px-2.5 py-1.5 bg-line/10 text-fg-secondary border border-line/10 rounded-sm hover:bg-line/15 cursor-pointer"
                        >
                            Reload
                        </button>
                    </div>
                </Layer>
            ) : null}

            {toast ? (
                <Layer tier="shellToast" position="absolute" data-dz-slot="toast"
                    className="left-0 right-0 bottom-6 flex justify-center pointer-events-none">
                    <div role="status" aria-live="polite"
                        className="max-w-[80vw] text-[11px] text-fg bg-surface-section/95 border border-line/20 rounded px-3 py-1.5 shadow-xl">
                        {toast}
                    </div>
                </Layer>
            ) : null}
        </div>
    );
}
