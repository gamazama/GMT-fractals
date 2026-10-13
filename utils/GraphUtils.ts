import { getThemeColor } from '../engine/store/colorSchemeStore';
import { isLogTrack } from '../engine/animation/logTrackRegistry';
import { isPayloadTrack } from '../engine/animation/payloadTrackRegistry';

export interface GraphViewTransform {
    panX: number; // Frame offset
    panY: number; // Value offset
    scaleX: number; // Pixels per Frame
    scaleY: number; // Pixels per Value Unit
    width: number;
    height: number;
}

/** Curve-editor / graph chrome palette. Each property resolves LIVE from the
 *  active color scheme via getThemeColor (cached; one getComputedStyle per
 *  scheme change, not per draw). Call sites keep using `THEME.gridColor` etc.
 *  and automatically follow the runtime theme. @see engine/store/colorSchemeStore.ts */
export const THEME = {
    get gridColor() { return getThemeColor('--line', 0.18); },
    get subGridColor() { return getThemeColor('--line', 0.10); },
    get zeroLineColor() { return getThemeColor('--fg-dim'); },
    get keyColor() { return getThemeColor('--warn'); },
    get keySelectedColor() { return getThemeColor('--fg'); },
    get handleColor() { return getThemeColor('--secondary'); },
    get handleLineColor() { return getThemeColor('--secondary-strong'); },
    get curveColor() { return getThemeColor('--accent-400'); },
    get backgroundColor() { return getThemeColor('--surface-viewport'); },
    /** The wash over the region PAST the duration limit — everything right of the last
     *  frame — and the diagonal hatch on top of it.
     *
     *  A wash of INK at low alpha, deliberately. The literal `rgba(0,0,0,0.6)` these
     *  replaced was a black smear once the viewport went light (GE v2 §8b item 7), but no
     *  fixed colour can work either: `--surface-viewport` sweeps 5 → 224 with brightness
     *  (0 → 255 under high contrast), so any constant lands ON the viewport somewhere and
     *  the region stops reading. `--fg` inverts with the regime already, so a wash of it
     *  pushes AWAY from the surface at every brightness — lighter on a dark interface,
     *  darker on a light one. Low alpha because it must recede, not smear.
     *
     *  @invariant the veil stays visible against the viewport under every preset, high
     *    contrast included — proven by: npx tsx debug/test-theme-scrim.mts ("veil reads")
     */
    get limitVeilColor() { return getThemeColor('--fg', 0.10); },
    /** The diagonal hatch drawn on top of {@link limitVeilColor}. Cached into a
     *  CanvasPattern by the renderer, which must therefore drop that cache on theme
     *  change — see `_limitPattern` in GraphRenderer.ts. */
    get limitHatchColor() { return getThemeColor('--fg', 0.16); },
};

// Transform Data (Frame, Value) -> Screen (X, Y)
export const valToPx = (val: number, pan: number, scale: number, origin: number, invert: boolean = false) => {
    // scale is pixels per unit
    // origin is usually center height for Y, or 0 for X
    const offset = (val - pan) * scale;
    return invert ? origin - offset : origin + offset;
};

// Transform Screen (X, Y) -> Data (Frame, Value)
export const pxToVal = (px: number, pan: number, scale: number, origin: number, invert: boolean = false) => {
    const offset = invert ? origin - px : px - origin;
    return pan + offset / scale;
};

export const frameToPixel = (frame: number, transform: GraphViewTransform) => {
    return (frame - transform.panX) * transform.scaleX;
};

export const pixelToFrame = (px: number, transform: GraphViewTransform) => {
    return (px / transform.scaleX) + transform.panX;
};

export const valueToPixel = (value: number, transform: GraphViewTransform) => {
    // Y origin is usually height/2 to put 0 in middle
    const centerY = transform.height / 2;
    // Invert Y so up is positive
    return centerY - ((value - transform.panY) * transform.scaleY);
};

export const pixelToValue = (py: number, transform: GraphViewTransform) => {
    const centerY = transform.height / 2;
    return transform.panY + (centerY - py) / transform.scaleY;
};

// --- A TRACK'S OWN SPACE: GRAPH Y ---
/**
 * The graph editors plot every track on ONE vertical number line, in graph units. A plain
 * track sits at its value. An exponential track (`engine/animation/logTrackRegistry.ts`) sits
 * at its EXPONENT, log10(value), one unit a decade: that is the space such a track is eased in,
 * so the drawn curve is the played one and a straight line is a constant rate of scale.
 *
 * SEAM. Whatever turns a value into a pixel, or a pointer move into a value, goes through these
 * functions - the curve and its keys (`GraphRendererBuilder`), the selected keys, handles and
 * gutter labels (`GraphRenderer`), the hit test and both drags (`hooks/useGraphInteraction.ts`),
 * the selection box (`components/graph/GraphSelectionBBox.tsx`) and the host's own `v2p` / `p2v`
 * (`components/GraphEditor.tsx`). A site that does its own arithmetic draws or edits a plain
 * track where an exponential one is.
 *
 * PITFALLS.
 *   - A key's TANGENT y on an exponential track is in natural-log units (that is what
 *     `AnimationMath.interpolate` solves in), not in decades: scale it by `tangentGraphY`.
 *   - `isLog` is false for a plain track and every function is then the identity or a plain sum.
 *   - A key at or below zero on an exponential track has no exponent: it is plotted at its plain
 *     value, and playback eases that segment in plain values too.
 *
 * @invariant On an exponential track a handle is drawn at the Bezier control point playback
 *   solves with - proven by: npm run test:log-curves ("[G] a handle sits on the control
 *   point the evaluator uses").
 * @assumption The rest of that test's [G] lines (a key dragged `d` graph units moves `d`
 *   decades, the gutter's labels, the fitted view) and its [P] line for this file (a plain
 *   track gets the plain sum back) are green and were not each seen red.
 */
export const toGraphY = (value: number, isLog: boolean): number => (isLog && value > 0 ? Math.log10(value) : value);
export const fromGraphY = (y: number, isLog: boolean): number => (isLog ? Math.pow(10, y) : y);
/** Graph units per unit of a tangent's y. */
export const tangentGraphY = (isLog: boolean): number => (isLog ? Math.LOG10E : 1);

/** A tangent handle's graph Y: the key's own plus the tangent's rise. Over `range` (the track's
 *  normalised range, in graph units) it is the 0..1 place inside it. */
export const graphHandleY = (value: number, tangentY: number, isLog: boolean, range?: { min: number; span: number } | null): number => {
    const y = toGraphY(value, isLog) + tangentY * tangentGraphY(isLog);
    return range ? (y - range.min) / range.span : y;
};

/** `value` moved by `dy` graph units. */
export const offsetGraphY = (value: number, dy: number, isLog: boolean): number =>
    (isLog && value > 0 && dy !== 0 ? fromGraphY(Math.log10(value) + dy, true) : value + dy);

/** The value a key takes when dragged `dy` graph units from `start`, or undefined on a payload
 *  track (`engine/animation/payloadTrackRegistry.ts`): there a key moves in time only. */
export const draggedKeyValue = (trackId: string, start: number, dy: number): number | undefined =>
    (isPayloadTrack(trackId) ? undefined : offsetGraphY(start, dy, isLogTrack(trackId)));

/** A gutter label: on an exponential axis the VALUE at that graph Y (1e-10, 0.001, 250). */
export const formatGraphY = (y: number, isLog: boolean): string => {
    if (!isLog) return y.toString();
    if (Math.abs(y) < 4.5) return String(Number(Math.pow(10, y).toPrecision(3)));
    // Mantissa and exponent apart, so a line far outside a double's range still reads (1e400).
    let exponent = Math.floor(y), mantissa = Number(Math.pow(10, y - exponent).toPrecision(3));
    if (mantissa >= 10) { mantissa /= 10; exponent++; }
    return `${mantissa}e${exponent}`;
};

// Helper to determine nice grid steps for Values (Float)
export const getGridStep = (scale: number, minPixelGap: number = 50) => {
    const targetStep = minPixelGap / scale;
    const power = Math.floor(Math.log10(targetStep));
    const magnitude = Math.pow(10, power);
    const normalized = targetStep / magnitude; // 1..10
    
    let step = 1;
    if (normalized > 5) step = 10;
    else if (normalized > 2) step = 5;
    else if (normalized > 1) step = 2;
    else step = 1;
    
    return step * magnitude;
};

// Helper to determine nice grid steps for Time (Integer Frames)
// Shared by TimelineRuler and GraphEditor
export const getTimeGridSteps = (pxPerFrame: number) => {
    const minTextSpace = 40; // Pixels needed for label
    const minLineSpace = 6;  // Pixels needed for a tick

    const intervals = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 5000];
    
    // Find smallest interval that fits the text
    let textStep = intervals.find(i => i * pxPerFrame >= minTextSpace) || 1000;
    
    // Find smallest interval that fits the lines
    let lineStep = intervals.find(i => i * pxPerFrame >= minLineSpace) || textStep;
    
    if (textStep % lineStep !== 0) lineStep = textStep;

    return { textStep, lineStep };
};
