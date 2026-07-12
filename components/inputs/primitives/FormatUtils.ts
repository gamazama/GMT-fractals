/**
 * Format utilities for numeric input display
 * Unified across Slider and Vector inputs
 */

/**
 * Format a float for display, removing unnecessary precision
 */
export const formatDisplay = (val: number): string => {
    if (val === 0) return "0";
    if (Math.abs(val) < 1e-9) return "0";
    return parseFloat(val.toFixed(8)).toString();
};

/**
 * Format a value for the timeline / graph-editor live-value display.
 * Switches to exponential notation when the magnitude falls outside the
 * range fixed-decimal can represent without rounding to "0.00" (deep-zoom
 * params like julia.zoom can be ~1e-30) or before fixed notation gets
 * unreadably long (>= 1e7). Two sig figs in exponential form keeps the
 * sidebar narrow.
 */
export const formatTimelineValue = (val: number, decimals: number = 2): string => {
    if (!isFinite(val)) return String(val);
    if (val === 0) return "0";
    const abs = Math.abs(val);
    if (abs < 1e-3 || abs >= 1e7) return val.toExponential(2);
    return val.toFixed(decimals);
};

/**
 * Pi unit mapping for rotation inputs
 * Converts between radians (internal) and π units (display)
 */
export const piMapping = {
    toDisplay: (v: number): number => v / Math.PI,
    fromDisplay: (v: number): number => v * Math.PI,
    
    format: (v: number): string => {
        const piVal = v / Math.PI;
        const absVal = Math.abs(piVal);
        const sign = piVal < 0 ? '-' : '';
        
        // Special cases for common fractions
        if (absVal < 0.001) return '0';
        if (Math.abs(absVal - 1) < 0.001) return `${sign}π`;
        if (Math.abs(absVal - 0.5) < 0.001) return `${sign}π/2`;
        if (Math.abs(absVal - 0.25) < 0.001) return `${sign}π/4`;
        if (Math.abs(absVal - 0.75) < 0.001) return `${sign}3π/4`;
        if (Math.abs(absVal - 2) < 0.001) return `${sign}2π`;
        
        // Check for other simple fractions
        const thirds = Math.round(absVal * 3);
        if (Math.abs(absVal - thirds / 3) < 0.001 && thirds !== 0) {
            if (thirds === 1) return `${sign}π/3`;
            if (thirds === 2) return `${sign}2π/3`;
            if (thirds === 3) return `${sign}π`;
            if (thirds === 4) return `${sign}4π/3`;
            if (thirds === 5) return `${sign}5π/3`;
        }
        
        // Default to decimal
        return `${sign}${absVal.toFixed(2)}π`;
    },
    
    /**
     * Parse user input that may contain π notation
     * Handles: "0.5", "0.5π", "π/2", "-π", "3.14"
     */
    parseInput: (s: string): number | null => {
        const cleaned = s.trim().toLowerCase().replace(/\s/g, '');
        
        // Special cases
        if (cleaned === 'π' || cleaned === 'pi') return Math.PI;
        if (cleaned === '-π' || cleaned === '-pi') return -Math.PI;
        
        // Check for π notation
        if (cleaned.includes('π') || cleaned.includes('pi')) {
            // Remove π/pi characters
            const numPart = cleaned.replace(/[πpi]/g, '');
            
            // Handle fractions like "π/2"
            if (numPart.includes('/')) {
                const [num, denom] = numPart.split('/').map(n => parseFloat(n) || 1);
                const sign = cleaned.startsWith('-') ? -1 : 1;
                return sign * (Math.abs(num) / denom) * Math.PI;
            }
            
            // Handle decimals like "0.5π"
            const coeff = numPart ? parseFloat(numPart) : 1;
            if (isNaN(coeff)) return null;
            const sign = cleaned.startsWith('-') ? -1 : 1;
            return sign * Math.abs(coeff) * Math.PI;
        }
        
        // Plain number
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }
};

/**
 * Degrees mapping for rotation inputs
 * Converts between radians (internal) and degrees (display)
 */
export const degreesMapping = {
    toDisplay: (v: number): number => v * (180 / Math.PI),
    fromDisplay: (v: number): number => v * (Math.PI / 180),
    format: (v: number): string => `${(v * (180 / Math.PI)).toFixed(1)}°`,
    parseInput: (s: string): number | null => {
        const cleaned = s.trim().replace(/°/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return null;
        // Return the display value (degrees), fromDisplay will convert to radians
        return num;
    }
};

/**
 * Degrees-NATIVE mapping: the STORED value already is degrees (MB3D-imported
 * rotations, RotationDescriptor units:'deg'). Identity transform with °
 * formatting — contrast degreesMapping above, which converts an internally-
 * radian value for display.
 */
export const nativeDegreesMapping = {
    toDisplay: (v: number): number => v,
    fromDisplay: (v: number): number => v,
    format: (v: number): string => `${v.toFixed(1)}°`,
    parseInput: (s: string): number | null => {
        const cleaned = s.trim().replace(/°/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }
};

/** Parse a plain float; null on NaN. Shared default for the mapping factories. */
const plainParse = (s: string): number | null => {
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
};

/** Smallest positive value a log slider can display (avoids log10(0) = -∞). */
const LOG_DISPLAY_FLOOR = 1e-6;
/**
 * A `min` at or below this is treated as an epsilon floor standing in for 0, so
 * the slider reserves a hard 0 at the far-left. Set generously (0.1) — most
 * "small positive floor" params (density 0.001, repeats 0.1, gradient rates
 * ~0.05) want 0 reachable; params whose min is a real quantity (escape radius 1)
 * sit above it and stay pure log. Override per call site with `{ reserveZero }`.
 */
const LOG_ZERO_EPS = 0.1;

/**
 * Display domain for the mapping factories below. All of them normalise to a
 * fixed [0, DISPLAY_SPAN] track: the drag code quantizes the *display* value by
 * the param's raw `step`, so a coarse-step slider (e.g. Iterations step=1) needs
 * a wide, uniform display range to have enough stops. Positioning uses
 * `domainMin`/`domainMax`, so the absolute scale is otherwise invisible.
 */
const DISPLAY_SPAN = 100;

/**
 * Logarithmic mapping for large-range sliders — the single canonical log impl.
 *
 * A pure log10 map can't represent 0 (log10(0) = -∞), so a log slider's far-left
 * historically clamped to `min` and 0 was unreachable. When the param is
 * epsilon-floored (`min ≤ LOG_ZERO_EPS`, including `min === 0`) this reserves a
 * thin band at the bottom of the track as a hard "snap to zero": the leftmost
 * handle position emits exactly 0, `min` sits just above it, and the rest of the
 * range stays logarithmic. Params whose `min` is a real value (e.g. an escape
 * radius of 1) stay pure log — 0 there is meaningless. Pass `{ reserveZero }`
 * to override the heuristic per call site.
 *
 * @invariant when reserving: fromDisplay(0) === 0 at the far-left edge.
 */
export const createLogMapping = (
    min: number,
    max: number,
    opts?: { reserveZero?: boolean },
): ValueMapping => {
    const safeMin = Math.max(LOG_DISPLAY_FLOOR, min);
    const logMin = Math.log10(safeMin);
    const logMax = Math.log10(max);
    const span = Math.max(1e-9, logMax - logMin);
    const reserveZero = opts?.reserveZero ?? (min <= LOG_ZERO_EPS);

    if (!reserveZero) {
        return {
            toDisplay: (v: number): number => (v <= 0 ? 0 : ((Math.log10(v) - logMin) / span) * DISPLAY_SPAN),
            fromDisplay: (v: number): number => Math.pow(10, logMin + (v / DISPLAY_SPAN) * span),
            format: (v: number): string => formatDisplay(v),
            parseInput: plainParse,
            domainMin: 0,
            domainMax: DISPLAY_SPAN,
        };
    }

    // Reserve a thin slice at the bottom of the track for an exact 0; `min` sits
    // ZERO_BAND above the far-left edge and the log range fills the rest.
    const ZERO_BAND = DISPLAY_SPAN * 0.05;
    const logSpan = DISPLAY_SPAN - ZERO_BAND;
    return {
        toDisplay: (v: number): number =>
            v <= 0 ? 0 : ZERO_BAND + ((Math.log10(Math.max(safeMin, v)) - logMin) / span) * logSpan,
        // Anything dragged into the bottom half of the reserved band snaps to 0.
        fromDisplay: (v: number): number =>
            v <= ZERO_BAND / 2 ? 0 : Math.pow(10, logMin + ((v - ZERO_BAND) / logSpan) * span),
        format: (v: number): string => formatDisplay(v),
        parseInput: plainParse,
        domainMin: 0,
        domainMax: DISPLAY_SPAN,
    };
};

/**
 * "log1p"-style mapping for [0, max] sliders that must reach 0 naturally
 * (intensity, range/falloff): display is log10(v + 1) normalised to the track,
 * so v = 0 → 0 with no reserved band. Replaces hand-rolled
 * `log10(val + 1) / log10(max + 1)` closures.
 */
export const createLog1pMapping = (max: number): ValueMapping => {
    const denom = Math.log10(max + 1);
    return {
        toDisplay: (v: number): number => (Math.log10(Math.max(0, v) + 1) / denom) * DISPLAY_SPAN,
        fromDisplay: (v: number): number => Math.pow(max + 1, v / DISPLAY_SPAN) - 1,
        format: (v: number): string => formatDisplay(v),
        parseInput: plainParse,
        domainMin: 0,
        domainMax: DISPLAY_SPAN,
    };
};

/**
 * Power mapping over [min, max] with a display exponent (perceptual easing):
 * exp = 2 is the "square"/sqrt feel (fine control near min), exp = 3 the cubic
 * feel used by the Iterations slider. Replaces the scattered sqrt/cube closures.
 */
export const createPowMapping = (min: number, max: number, exp: number): ValueMapping => {
    const range = (max - min) || 1;
    return {
        toDisplay: (v: number): number => Math.pow(Math.max(0, (v - min) / range), 1 / exp) * DISPLAY_SPAN,
        fromDisplay: (v: number): number => min + Math.pow(Math.max(0, v) / DISPLAY_SPAN, exp) * range,
        format: (v: number): string => formatDisplay(v),
        parseInput: plainParse,
        domainMin: 0,
        domainMax: DISPLAY_SPAN,
    };
};

/**
 * π-unit slider mapping with plain-number text entry: the display value is the
 * count of π (v / π), and typed numbers are interpreted as that count. Distinct
 * from `piMapping`, which parses π-notation ("π/2") for direct-radian entry —
 * these slider call sites always pass `mapTextInput` + an overrideInputText, so
 * they want the plain-count behaviour.
 */
export const piUnitMapping: ValueMapping = {
    toDisplay: (v: number): number => v / Math.PI,
    fromDisplay: (v: number): number => v * Math.PI,
    format: (v: number): string => `${(v / Math.PI).toFixed(2)}π`,
    parseInput: plainParse,
};

/**
 * Linear mapping (default)
 */
export const linearMapping = {
    toDisplay: (v: number): number => v,
    fromDisplay: (v: number): number => v,
    format: (v: number): string => formatDisplay(v),
    parseInput: (s: string): number | null => {
        const num = parseFloat(s);
        return isNaN(num) ? null : num;
    }
};

export interface ValueMapping {
    toDisplay: (v: number) => number;
    fromDisplay: (v: number) => number;
    format: (v: number) => string;
    parseInput: (s: string) => number | null;
    /**
     * Optional explicit display-domain edges. When present, slider consumers must
     * anchor the track on these instead of toDisplay(min)/toDisplay(max). Used by
     * the log mapping to reserve a bottom band for an exact 0 — without them 0 and
     * the epsilon `min` would land at the same 0% position. See createLogMapping.
     */
    domainMin?: number;
    domainMax?: number;
}

/**
 * Resolve the display-space lower/upper edges a slider should anchor on, honouring
 * a mapping's explicit domain (createLogMapping's reserved-zero band) and falling
 * back to toDisplay(min)/toDisplay(max) for plain mappings.
 */
export const mappedDomain = (
    min: number,
    max: number,
    mapping?: ValueMapping,
): { dMin: number; dMax: number } => ({
    dMin: mapping ? (mapping.domainMin ?? mapping.toDisplay(min)) : min,
    dMax: mapping ? (mapping.domainMax ?? mapping.toDisplay(max)) : max,
});

/**
 * Get appropriate mapping based on scale type
 */
export const getMapping = (scale?: 'linear' | 'log' | 'pi', min?: number, max?: number): ValueMapping => {
    if (scale === 'pi') return piMapping;
    if (scale === 'log' && min !== undefined && max !== undefined) {
        return createLogMapping(min, max);
    }
    return linearMapping;
};

/**
 * Compute fill bar percentage from value and bounds, applying optional mapping.
 * Clamps result to 0-100.
 */
export const computePercentage = (
    value: number,
    min: number,
    max: number,
    mapping?: ValueMapping,
): number => {
    const mv = mapping ? mapping.toDisplay(value) : value;
    const { dMin, dMax } = mappedDomain(min, max, mapping);
    return Math.max(0, Math.min(100, ((mv - dMin) / (dMax - dMin)) * 100));
};
