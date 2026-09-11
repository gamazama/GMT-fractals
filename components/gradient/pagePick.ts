/**
 * pagePick — "pick a colour" for the browsers that have no `EyeDropper`.
 *
 * The picker's pipette is `window.EyeDropper`, which is Chromium-only: Firefox has never
 * shipped it and neither has Safari (and no mobile browser has it at all). On those the
 * button did nothing but flash amber and say "Eyedropper unsupported" — which is true and
 * useless, since the colours a user actually wants are the ones on this page: the ramp, a
 * wall tile, the source photo, a swatch.
 *
 * So this is the fallback: the same gesture, scoped to the document. An overlay takes the
 * pointer, the colour under the cursor is read live, a click commits it and Esc cancels.
 *
 * WHAT IT CAN AND CANNOT SEE — the honest limit, stated because the button's label depends
 * on it. The native pipette samples the whole SCREEN (other windows included). This samples
 * the PAGE, by asking the topmost element under the cursor for its colour:
 *   • a 2D `<canvas>` — `getImageData` at the cursor, in backing-store pixels. That is the
 *     hero ramp, the wall, the curve plot, the picker's own pads: everything that matters
 *     in Gradient Explorer.
 *   • an `<img>` / `<video>` — drawn into a 1×1 scratch canvas. Cross-origin content taints
 *     it and throws; that is caught and falls through.
 *   • anything else — the nearest ancestor with a non-transparent computed
 *     `background-color`. Covers swatches, chips, panels, the ground.
 *   • a WebGL canvas without `preserveDrawingBuffer` reads back empty, so it falls through
 *     to the background rule rather than returning a false black.
 *
 * The picker labels the button accordingly ("Pick from screen" vs "Pick a colour on this
 * page"), so the gesture never promises more than it can do.
 *
 * No store imports, no React: an imperative promise the picker awaits, the same shape as
 * `new EyeDropper().open()` — resolves with `#RRGGBB`, or null when cancelled.
 *
 * @see docs/adr/0116-the-colour-picker-on-a-phone-and-without-a-pipette.md
 */

/** Our own chrome, so `elementsFromPoint` can skip it. */
const OWN = 'data-gmt-pagepick';

const scratch = (): CanvasRenderingContext2D | null => {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.getContext('2d', { willReadFrequently: true });
};

const toHex = (r: number, g: number, b: number): string =>
    '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1).toUpperCase();

/** `rgb(r g b)` / `rgba(r, g, b, a)` → hex, or null when transparent / unparseable. */
const fromCssColor = (css: string): string | null => {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/i.exec(css);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) < 0.05) return null; // effectively transparent
    return toHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
};

/** One pixel out of a canvas, in ITS backing-store coordinates (a canvas is routinely
 *  displayed at a size other than its width/height — the hero ramp is 1536×1 stretched). */
const fromCanvas = (cv: HTMLCanvasElement, clientX: number, clientY: number): string | null => {
    const r = cv.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    const x = Math.min(cv.width - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * cv.width)));
    const y = Math.min(cv.height - 1, Math.max(0, Math.floor(((clientY - r.top) / r.height) * cv.height)));
    try {
        // `getContext('2d')` returns the EXISTING 2D context, or null when the canvas is
        // already a WebGL one — which is the WebGL fall-through described at the top.
        const ctx = cv.getContext('2d');
        if (!ctx) return null;
        const d = ctx.getImageData(x, y, 1, 1).data;
        return d[3] < 10 ? null : toHex(d[0], d[1], d[2]);
    } catch {
        return null; // tainted by a cross-origin draw
    }
};

const fromImage = (el: HTMLImageElement | HTMLVideoElement, clientX: number, clientY: number): string | null => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    const nw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
    const nh = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
    if (!nw || !nh) return null;
    // `object-fit` is not modelled: the sample is taken as if the media filled its box.
    // Wrong only at the letterboxed edges of a `contain` image, and cheap to be wrong about.
    const sx = Math.min(nw - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * nw)));
    const sy = Math.min(nh - 1, Math.max(0, Math.floor(((clientY - r.top) / r.height) * nh)));
    const ctx = scratch();
    if (!ctx) return null;
    try {
        ctx.drawImage(el as CanvasImageSource, sx, sy, 1, 1, 0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return d[3] < 10 ? null : toHex(d[0], d[1], d[2]);
    } catch {
        return null; // tainted
    }
};

const covers = (el: Element, x: number, y: number): boolean => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && x >= r.left && x < r.right && y >= r.top && y < r.bottom;
};

const sampleMedia = (el: Element, x: number, y: number): string | null =>
    el instanceof HTMLCanvasElement ? fromCanvas(el, x, y)
        : el instanceof HTMLImageElement || el instanceof HTMLVideoElement ? fromImage(el, x, y)
            : null;

/**
 * The colour under (x, y), by the rules in this file's header.
 *
 * `elementsFromPoint` alone is NOT enough, and the reason is the important one: it honours
 * `pointer-events`, so every decorative canvas is invisible to it — and in this app the
 * decorative canvases are the whole point. The hero's ramp is `pointer-events-none` (the
 * knots and bias handles below it need the clicks), so a straight hit-test walked straight
 * past the gradient and returned the page's background instead (measured 2026-09-11: the
 * first cut picked #050505 off a ramp showing #EAEDF3).
 *
 * So each element of the hit stack is asked twice, top-down: does it CONTAIN a canvas /
 * image covering this point (its last such descendant, which is the one painted on top),
 * and failing that does it paint a background colour of its own.
 */
export const colourAtPoint = (x: number, y: number): string | null => {
    const stack = document.elementsFromPoint(x, y).filter((el) => !el.closest(`[${OWN}]`));
    for (const el of stack) {
        const own = sampleMedia(el, x, y);
        if (own) return own;
        const media = el.querySelectorAll('canvas, img, video');
        for (let i = media.length - 1; i >= 0; i--) {
            const m = media[i];
            if (!covers(m, x, y) || getComputedStyle(m).visibility === 'hidden') continue;
            const c = sampleMedia(m, x, y);
            if (c) return c;
        }
        const bg = fromCssColor(getComputedStyle(el).backgroundColor);
        if (bg) return bg;
    }
    return null;
};

export interface PagePickOptions {
    /** Shown in the follower while picking. Defaults to the Esc hint. */
    hint?: string;
}

/**
 * Run the page-scoped pick. Resolves with `#RRGGBB`, or null if the user cancelled (Esc,
 * right-click, or a click on something with no readable colour).
 *
 * Only one runs at a time: a second call while one is open cancels the first.
 */
let activeCancel: (() => void) | null = null;

export const pickFromPage = (opts: PagePickOptions = {}): Promise<string | null> => {
    activeCancel?.();
    return new Promise<string | null>((resolve) => {
        const overlay = document.createElement('div');
        overlay.setAttribute(OWN, '');
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:2147483646', 'cursor:crosshair',
            'background:transparent', 'touch-action:none',
        ].join(';');

        // The follower: a swatch + the hex, so the pick is confirmed BEFORE the click.
        const chip = document.createElement('div');
        chip.setAttribute(OWN, '');
        chip.style.cssText = [
            'position:fixed', 'z-index:2147483647', 'pointer-events:none',
            'display:flex', 'align-items:center', 'gap:8px',
            'padding:6px 10px 6px 6px', 'border-radius:10px',
            'background:rgba(16,16,18,0.92)', 'border:1px solid rgba(255,255,255,0.16)',
            'box-shadow:0 6px 20px rgba(0,0,0,0.45)',
            'font:500 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace',
            'color:#f2f2f4', 'white-space:nowrap', 'opacity:0',
        ].join(';');
        const sw = document.createElement('span');
        sw.style.cssText = 'width:22px;height:22px;border-radius:6px;border:1px solid rgba(255,255,255,0.25);background:#000';
        const label = document.createElement('span');
        const hintEl = document.createElement('span');
        hintEl.textContent = opts.hint ?? 'Esc to cancel';
        hintEl.style.cssText = 'opacity:0.55;font-family:inherit';
        chip.append(sw, label, hintEl);

        let current: string | null = null;

        const paint = (x: number, y: number) => {
            current = colourAtPoint(x, y);
            sw.style.background = current ?? 'transparent';
            label.textContent = current ?? 'no colour here';
            chip.style.opacity = '1';
            // Keep the chip on screen: flip it to the other side near an edge.
            const w = chip.offsetWidth || 160;
            const h = chip.offsetHeight || 34;
            const left = x + 18 + w > window.innerWidth ? x - 18 - w : x + 18;
            const top = y + 18 + h > window.innerHeight ? y - 18 - h : y + 18;
            chip.style.left = `${Math.max(4, left)}px`;
            chip.style.top = `${Math.max(4, top)}px`;
        };

        const finish = (value: string | null) => {
            if (activeCancel !== cancel) return;
            activeCancel = null;
            window.removeEventListener('keydown', onKey, true);
            overlay.remove();
            chip.remove();
            resolve(value);
        };
        const cancel = () => finish(null);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cancel();
            }
        };

        overlay.addEventListener('pointermove', (e) => paint(e.clientX, e.clientY));
        overlay.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (e.button !== 0) return cancel();
            paint(e.clientX, e.clientY);
            finish(current);
        });
        overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); cancel(); });

        activeCancel = cancel;
        window.addEventListener('keydown', onKey, true);
        document.body.append(overlay, chip);
    });
};

/** Is the native screen pipette available? The picker uses this to choose its label. */
export const hasNativeEyeDropper = (): boolean =>
    typeof window !== 'undefined' && typeof (window as unknown as { EyeDropper?: unknown }).EyeDropper === 'function';
