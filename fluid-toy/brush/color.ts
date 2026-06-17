/**
 * Brush colour resolver — mirrors the reference toy-fluid's pickBrushColor.
 *
 * Four colour modes (order matches the reference's BrushColorMode type
 * so index serialisation stays stable):
 *
 *   rainbow   — wall-clock-driven cosine hue cycle, one loop per ~1s.
 *               Independent of stroke speed. Reference default.
 *   solid     — one fixed RGB the user picks.
 *   gradient  — sample the main palette LUT at the cursor's (u+v)/2
 *               canvas position. Reference describes this as "paint
 *               borrows scene colour" — no iteration readback, just
 *               canvas coords.
 *   velocity  — map drag direction → hue, magnitude → lightness.
 *               Fast strokes are vivid, slow strokes dim.
 *
 * Hue jitter rotates the base colour in HSL space ±amt. Rainbow and
 * velocity modes still get jitter layered on top so long strokes don't
 * look mechanical.
 *
 * Changed since initial port: I previously invented "paintFromGradient"
 * + "sampleGradient" modes with a rolling strokeT. The reference has
 * no such thing — it samples the palette at canvas position instead.
 * The wrong default was sampling t=0 which is black in the default
 * palette, so every splat was invisible.
 */

export type BrushColorMode = 'rainbow' | 'solid' | 'gradient' | 'velocity';

const TAU = Math.PI * 2;

// HSL ↔ RGB (0..1 in each channel). Standard conversion; matches the
// reference toy-fluid's brush colour pipeline bit-for-bit.
const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
};

export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
};

export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h / 6, s, l];
};

/** Rotate hue by a random amount scaled by `jitter` (0 = no change, 1 = full hue wheel). */
export const applyBrushJitter = (rgb: [number, number, number], jitter: number): [number, number, number] => {
    if (jitter <= 0) return rgb;
    const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    const jh = (h + (Math.random() - 0.5) * jitter + 1) % 1;
    return hslToRgb(jh, s, l);
};

/** Sample a baked gradient LUT (RGBA bytes). Returns [1,1,1] if unset. */
export const sampleGradient = (lut: Uint8Array | null, t: number): [number, number, number] => {
    if (!lut || lut.length < 4) return [1, 1, 1];
    const tt = ((t % 1) + 1) % 1;
    const width = lut.length / 4;
    const i = Math.min(width - 1, Math.floor(tt * width)) * 4;
    return [lut[i] / 255, lut[i + 1] / 255, lut[i + 2] / 255];
};

export interface BrushColorArgs {
    mode: BrushColorMode;
    solidColor: [number, number, number];
    gradientLut: Uint8Array | null;
    /** Wall-clock phase 0..1 — rainbow mode uses this so hue stays smooth
     *  regardless of stroke speed or direction. */
    rainbowPhase: number;
    /** Cursor canvas UV, for gradient-mode sampling. */
    u: number;
    v: number;
    /** Pointer velocity in UV/sec, for velocity-mode hue + lightness. */
    vx: number;
    vy: number;
    /** Hue jitter in 0..1 (0 = exact colour, 1 = full hue wheel). */
    jitter: number;
}

/** Resolve a single splat's RGB. Matches reference pickBrushColor + applyBrushJitter. */
export const resolveBrushColor = (a: BrushColorArgs): [number, number, number] => {
    let rgb: [number, number, number];
    switch (a.mode) {
        case 'solid':
            rgb = [a.solidColor[0], a.solidColor[1], a.solidColor[2]];
            break;
        case 'gradient':
            // Cheap heuristic that matches the reference: sample the palette
            // at (u + v) / 2 of cursor canvas position. A real iteration
            // readback from the Julia buffer would give scene-accurate
            // colour but isn't worth the per-splat cost.
            rgb = sampleGradient(a.gradientLut, (a.u + a.v) * 0.5);
            break;
        case 'velocity': {
            const mag = Math.min(1, Math.hypot(a.vx, a.vy) * 0.2);
            const h = (Math.atan2(a.vy, a.vx) / TAU + 1) % 1;
            rgb = hslToRgb(h, 0.9, 0.35 + 0.3 * mag);
            break;
        }
        case 'rainbow':
        default: {
            // 3-channel cosine palette — matches reference exactly. Gives a
            // fully-saturated cycle without the hsl→rgb branching cost.
            const h = a.rainbowPhase;
            rgb = [
                0.5 + 0.5 * Math.cos(TAU * h),
                0.5 + 0.5 * Math.cos(TAU * (h + 0.33)),
                0.5 + 0.5 * Math.cos(TAU * (h + 0.67)),
            ];
            break;
        }
    }
    return applyBrushJitter(rgb, a.jitter);
};
