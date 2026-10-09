/**
 * deep-zoom/renderer/harness.ts — DEV-ONLY page script for deep-zoom-harness.html.
 *
 * PURPOSE
 *   Runs the ported renderer (core.js) the way the historical page ran, with every handle also on
 *   `window.__name`, so (a) debug/smoke-deep-zoom-parity.mts can compare it with the historical
 *   page and (b) the historical suites' evaluate bodies work against it unchanged.
 *
 * QUERY FLAGS
 *   ?manual=1   autoStart off; this file drives `instance.step(now)` from its own
 *               requestAnimationFrame (the host-driven path the engine's tick will use)
 *   ?embed=0    leave the page's embed mode off (default on, like `?embed=1` of the page)
 *   ?lose=1     loseContextOnDispose on, and create() swaps in a FRESH canvas each time after the
 *               first (the remount path a React shell should use)
 *   ?formula=mandelbox   the create option `formula` (the Mandelbox from the first frame)
 *   ?ray=1      the create option `rayMarch`, as the shell passes it
 *   ?hold=1     the create option `holdEstimate`, as the shell passes it
 *
 * `window.__harness` is the smoke's handle on the lifecycle. Not part of the build: the page is
 * served by the Vite dev server only and is not in vite.config.ts's inputs.
 */
import { createDeepZoom } from './index';
import type { DeepZoomInstance } from './index';

const query = new URLSearchParams(location.search);
const manual = query.get('manual') === '1';
const embed = query.get('embed') !== '0';
const lose = query.get('lose') === '1';
const startOnBox = query.get('formula') === 'mandelbox';
const rayMarch = query.get('ray') === '1';
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
        ...(rayMarch ? { rayMarch: true } : {}),
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
