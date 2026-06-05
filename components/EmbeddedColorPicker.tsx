
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    hexToRgb,
    rgbToHex,
    rgbToHsb,
    hsbToRgb,
    analogous,
    monochromatic,
    complementary,
    splitComplementary,
    wrapHue,
} from '../utils/colorUtils';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import { useInteractionDrag } from '../engine/hooks/useInteractionDrag';
import { INTERACTION_SOURCES } from '../engine-gmt/interaction/interactionSources';
import { collectHelpIds } from '../utils/helpUtils';
import { usePrecisionTrackDrag, precisionMultiplier } from './inputs/usePrecisionTrackDrag';

// ─────────────────────────────────────────────────────────────────────────────
// Rich colour picker (W10): 2D saturation×brightness field + hue strip, RGB+HSB
// sliders, optional alpha, hex input/copy/eyedropper, and harmony / recents /
// palette swatch rows. Engine-shared & CONTROLLED — mounted by AutoFeaturePanel
// (every colour DDFS param), AdvancedGradientEditor, SmallColorPicker, and the
// lighting panels. All colour maths come from utils/colorUtils (P0a interface f);
// this file adds NO conversions of its own.
//
// Back-compat: `onColorChange` always emits `#RRGGBB` (never 8-digit — the stop
// renderer's hexToRgb only matches 6 digits). Alpha is opt-in via the optional
// `alpha`/`onAlphaChange` props; absent them the alpha control is hidden.
//
// Feel: sliders use the SHARED GMT precision-drag (usePrecisionTrackDrag — Shift ×10
// coarse, Alt ×0.1 fine), and the 2D field + hue strip honour the same modifiers.
// Space: sliders + swatches live under ONE collapsible header (persisted) and the
// field shrinks on narrow/mobile, so the default footprint stays small.
// ─────────────────────────────────────────────────────────────────────────────

type HSB = { h: number; s: number; v: number };

interface EmbeddedColorPickerProps {
    color: string;
    onColorChange: (color: string) => void;
    /** Opt-in alpha (0–100). When omitted the alpha control is hidden and never emitted. */
    alpha?: number;
    onAlphaChange?: (alpha: number) => void;
    /** Optional host override for the fixed Palette row. Defaults to PALETTE_DEFAULT. */
    palette?: string[];
}

// --- shared, capped, persisted recents (MRU) ---
const RECENTS_KEY = 'gmt.colorpicker.recents';
const RECENTS_CAP = 16;

const loadRecents = (): string[] => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return [];
        const raw = window.localStorage.getItem(RECENTS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string').slice(0, RECENTS_CAP) : [];
    } catch {
        return [];
    }
};
// Module-level cache so every picker instance shares one MRU within a session.
let recentsCache: string[] = loadRecents();
const recentsListeners = new Set<(r: string[]) => void>();
const pushRecent = (hex: string) => {
    const clean = hex.toUpperCase();
    recentsCache = [clean, ...recentsCache.filter((h) => h !== clean)].slice(0, RECENTS_CAP);
    try {
        window.localStorage?.setItem(RECENTS_KEY, JSON.stringify(recentsCache));
    } catch {
        /* quota / disabled — keep the in-memory MRU */
    }
    recentsListeners.forEach((fn) => fn(recentsCache));
};

// --- persisted collapse state for the details (sliders + swatches) section ---
const DETAILS_KEY = 'gmt.colorpicker.details';
const loadDetailsOpen = (): boolean => {
    try { return window.localStorage?.getItem(DETAILS_KEY) === '1'; } catch { return false; }
};
const saveDetailsOpen = (open: boolean) => {
    try { window.localStorage?.setItem(DETAILS_KEY, open ? '1' : '0'); } catch { /* ignore */ }
};

// Host-agnostic fixed palette (spans hues + neutrals).
const PALETTE_DEFAULT = [
    '#000000', '#444444', '#888888', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#FF8800', '#FFEE00', '#33CC33', '#00CCCC',
    '#1166FF', '#7733FF', '#FF33AA', '#A0522D',
];

// EyeDropper is Chromium-only and not in lib.dom yet.
interface EyeDropperResult { sRGBHex: string; }
interface EyeDropperCtor { new (): { open(): Promise<EyeDropperResult> }; }
const getEyeDropper = (): EyeDropperCtor | null =>
    (typeof window !== 'undefined' && (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper) || null;

const safeHsb = (hex: string): HSB => {
    const rgb = hexToRgb(hex);
    return rgb ? rgbToHsb(rgb) : { h: 0, s: 0, v: 100 };
};
const clampHsb = (h: number, s: number, v: number): HSB => ({
    h: wrapHue(h),
    s: Math.max(0, Math.min(100, s)),
    v: Math.max(0, Math.min(100, v)),
});
const hsbToHex = ({ h, s, v }: HSB): string => rgbToHex(hsbToRgb(h, s, v));

// A small clickable swatch strip used by harmony / recents / palette rows.
const SwatchRow: React.FC<{ label: string; colors: string[]; onPick: (hex: string) => void; current?: string }> = ({
    label,
    colors,
    onPick,
    current,
}) => (
    <div className="flex items-center gap-1.5">
        <div className="w-[52px] shrink-0 text-[9px] uppercase tracking-wide text-gray-500 font-bold">{label}</div>
        <div className="flex-1 flex gap-[2px] overflow-hidden">
            {colors.length === 0 ? (
                <div className="text-[9px] text-gray-600 italic py-[3px]">—</div>
            ) : (
                colors.map((c, i) => (
                    <button
                        key={`${c}-${i}`}
                        onClick={() => onPick(c)}
                        className={`h-4 flex-1 min-w-0 rounded-[2px] border transition-transform hover:scale-110 hover:z-10 ${
                            current && c.toUpperCase() === current.toUpperCase() ? 'border-white' : 'border-white/10'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))
            )}
        </div>
    </div>
);

/**
 * Bespoke value slider with a custom gradient track. Uses the SHARED
 * usePrecisionTrackDrag (the exact GMT slider interaction — click-to-position,
 * delta-drag, Shift ×10 coarse / Alt ×0.1 fine), so it feels identical to every
 * other GMT slider, but paints the channel/hue gradient as its track with a
 * GMT-style thumb on top (which ScalarInput can't do).
 */
const GradientSlider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    onStart: () => void;
    onEnd: () => void;
    trackBg: string;
}> = ({ label, value, min, max, step, onChange, onStart, onEnd, trackBg }) => {
    const track = usePrecisionTrackDrag({ min, max, step, onChange, onDragStart: onStart, onDragEnd: onEnd });
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-3 shrink-0 text-[9px] font-bold text-gray-400 text-center select-none">{label}</div>
            <div
                className="relative flex-1 h-3.5 rounded-sm cursor-ew-resize touch-none overflow-hidden"
                style={{ background: trackBg }}
                onPointerDown={track.onPointerDown}
                onPointerMove={track.onPointerMove}
                onPointerUp={track.onPointerUp}
                onPointerCancel={track.onPointerUp}
                onLostPointerCapture={track.onPointerUp}
            >
                {/* GMT-style thumb: a vertical bar spanning the track, dark-outlined for legibility on any gradient. */}
                <div
                    className="absolute top-0 bottom-0 w-3.5 -ml-[7px] z-10 border-x-2 border-white/80 bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] pointer-events-none"
                    style={{ left: `${pct}%` }}
                />
            </div>
            <input
                type="number"
                min={min}
                max={max}
                value={Math.round(value)}
                onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
                onFocus={onStart}
                onBlur={onEnd}
                className="w-9 shrink-0 bg-black/40 border border-white/10 rounded text-[9px] text-gray-300 px-1 py-[1px] text-right tabular-nums"
            />
        </div>
    );
};

const EmbeddedColorPicker: React.FC<EmbeddedColorPickerProps> = ({
    color,
    onColorChange,
    alpha,
    onAlphaChange,
    palette = PALETTE_DEFAULT,
}) => {
    const [hsb, setHsb] = useState<HSB>(() => safeHsb(color));
    const [recents, setRecents] = useState<string[]>(recentsCache);
    const [hexDraft, setHexDraft] = useState(color.toUpperCase());
    const [copied, setCopied] = useState(false);
    const [eyedropError, setEyedropError] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState<boolean>(() => loadDetailsOpen());

    const lastOutputHex = useRef(color.toUpperCase());
    const fieldRef = useRef<HTMLCanvasElement>(null);
    const hueRef = useRef<HTMLCanvasElement>(null);

    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();
    // Single shared gesture for every field/strip/slider drag — anchored to the param
    // transaction boundary so a colour edit is ONE undo step (ADR-0061 P3b).
    const colorSession = useInteractionDrag(INTERACTION_SOURCES.slider);

    const alphaEnabled = typeof alpha === 'number' && typeof onAlphaChange === 'function';
    const a = alphaEnabled ? alpha! : 100;

    const toggleDetails = () => setDetailsOpen((o) => { saveDetailsOpen(!o); return !o; });

    // External → internal sync, guarded against our own echoes (load-bearing: the
    // gradient editor re-emits `color`, and an unguarded setState would loop).
    useEffect(() => {
        if (color.toUpperCase() !== lastOutputHex.current) {
            setHsb(safeHsb(color));
            setHexDraft(color.toUpperCase());
            lastOutputHex.current = color.toUpperCase();
        }
    }, [color]);

    useEffect(() => {
        recentsListeners.add(setRecents);
        return () => { recentsListeners.delete(setRecents); };
    }, []);

    // Safety net: if the picker unmounts mid-gesture (portal close, section collapse,
    // focus steal) close any open param transaction. handleInteractionEnd no-ops when
    // nothing is open, so this can't double-close a normally-ended gesture.
    useEffect(() => () => handleInteractionEnd(), [handleInteractionEnd]);

    const hex = useMemo(() => hsbToHex(hsb), [hsb]);
    const rgb = useMemo(() => hsbToRgb(hsb.h, hsb.s, hsb.v), [hsb]);

    // Emit without committing to recents (called continuously during a drag).
    const emit = useCallback((next: HSB) => {
        setHsb(next);
        const h = hsbToHex(next);
        setHexDraft(h);
        lastOutputHex.current = h;
        onColorChange(h);
    }, [onColorChange]);

    // Commit (gesture end / discrete pick) — pushes to recents.
    const commit = useCallback((next: HSB) => {
        emit(next);
        pushRecent(hsbToHex(next));
    }, [emit]);

    // Discrete colour set from a hex string (hex input / swatch pick / eyedropper) —
    // one undo transaction. Invalid input reverts the hex draft to the live colour.
    const setFromHex = useCallback((raw: string) => {
        const rgbV = hexToRgb(raw);
        if (!rgbV) { setHexDraft(hex); return; }
        handleInteractionStart('param');
        commit(rgbToHsb(rgbV));
        handleInteractionEnd();
    }, [commit, hex, handleInteractionStart, handleInteractionEnd]);

    // RGB-slider edit: convert back to HSB but preserve the hue (and saturation when
    // fully dark) so dragging through a greyscale value doesn't reset the field handle.
    const rgbEdit = useCallback((patch: Partial<{ r: number; g: number; b: number }>) => {
        const next = rgbToHsb({ ...rgb, ...patch });
        if (next.s === 0) next.h = hsb.h;
        if (next.v === 0) { next.h = hsb.h; next.s = hsb.s; }
        emit(next);
    }, [rgb, hsb.h, hsb.s, emit]);

    const handleSliderStart = useCallback(() => { handleInteractionStart('param'); colorSession.onPointerDown(); }, [colorSession, handleInteractionStart]);
    const handleSliderEnd = useCallback(() => { colorSession.onPointerUp(); handleInteractionEnd(); pushRecent(lastOutputHex.current); }, [colorSession, handleInteractionEnd]);

    // --- 2D field (saturation × brightness for the current hue) ---
    useEffect(() => {
        const cv = fieldRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const { width: w, height: h } = cv;
        const base = hsbToHex({ h: hsb.h, s: 100, v: 100 });
        const sat = ctx.createLinearGradient(0, 0, w, 0);
        sat.addColorStop(0, '#FFFFFF');
        sat.addColorStop(1, base);
        ctx.fillStyle = sat;
        ctx.fillRect(0, 0, w, h);
        const val = ctx.createLinearGradient(0, 0, 0, h);
        val.addColorStop(0, 'rgba(0,0,0,0)');
        val.addColorStop(1, '#000000');
        ctx.fillStyle = val;
        ctx.fillRect(0, 0, w, h);
    }, [hsb.h]);

    // --- vertical hue strip ---
    useEffect(() => {
        const cv = hueRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const { width: w, height: h } = cv;
        const g = ctx.createLinearGradient(0, 0, 0, h);
        for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, hsbToHex({ h: (i / 6) * 360, s: 100, v: 100 }));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }, []);

    // Field / hue dragging: ABSOLUTE when unmodified (the colour under the cursor, like
    // any colour pad), and PRECISION (relative, scaled) only while Shift (×10 coarse) or
    // Alt (×0.1 fine) is held — re-anchoring on toggle so the value never jumps. The
    // anchor is kept synced in absolute mode so entering precision starts clean.
    const sat01 = (e: React.PointerEvent<HTMLCanvasElement>, r: DOMRect) => Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100;
    const bri01 = (e: React.PointerEvent<HTMLCanvasElement>, r: DOMRect) => (1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))) * 100;

    const endDrag = (ref: { current: { active: boolean } }) => (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!ref.current.active) return;
        ref.current.active = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        colorSession.onPointerUp();
        handleInteractionEnd();
        pushRecent(lastOutputHex.current);
    };

    const fieldDrag = useRef({ active: false, x: 0, y: 0, s: 0, v: 0, shift: false, alt: false });
    const beginField = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const s = sat01(e, r);
        const v = bri01(e, r);
        e.currentTarget.setPointerCapture(e.pointerId);
        handleInteractionStart('param');
        colorSession.onPointerDown();
        emit(clampHsb(hsb.h, s, v));
        fieldDrag.current = { active: true, x: e.clientX, y: e.clientY, s, v, shift: e.shiftKey, alt: e.altKey };
    };
    const moveField = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const d = fieldDrag.current;
        if (!d.active) return;
        const r = e.currentTarget.getBoundingClientRect();
        const m = precisionMultiplier(e);
        let s: number, v: number;
        if (m === 1) {
            s = sat01(e, r); v = bri01(e, r);
            d.s = s; d.v = v; d.x = e.clientX; d.y = e.clientY; d.shift = false; d.alt = false;
        } else {
            const baseS = 100 / r.width;
            const baseV = 100 / r.height;
            if (d.shift !== e.shiftKey || d.alt !== e.altKey) {
                const om = precisionMultiplier({ shiftKey: d.shift, altKey: d.alt });
                d.s = Math.max(0, Math.min(100, d.s + (e.clientX - d.x) * baseS * om));
                d.v = Math.max(0, Math.min(100, d.v - (e.clientY - d.y) * baseV * om));
                d.x = e.clientX; d.y = e.clientY; d.shift = e.shiftKey; d.alt = e.altKey;
            }
            s = d.s + (e.clientX - d.x) * baseS * m;
            v = d.v - (e.clientY - d.y) * baseV * m;
        }
        emit(clampHsb(hsb.h, s, v));
    };
    const endField = endDrag(fieldDrag);

    const hueDrag = useRef({ active: false, y: 0, h: 0, shift: false, alt: false });
    const hue01 = (e: React.PointerEvent<HTMLCanvasElement>, r: DOMRect) => Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 360;
    const beginHue = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const h = hue01(e, r);
        e.currentTarget.setPointerCapture(e.pointerId);
        handleInteractionStart('param');
        colorSession.onPointerDown();
        emit(clampHsb(h, hsb.s, hsb.v));
        hueDrag.current = { active: true, y: e.clientY, h, shift: e.shiftKey, alt: e.altKey };
    };
    const moveHue = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const d = hueDrag.current;
        if (!d.active) return;
        const r = e.currentTarget.getBoundingClientRect();
        const m = precisionMultiplier(e);
        let h: number;
        if (m === 1) {
            h = hue01(e, r);
            d.h = h; d.y = e.clientY; d.shift = false; d.alt = false;
        } else {
            const baseH = 360 / r.height;
            if (d.shift !== e.shiftKey || d.alt !== e.altKey) {
                const om = precisionMultiplier({ shiftKey: d.shift, altKey: d.alt });
                d.h = Math.max(0, Math.min(360, d.h + (e.clientY - d.y) * baseH * om));
                d.y = e.clientY; d.shift = e.shiftKey; d.alt = e.altKey;
            }
            h = Math.max(0, Math.min(360, d.h + (e.clientY - d.y) * baseH * m));
        }
        emit(clampHsb(h, hsb.s, hsb.v));
    };
    const endHue = endDrag(hueDrag);

    const doCopy = () => {
        navigator.clipboard?.writeText(hex).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1000); }).catch(() => {});
    };
    const doEyedrop = async () => {
        const ED = getEyeDropper();
        if (!ED) { setEyedropError(true); setTimeout(() => setEyedropError(false), 2000); return; }
        try {
            const res = await new ED().open();
            setFromHex(res.sRGBHex);
        } catch {
            /* user cancelled — no-op */
        }
    };

    // Only computed while the swatch rows are visible (skips 4 generator arrays per
    // drag tick when the section is collapsed — the default).
    const harmonies = useMemo(() => (detailsOpen ? {
        analogous: analogous(hex, 5, 30),
        monochromatic: monochromatic(hex, 5),
        complementary: complementary(hex),
        split: splitComplementary(hex),
    } : null), [hex, detailsOpen]);

    const handleContainerContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget as HTMLElement);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    return (
        <div
            className="flex flex-col gap-1.5 w-full bg-black/40 border border-white/5 rounded p-2 gradient-interactive-element"
            data-help-id="ui.colorpicker"
            onContextMenu={handleContainerContextMenu}
        >
            {/* Field + hue strip (shrinks on narrow/mobile; Shift/Alt = coarse/fine) */}
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <canvas
                        ref={fieldRef}
                        width={208}
                        height={120}
                        className="w-full h-[76px] md:h-[86px] rounded cursor-crosshair touch-none"
                        onPointerDown={beginField}
                        onPointerMove={moveField}
                        onPointerUp={endField}
                        onPointerCancel={endField}
                        onLostPointerCapture={endField}
                    />
                    <div
                        className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow pointer-events-none mix-blend-difference"
                        style={{ left: `${hsb.s}%`, top: `${100 - hsb.v}%` }}
                    />
                </div>
                <div className="relative w-4 shrink-0">
                    <canvas
                        ref={hueRef}
                        width={16}
                        height={120}
                        className="w-4 h-[76px] md:h-[86px] rounded cursor-crosshair touch-none"
                        onPointerDown={beginHue}
                        onPointerMove={moveHue}
                        onPointerUp={endHue}
                        onPointerCancel={endHue}
                        onLostPointerCapture={endHue}
                    />
                    <div
                        className="absolute left-0 w-full h-[3px] -mt-[1.5px] bg-white/90 rounded-full pointer-events-none shadow"
                        style={{ top: `${(hsb.h / 360) * 100}%` }}
                    />
                </div>
            </div>

            {/* Hex + copy + eyedropper */}
            <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 shrink-0 rounded border border-white/10" style={{ backgroundColor: hex }} />
                <input
                    value={hexDraft}
                    onChange={(e) => setHexDraft(e.target.value)}
                    onBlur={(e) => setFromHex(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded text-[11px] font-mono text-gray-200 px-1.5 py-1 uppercase"
                    spellCheck={false}
                />
                <button onClick={doCopy} title="Copy hex" className="w-6 h-6 shrink-0 grid place-items-center rounded border border-white/10 hover:bg-white/10 text-gray-300 text-[10px]">
                    {copied ? '✓' : '⧉'}
                </button>
                <button onClick={doEyedrop} title={eyedropError ? 'Eyedropper unsupported' : 'Pick from screen'} className={`w-6 h-6 shrink-0 grid place-items-center rounded border hover:bg-white/10 text-[11px] ${eyedropError ? 'border-amber-500/60 text-amber-400' : 'border-white/10 text-gray-300'}`}>
                    ⦿
                </button>
            </div>

            {/* One collapsible header reveals BOTH the sliders and the swatch rows. */}
            <div className="flex flex-col gap-1 pt-0.5 border-t border-white/5">
                <button
                    onClick={toggleDetails}
                    className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-gray-500 hover:text-gray-300 font-bold select-none"
                >
                    <span className="inline-block w-2 text-center">{detailsOpen ? '▾' : '▸'}</span>
                    Channels &amp; swatches
                </button>

                {detailsOpen && (
                    <div className="flex flex-col gap-1">
                        <GradientSlider label="R" value={rgb.r} min={0} max={255} step={1} trackBg={`linear-gradient(to right, ${rgbToHex(0, rgb.g, rgb.b)}, ${rgbToHex(255, rgb.g, rgb.b)})`}
                            onChange={(r) => rgbEdit({ r })} onStart={handleSliderStart} onEnd={handleSliderEnd} />
                        <GradientSlider label="G" value={rgb.g} min={0} max={255} step={1} trackBg={`linear-gradient(to right, ${rgbToHex(rgb.r, 0, rgb.b)}, ${rgbToHex(rgb.r, 255, rgb.b)})`}
                            onChange={(g) => rgbEdit({ g })} onStart={handleSliderStart} onEnd={handleSliderEnd} />
                        <GradientSlider label="B" value={rgb.b} min={0} max={255} step={1} trackBg={`linear-gradient(to right, ${rgbToHex(rgb.r, rgb.g, 0)}, ${rgbToHex(rgb.r, rgb.g, 255)})`}
                            onChange={(b) => rgbEdit({ b })} onStart={handleSliderStart} onEnd={handleSliderEnd} />
                        <div className="h-px bg-white/5 my-0.5" />
                        <GradientSlider label="H" value={hsb.h} min={0} max={360} step={1} trackBg="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
                            onChange={(h) => emit(clampHsb(h, hsb.s, hsb.v))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
                        <GradientSlider label="S" value={hsb.s} min={0} max={100} step={1} trackBg={`linear-gradient(to right, ${hsbToHex({ h: hsb.h, s: 0, v: hsb.v })}, ${hsbToHex({ h: hsb.h, s: 100, v: hsb.v })})`}
                            onChange={(s) => emit(clampHsb(hsb.h, s, hsb.v))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
                        <GradientSlider label="B" value={hsb.v} min={0} max={100} step={1} trackBg={`linear-gradient(to right, #000, ${hsbToHex({ h: hsb.h, s: hsb.s, v: 100 })})`}
                            onChange={(v) => emit(clampHsb(hsb.h, hsb.s, v))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
                        {alphaEnabled && (
                            <GradientSlider label="A" value={a} min={0} max={100} step={1}
                                trackBg={`linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgb(${rgb.r},${rgb.g},${rgb.b}))`}
                                onChange={(v) => onAlphaChange!(v)} onStart={handleSliderStart} onEnd={handleSliderEnd} />
                        )}

                        <div className="h-px bg-white/10 my-1" />

                        <SwatchRow label="Analog" colors={harmonies?.analogous ?? []} onPick={(c) => setFromHex(c)} current={hex} />
                        <SwatchRow label="Mono" colors={harmonies?.monochromatic ?? []} onPick={(c) => setFromHex(c)} current={hex} />
                        <SwatchRow label="Comp" colors={harmonies?.complementary ?? []} onPick={(c) => setFromHex(c)} current={hex} />
                        <SwatchRow label="Split" colors={harmonies?.split ?? []} onPick={(c) => setFromHex(c)} current={hex} />
                        <div className="h-px bg-white/5 my-0.5" />
                        <SwatchRow label="Recent" colors={recents} onPick={(c) => setFromHex(c)} current={hex} />
                        <SwatchRow label="Palette" colors={palette} onPick={(c) => setFromHex(c)} current={hex} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmbeddedColorPicker;
