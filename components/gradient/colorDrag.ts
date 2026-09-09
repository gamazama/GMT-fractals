/**
 * colorDrag — dragging a COLOUR onto a gradient.
 *
 * A swatch anywhere in the picker (Recent, Harmony, this gradient's own row) can be dragged
 * onto the ramp: over a knot it recolours that knot, over bare track it inserts a new one
 * there. The affordance is the point — while a colour is in flight every knot draws a dashed
 * ring, so the ramp says "these will take it" rather than making you guess (owner,
 * 2026-09-08).
 *
 * Its own MIME type, deliberately: the shelf already drags whole GRADIENTS
 * (`palette/core/favientDnd.ts`, `application/x-gmt-favient`), and a drop target must be able
 * to tell a colour from a gradient by type alone — during `dragover` the browser exposes
 * `dataTransfer.types` but not the values, so the type IS the discriminator.
 *
 * @invariant a colour drag is distinguishable from a gradient drag during dragover — proven
 *   by: npx tsx debug/test-palette-colordrag.mts ("a favient drag is not a colour drag")
 */

/** The drag type a colour uses. Never the same as the favient (gradient) type. */
export const COLOR_DND_MIME = 'application/x-gmt-color';

/**
 * The colour currently in flight, or null.
 *
 * This exists because of the same browser rule the MIME type works around, applied the
 * other way up: during `dragover` the values are hidden, so a target that wants to SHOW
 * what is about to land — a ghost, per §8b item 1 — cannot read it from the event. Nothing
 * else can carry it, so the module does.
 *
 * It is safe to read as "this drag's colour" rather than "some past drag's colour": every
 * colour drag starts by calling {@link setColorDrag}, which overwrites it, and it is only
 * ever consulted when {@link isColorDrag} says a colour drag is in progress. A drag that
 * ends without a drop leaves it set, and that is harmless for the same reason.
 */
let _inFlight: string | null = null;

/** Mark a dataTransfer as carrying `hex`. Also sets text/plain, so a drop outside pastes it. */
export const setColorDrag = (dt: DataTransfer, hex: string): void => {
    const clean = hex.trim().toUpperCase();
    dt.setData(COLOR_DND_MIME, clean);
    dt.setData('text/plain', clean);
    dt.effectAllowed = 'copy';
    _inFlight = clean;
};

/** The colour being dragged right now — readable during `dragover`, where the payload is not. */
export const colorInFlight = (): string | null => _inFlight;

/** Drag over (dropped or cancelled). Wire to the source's `onDragEnd`. */
export const endColorDrag = (): void => { _inFlight = null; };

/** Is this drag carrying a colour? Readable during `dragover`, where values are not. */
export const isColorDrag = (dt: DataTransfer | null): boolean =>
    !!dt && Array.from(dt.types).includes(COLOR_DND_MIME);

/** The hex a drop carries, or null. Only readable on `drop`. */
export const readColorDrag = (dt: DataTransfer | null): string | null => {
    if (!dt) return null;
    const raw = dt.getData(COLOR_DND_MIME);
    return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toUpperCase() : null;
};
