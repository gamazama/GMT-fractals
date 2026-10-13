/**
 * deep-zoom/renderer/harness.ts — DEV-ONLY page script for deep-zoom-harness.html.
 *
 * PURPOSE
 *   Runs the ported renderer (core.js) the way the historical page ran, with every handle also on
 *   `window.__name`, so the proofs and tools that drive it by those handles work against it: the
 *   direct proof (debug/deep-zoom-direct-check.mts), the march bench (debug/deep-zoom-march-study.mts)
 *   and the historical suites' evaluate bodies. (Until 2026-10-11 also the parity smoke, which
 *   compared it with the historical page; that went with the page's own march.)
 *
 * QUERY FLAGS
 *   ?manual=1   autoStart off; this file drives `instance.step(now)` from its own
 *               requestAnimationFrame (the host-driven path the engine's tick will use)
 *   ?embed=0    leave the page's embed mode off (default on, like `?embed=1` of the page)
 *   ?lose=1     loseContextOnDispose on, and create() swaps in a FRESH canvas each time after the
 *               first (the remount path a React shell should use)
 *   ?formula=mandelbox   the create option `formula` (the Mandelbox from the first frame)
 *   ?ray=1      ACCEPTED AND IGNORED since 2026-10-11: it passed the create option `rayMarch`, which
 *               the module no longer has (the ray march is the bulb's only program, on from the
 *               start). Old command lines and the pictures tool still carry it.
 *   ?hold=1     the create option `holdEstimate`, as the shell passes it
 *
 * `window.__harness` is a tool's handle on the lifecycle (create / dispose / recreate, the tick count). Not part of the build: the page is
 * served by the Vite dev server only and is not in vite.config.ts's inputs.
 */
import { createDeepZoom } from './index';
import type { DeepZoomInstance } from './index';

const query = new URLSearchParams(location.search);
const manual = query.get('manual') === '1';
const embed = query.get('embed') !== '0';
const lose = query.get('lose') === '1';
const startOnBox = query.get('formula') === 'mandelbox';
const holdEstimate = query.get('hold') === '1';
let canvas = document.getElementById('gl') as HTMLCanvasElement;
let creations = 0;

let instance: DeepZoomInstance | null = null;
let previous: DeepZoomInstance | null = null;
let driving = true;
let ticks = 0;
const notices: string[] = [];

function create(): void {
    if (lose && creations > 0) {                     // a canvas whose context was lost cannot be used again
        const fresh = document.createElement('canvas');
        fresh.id = 'gl';
        canvas.replaceWith(fresh);
        canvas = fresh;
    }
    creations++;
    instance = createDeepZoom(canvas, {
        publishOnWindow: true,
        autoStart: !manual,
        embed,
        loseContextOnDispose: lose,
        ...(startOnBox ? { formula: 'mandelbox' as const } : {}),
        ...(holdEstimate ? { holdEstimate: true } : {}),
        onNotice: (message) => { notices.push(message); console.warn(message); },
    });
}
function dispose(): void {
    if (!instance) return;
    instance.dispose();
    previous = instance;
    instance = null;
}

/* Always running: counts display ticks, and in manual mode is the host that steps the renderer. */
function drive(now: number): void {
    requestAnimationFrame(drive);
    ticks++;
    if (manual && driving && instance) instance.step(now);
}

const harness = {
    manual,
    embed,
    create,
    dispose,
    recreate(): void { dispose(); create(); },
    pause(): void { driving = false; },
    resume(): void { driving = true; },
    ticks: (): number => ticks,
    frameCount: (): number => (instance ? instance.frameCount : -1),
    previousFrameCount: (): number => (previous ? previous.frameCount : -1),
    alive: (): boolean => !!instance && !instance.disposed,
    notices: (): string[] => notices.slice(),
    instance: (): DeepZoomInstance | null => instance,
};
(window as unknown as { __harness: typeof harness }).__harness = harness;

create();
requestAnimationFrame(drive);
