
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
    harmonyHandles,
    HARMONY_COUNT,
    HARMONY_ANGLE,
    kelvinToHex,
    applyTint,
    type ColorHarmony,
    type HsvHandle,
} from '../utils/colorUtils';
import { ColorWheel } from './ColorWheel';
import { Dropdown } from './Dropdown';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import { useInteractionDrag } from '../engine/hooks/useInteractionDrag';
import { INTERACTION_SOURCES } from '../engine-gmt/interaction/interactionSources';
import { collectHelpIds } from '../utils/helpUtils';
import { useClipboardCopy } from '../hooks/useClipboardCopy';
import { safeLocalGet, safeLocalSet } from '../store/safeLocalStorage';
import { usePrecisionTrackDrag, precisionMultiplier } from './inputs/usePrecisionTrackDrag';
import { ChevronDown } from './Icons';
import { useInputSkin } from './inputs/skin';
import { setColorDrag } from './gradient/colorDrag';
import Slider from './Slider';

// ─────────────────────────────────────────────────────────────────────────────
// Rich colour picker (W10): 2D saturation×brightness field + hue strip, RGB+HSB
// sliders, optional alpha, hex input/copy/eyedropper, and harmony / recents /
// palette swatch rows. Engine-shared & CONTROLLED — mounted by AutoFeaturePanel
// (every colour DDFS param), AdvancedGradientEditor, DrawingPanel, the lighting
// panels, and CompositionOverlayControls. It is THE colour picker — the legacy
// SmallColorPicker swatch+portal wrapper was retired 2026-07-10 (the compact
// MINI default covers dense docks; lists expand it in-place instead of
// portalling). All colour maths come from utils/colorUtils (P0a interface f);
// this file adds NO conversions of its own.
//
// Back-compat: `onColorChange` always emits `#RRGGBB` (never 8-digit — the stop
// renderer's hexToRgb only matches 6 digits). Alpha is opt-in via the optional
// `alpha`/`onAlphaChange` props; absent them the alpha control is hidden.
//
// Feel: sliders use the SHARED GMT precision-drag (usePrecisionTrackDrag — Shift ×10
// coarse, Alt ×0.1 fine), and every 2D field / hue strip honours the same modifiers.
// Space: in the narrow dock the picker DEFAULTS to a compact MINI state — the swatch/hex
// line plus a 2D Hue×Lightness pad (one control to pick any colour). A chevron on the hex
// line expands to the NORMAL pads (the Saturation×Value field + vertical hue strip); the
// RGB/HSB channels + swatch rows then sit behind a FURTHER sub-collapse. Both collapse
// states are persisted. Wide layouts (≥400px, e.g. the gradient Stops stage) skip the
// collapses and show everything in two/three columns.
// Theming: all chrome uses scheme tokens (bg-surface-*, text-fg-*, border-line/*) so it
// reads cleanly in every colour scheme; only the colour-space gradients painted into the
// canvases are literal (they ARE colours, not UI).
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
    /**
     * A host editing MORE THAN ONE thing at once (the gradient editor with several knots
     * selected) passes this. Then a CHANNEL slider stops meaning "make everything this colour"
     * and starts meaning "move this channel by this much on each of them", which is what a
     * multi-selection is for: drop everyone's red a little, lift everyone's value, without
     * flattening the differences that made you select them (owner, 2026-09-08).
     * Setting a colour outright — the hex, the spectrum, the wheel, a swatch — still applies
     * to all of them, because that is unambiguous.
     */
    onChannelAdjust?: (channel: 'r' | 'g' | 'b' | 'h' | 's' | 'v', delta: number) => void;
    /** The controls for the KNOT being edited (position, bias, interpolation), supplied by the
     *  host. Rendered as the 'stop' mode, first in the row — the owner asked for it on the left
     *  and on a switch, in place of the old collapsing side column. */
    stopBlock?: React.ReactNode;
}

// --- shared, capped, persisted recents (MRU) ---
const RECENTS_KEY = 'gmt.colorpicker.recents';
const RECENTS_CAP = 16;

const loadRecents = (): string[] => {
    try {
        const raw = safeLocalGet(RECENTS_KEY);
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
    safeLocalSet(RECENTS_KEY, JSON.stringify(recentsCache));
    recentsListeners.forEach((fn) => fn(recentsCache));
};

// --- persisted collapse state (narrow dock only) ---
// `details` = expand from the MINI Hue×Lightness pad to the full Saturation×Value
// field + hue strip. `channels` = the further sub-collapse for the RGB/HSB sliders +
// swatch rows once expanded.
const DETAILS_KEY = 'gmt.colorpicker.details';
const loadDetailsOpen = (): boolean => safeLocalGet(DETAILS_KEY) === '1';
const saveDetailsOpen = (open: boolean) => safeLocalSet(DETAILS_KEY, open ? '1' : '0');
const CHANNELS_KEY = 'gmt.colorpicker.channels';
const loadChannelsOpen = (): boolean => safeLocalGet(CHANNELS_KEY) === '1';
const saveChannelsOpen = (open: boolean) => safeLocalSet(CHANNELS_KEY, open ? '1' : '0');

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

// ── the v2 dialect (Phase E) ───────────────────────────────────────────────────────────
// The picker is shared with app-gmt, so its LOOK follows the input skin the host provides
// (components/inputs/skin.tsx — the same context the sliders read): 'default' is the studio's
// picker, unchanged; 'soft' is Gradient Explorer v2's language — large rounding on every
// gradient and swatch (10 px bars), one quiet 12 px line of text instead of 9 px uppercase
// bold, no box of its own (the tray is the surface), and mono type on the hex alone.

// Radii here are deliberately MODEST. The shell's large rounding is the GRADIENT language —
// the hero ramp, the palette bars, the wall's tiles — and a picker is made of controls, not
// gradients (owner, 2026-09-08: "the round edges are supposed to be for gradients"). So
// nothing here becomes a pill: a track or a pad takes 6 px, a solid colour chip 4 px, and a
// pressable keeps the shell's 8 px.
/** Pads, strips and slider tracks. */
const CTRL_R = 'rounded-md';
/** Solid colour chips (harmony / recent / palette). */
const CHIP_R = 'rounded';
/** Spectrum and Wheel are the same size: they occupy one slot and toggle (owner). */
const SURFACE_PX = 150;

// ── selection MODES (soft dialect) ─────────────────────────────────────────────────────
// The reference chooser's real cleverness is not any one control but that you CHOOSE which
// controls are on: a toolbar of toggles under the swatch, several at once, and the
// combination is remembered for next time (owner, 2026-09-08 — "the default is the regular
// square picker … its cleverness is its configurability"). So the field is on by default and
// the wheel is one option among several, not a replacement for anything.
export type PickerMode = 'stop' | 'spectrum' | 'wheel' | 'harmony' | 'channels' | 'kelvin' | 'swatches';
/** Spectrum and Wheel are two views of the same job, so they TOGGLE rather than stack. */
const SURFACES: PickerMode[] = ['spectrum', 'wheel'];
const MODES_KEY = 'gmt.colorpicker.modes';
/** The owner's own working set, taken from their session (2026-09-08). */
const MODE_DEFAULT: PickerMode[] = ['stop', 'spectrum', 'channels', 'swatches'];
/** Stored sets from the first cut named this mode 'field'. */
const migrateModes = (v: string[]): PickerMode[] => {
    const named = v.map((m) => (m === 'field' ? 'spectrum' : m)) as PickerMode[];
    // A stored set from before Spectrum and Wheel became one slot can hold both: keep the first.
    let surfaceSeen = false;
    return named.filter((m) => {
        if (!SURFACES.includes(m)) return true;
        if (surfaceSeen) return false;
        surfaceSeen = true;
        return true;
    });
};

const ModeGlyph: React.FC<{ mode: PickerMode }> = ({ mode }) => {
    const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (mode) {
        case 'spectrum':
            return <svg viewBox="0 0 16 16" width="14" height="14" {...p}><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><path d="M2.5 10.5 13.5 4" opacity=".5" /></svg>;
        case 'stop':
            return <svg viewBox="0 0 16 16" width="14" height="14" {...p}><path d="M2.5 11.5h11" /><path d="M8 11.5V6" /><path d="M5.4 6h5.2l-2.6-3.4z" fill="currentColor" /></svg>;
        case 'harmony':
            return <svg viewBox="0 0 16 16" width="14" height="14" {...p}><circle cx="8" cy="8" r="5.5" opacity=".45" /><circle cx="8" cy="2.5" r="1.6" /><circle cx="12.8" cy="10.8" r="1.6" /><circle cx="3.2" cy="10.8" r="1.6" /></svg>;
        case 'wheel':
            return <svg viewBox="0 0 16 16" width="14" height="14" {...p}><circle cx="8" cy="8" r="5.5" /><circle cx="10.4" cy="5.6" r="1.4" /></svg>;
        case 'channels':
            return <svg viewBox="0 0 16 16" width="14" height="14" {...p}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>;
        case 'kelvin':
            return <svg viewBox="0 0 16 16" width="14" height="14" {...p}><path d="M6.5 9.2V3.6a1.5 1.5 0 0 1 3 0v5.6a3 3 0 1 1-3 0z" /></svg>;
        case 'swatches':
        default:
            return <svg viewBox="0 0 16 16" width="14" height="14" {...p}><rect x="2.5" y="2.5" width="5" height="5" rx="1.5" /><rect x="8.5" y="2.5" width="5" height="5" rx="1.5" /><rect x="2.5" y="8.5" width="5" height="5" rx="1.5" /><rect x="8.5" y="8.5" width="5" height="5" rx="1.5" /></svg>;
    }
};

const MODE_TITLE: Record<PickerMode, string> = {
    stop: 'Stop — this knot\u2019s position, bias and interpolation',
    spectrum: 'Spectrum — saturation and brightness for one hue',
    wheel: 'Wheel — hue and saturation on a disc',
    harmony: 'Harmony — related colours, and this gradient\u2019s own',
    channels: 'Channels — RGB and HSV sliders',
    kelvin: 'Kelvin — colour temperature, and its green-to-magenta tint',
    swatches: 'Recent colours — the ones you have used',
};

// A small clickable swatch strip used by harmony / recents / palette rows.
const SwatchRow: React.FC<{
    label: string;
    colors: string[];
    onPick: (hex: string) => void;
    /** Takes precedence over `onPick`: the row's colours ARE a set with identity (the wheel's
     *  handles), so picking one selects that member rather than re-deriving from its colour. */
    onPickIndex?: (index: number) => void;
    current?: string;
}> = ({
    label,
    colors,
    onPick,
    onPickIndex,
    current,
}) => {
    const soft = useInputSkin() === 'soft';
    return (
    <div className={`flex items-center ${soft ? 'gap-2' : 'gap-1.5'}`}>
        <div className={soft
            ? 'w-[52px] shrink-0 text-[12px] text-fg-muted select-none'
            : 'w-[52px] shrink-0 text-[9px] uppercase tracking-wide text-fg-dim font-bold'}>{label}</div>
        <div className={`flex-1 flex overflow-hidden ${soft ? 'gap-1' : 'gap-[2px]'}`}>
            {colors.length === 0 ? (
                <div className={soft ? 'text-[12px] text-fg-faint py-[3px]' : 'text-[9px] text-fg-faint italic py-[3px]'}>—</div>
            ) : (
                colors.map((c, i) => (
                    <button
                        key={`${c}-${i}`}
                        onClick={() => (onPickIndex ? onPickIndex(i) : onPick(c))}
                        // drag a colour onto the ramp: over a knot it recolours it, over bare
                        // track it inserts one (components/gradient/colorDrag.ts)
                        draggable
                        onDragStart={(e) => setColorDrag(e.dataTransfer, c)}
                        className={soft
                            ? `h-5 flex-1 min-w-0 ${CHIP_R} border transition-transform hover:scale-105 hover:z-10 ${
                                current && c.toUpperCase() === current.toUpperCase() ? 'border-fg' : 'border-line/20'
                            }`
                            : `h-4 flex-1 min-w-0 rounded-[2px] border transition-transform hover:scale-110 hover:z-10 ${
                                current && c.toUpperCase() === current.toUpperCase() ? 'border-fg' : 'border-line/10'
                            }`}
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))
            )}
        </div>
    </div>
    );
};

/**
 * The studio's compact channel slider: a custom gradient track with a bar thumb, drawn small
 * enough for a 26 px dock row. Uses the SHARED usePrecisionTrackDrag so the feel matches.
 *
 * @deprecated for the v2 dialect. `ScalarInput` can paint a gradient track now
 * (`trackBackground`), so the soft skin uses the REAL `Slider` instead — which brings
 * right-click reset, the default-value tick, the live indicator, help ids and a typed value
 * that this one never had (owner, 2026-09-08: "this component is missing a lot of
 * functionality that the real slider component has"). Kept for `full` chrome, whose rows are
 * half the height a full Slider needs.
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
    /** Where the value's tick sits, and what a right-click resets to (soft dialect). */
    defaultValue?: number;
}> = ({ label, value, min, max, step, onChange, onStart, onEnd, trackBg, defaultValue }) => {
    const track = usePrecisionTrackDrag({ min, max, step, onChange, onDragStart: onStart, onDragEnd: onEnd });
    const pct = ((value - min) / (max - min)) * 100;
    const soft = useInputSkin() === 'soft';
    // The v2 dialect uses the app's OWN slider, so the picker's channels behave like every
    // other slider in the shell (and match their thickness).
    if (soft) {
        return (
            <Slider
                dense
                label={label}
                value={value}
                min={min}
                max={max}
                step={step}
                defaultValue={defaultValue}
                trackBackground={trackBg}
                onChange={onChange}
                onDragStart={onStart}
                onDragEnd={onEnd}
            />
        );
    }
    return (
        // One rhythm for the whole picker: a 20 px BAND on an 8 px gap. Matching the pitch was
        // not enough — a 10 px track inside a 20 px row left 18 px of nothing between bars
        // against 8 px between the swatch chips, and that is what read as loose (measured with
        // the owner, 2026-09-08). The band itself fills the row, so every coloured element in
        // the picker is 20 px with 8 px of air.
        <div className={`flex items-center ${soft ? 'gap-2 h-4' : 'gap-1.5'}`}>
            <div className={soft
                ? 'w-3 shrink-0 text-[12px] text-fg-muted text-center select-none'
                : 'w-3 shrink-0 text-[9px] font-bold text-fg-muted text-center select-none'}>{label}</div>
            <div
                className={`relative flex-1 cursor-ew-resize touch-none overflow-hidden ${soft ? `h-4 ${CTRL_R}` : 'h-3.5 rounded-sm'}`}
                style={{ background: trackBg }}
                onPointerDown={track.onPointerDown}
                onPointerMove={track.onPointerMove}
                onPointerUp={track.onPointerUp}
                onPointerCancel={track.onPointerUp}
                onLostPointerCapture={track.onPointerUp}
            >
                {/* The marker. The TRACK carries the meaning here, so unlike the thumbless v2
                    slider the value needs a mark: a hairline that survives any hue under it. */}
                <div
                    className={soft
                        ? 'absolute top-0 bottom-0 w-[2px] -ml-px z-10 bg-fg rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.45)] pointer-events-none'
                        : 'absolute top-0 bottom-0 w-3.5 -ml-[7px] z-10 border-x-2 border-line/80 bg-line/10 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] pointer-events-none'}
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
                // Native number spinners are browser chrome — they squish this 36px field
                // and ignore the colour scheme. Hide them (the track drag already steps the
                // value, with Shift ×10 / Alt ×0.1) and use a themed focus border instead.
                // A text entry stays wherever a user expects one (owner): in the soft dialect
                // it is a bare number that takes focus, not a boxed field.
                className={`shrink-0 text-right tabular-nums outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 ${
                    soft
                        ? 'w-9 bg-transparent text-[12px] text-fg-muted focus:text-fg'
                        : 'w-9 bg-surface-sunken border border-line/10 rounded text-[9px] text-fg-tertiary px-1 py-[1px] focus:border-accent-500/50'
                }`}
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
    stopBlock,
    onChannelAdjust,
}) => {
    const [hsb, setHsb] = useState<HSB>(() => safeHsb(color));
    const [recents, setRecents] = useState<string[]>(recentsCache);
    // The host's input skin decides the dialect (see CTRL_R / CHIP_R above).
    const soft = useInputSkin() === 'soft';
    // ── the colour wheel (soft dialect) ────────────────────────────────────────────────
    // The wheel replaces the saturation/value field AND the four static harmony rows: one
    // 2D control does hue + saturation with value on the strip beside it, and its extra
    // HANDLES are the harmony, live and draggable, rather than a printed list. Index 0 is
    // always the colour being edited (utils/colorUtils harmonyHandles).
    const [modes, setModes] = useState<PickerMode[]>(() => {
        const raw = safeLocalGet(MODES_KEY);
        if (!raw) return MODE_DEFAULT;
        try {
            const v = JSON.parse(raw);
            return Array.isArray(v) && v.length ? migrateModes(v) : MODE_DEFAULT;
        } catch { return MODE_DEFAULT; }
    });
    const on = useCallback((m: PickerMode) => modes.includes(m), [modes]);
    const toggleMode = useCallback((m: PickerMode, keepOthers = false) => {
        setModes((prev) => {
            // a surface REPLACES the other surface, unless shift says keep both
            const off = prev.filter((x) => x !== m && !(!keepOthers && SURFACES.includes(m) && SURFACES.includes(x)));
            const next = prev.includes(m) ? (prev.length > 1 ? off : prev) : [...off, m];
            safeLocalSet(MODES_KEY, JSON.stringify(next));
            return next;
        });
    }, []);
    const [kelvin, setKelvin] = useState(6500);
    /** Green (−) to magenta (+): the axis a temperature cannot say on its own. */
    const [tint, setTint] = useState(0);
    const [harmony, setHarmony] = useState<ColorHarmony>('analogous');
    const [harmonyCount, setHarmonyCount] = useState(5);
    /** The angle a harmony spreads by, where it has one (see HARMONY_ANGLE). */
    const [harmonyAngle, setHarmonyAngle] = useState(30);
    // The handles are STATE, not a derivation. Deriving them from the live colour meant that
    // merely ACTIVATING another handle re-derived the whole set around it, so a click walked
    // every other colour (owner, 2026-09-08: "it must not recalculate all the colors to the
    // new point"). Now: changing the rule, the count, or the active handle's own colour
    // recomputes the followers; selecting a different handle only changes which one is live.
    const [handles, setHandles] = useState<HsvHandle[]>([]);
    const [activeHandle, setActiveHandle] = useState(0);
    /** Set when a colour change came from ACTIVATING a handle — that must not recompute. */
    const skipHandleSync = useRef(false);
    const [hexDraft, setHexDraft] = useState(color.toUpperCase());
    const clip = useClipboardCopy(1000);
    const copied = clip.state === 'copied';
    const [eyedropError, setEyedropError] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState<boolean>(() => loadDetailsOpen());
    const [channelsOpen, setChannelsOpen] = useState<boolean>(() => loadChannelsOpen());

    const lastOutputHex = useRef(color.toUpperCase());
    const rootRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLCanvasElement | null>(null);
    const hueRef = useRef<HTMLCanvasElement | null>(null);
    const hlPadRef = useRef<HTMLCanvasElement | null>(null);
    // A canvas that REMOUNTS comes back with a blank backing store, and a draw effect keyed
    // on colour alone will not repaint it: the colour did not change. That used to be true
    // only when the layout branch changed, so the effects listed `layout, minified` — then
    // the mode toggles arrived and turning Spectrum off and on again left an empty pad until
    // the next colour edit (owner, 2026-09-08). These callback refs bump a generation on
    // every mount instead, so ANY future branch that remounts a canvas repaints it for free.
    // Stable identities (deps []), or React would detach on every render and loop.
    const [canvasGen, setCanvasGen] = useState(0);
    const bumpCanvas = useCallback(() => setCanvasGen((g) => g + 1), []);
    const setFieldCanvas = useCallback((el: HTMLCanvasElement | null) => { fieldRef.current = el; if (el) bumpCanvas(); }, [bumpCanvas]);
    const setHueCanvas = useCallback((el: HTMLCanvasElement | null) => { hueRef.current = el; if (el) bumpCanvas(); }, [bumpCanvas]);
    const setHlPadCanvas = useCallback((el: HTMLCanvasElement | null) => { hlPadRef.current = el; if (el) bumpCanvas(); }, [bumpCanvas]);

    // Container-responsive layout (NOT viewport — the picker is mounted both in a
    // ~260px dock and, since the Stops mode, on a very wide centre stage). Measure
    // our own width and reflow the groups (colour pads / channels / swatches):
    //   wide  → field+hue | channels | swatches  (3 columns, everything shown)
    //   mid   → field+hue on top, then channels | swatches  (2 columns below)
    //   narrow→ minified Hue×Lightness pad by default; chevron expands to the full
    //           field + the further channels/swatches sub-collapse. Defaults to narrow
    //           until measured (no layout flash for the common dock case).
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
        ro.observe(el);
        setWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);
    const layout: 'cols' | 'rows' | 'stack' = width >= 600 ? 'cols' : width >= 400 ? 'rows' : 'stack';
    // Narrow dock (stack): default to a compact MINI state — the swatch/hex line plus a
    // 2D Hue×Lightness pad (picks any colour in one control). The chevron expands to the
    // full Saturation×Value field + vertical hue strip; channels + swatches sit behind a
    // further sub-collapse. Wide layouts skip both collapses and show everything.
    const minified = layout === 'stack' && !detailsOpen;
    const showChevron = layout === 'stack';
    // Swatch rows (harmonies/recents/palette) are visible in the wide layouts, or in the
    // stack once expanded AND the channels sub-section is open.
    const swatchesVisible = layout !== 'stack' || (detailsOpen && channelsOpen);

    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();
    // Single shared gesture for every field/strip/slider drag — anchored to the param
    // transaction boundary so a colour edit is ONE undo step (ADR-0061 P3b).
    const colorSession = useInteractionDrag(INTERACTION_SOURCES.slider);

    // Tracks whether THIS picker currently holds an open param transaction. Every
    // colour edit opens/closes the shared param transaction through these two
    // wrappers so the unmount safety-net below can tell "I left a transaction open"
    // apart from "some OTHER gesture's transaction is open". Without this the net
    // blindly closed whatever was open — e.g. a light-drag opens a transaction and
    // then dismisses the hover popup that hosts this picker, and the picker's
    // unmount would nuke the drag's transaction before it recorded anything.
    const paramTxOpenRef = useRef(false);
    const beginColorTx = useCallback(() => { handleInteractionStart('param'); paramTxOpenRef.current = true; }, [handleInteractionStart]);
    const endColorTx = useCallback(() => { paramTxOpenRef.current = false; handleInteractionEnd(); }, [handleInteractionEnd]);

    const alphaEnabled = typeof alpha === 'number' && typeof onAlphaChange === 'function';
    const a = alphaEnabled ? alpha! : 100;

    const toggleDetails = () => setDetailsOpen((o) => { saveDetailsOpen(!o); return !o; });
    const toggleChannels = () => setChannelsOpen((o) => { saveChannelsOpen(!o); return !o; });

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
    // focus steal) close the param transaction IT opened. Gated on paramTxOpenRef so
    // it only ends a transaction this picker actually owns — never one belonging to
    // another in-flight gesture that happened to dismiss the picker.
    useEffect(() => () => { if (paramTxOpenRef.current) endColorTx(); }, [endColorTx]);

    const hex = useMemo(() => hsbToHex(hsb), [hsb]);
    /** The live HSB, readable from callbacks that must not re-create on every colour change. */
    const hsbRef = useRef(hsb);
    hsbRef.current = hsb;
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
        beginColorTx();
        commit(rgbToHsb(rgbV));
        endColorTx();
    }, [commit, hex, beginColorTx, endColorTx]);

    // RGB-slider edit: convert back to HSB but preserve the hue (and saturation when
    // fully dark) so dragging through a greyscale value doesn't reset the field handle.
    const rgbEdit = useCallback((patch: Partial<{ r: number; g: number; b: number }>) => {
        const next = rgbToHsb({ ...rgb, ...patch });
        if (next.s === 0) next.h = hsb.h;
        if (next.v === 0) { next.h = hsb.h; next.s = hsb.s; }
        emit(next);
    }, [rgb, hsb.h, hsb.s, emit]);

    // The colour a gesture STARTED from. While one is in flight the swatch splits and shows
    // it beside the live colour, so you can see what you are changing away from (the owner's
    // reference spec: "This color swatch is split when the color handle or slider is moved").
    const [gestureFrom, setGestureFrom] = useState<string | null>(null);
    const handleSliderStart = useCallback(() => {
        setGestureFrom(hsbToHex(hsbRef.current));
        beginColorTx();
        colorSession.onPointerDown();
    }, [colorSession, beginColorTx]);
    const handleSliderEnd = useCallback(() => {
        setGestureFrom(null);
        colorSession.onPointerUp();
        endColorTx();
        pushRecent(lastOutputHex.current);
    }, [colorSession, endColorTx]);

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
        // `layout`/`minified` are deps: switching layout (stack→cols once measured) or
        // `canvasGen` is the remount signal (see setFieldCanvas): whenever this canvas is
        // replaced — a layout branch, a mode toggle — the effect re-runs and repaints it.
    }, [hsb.h, canvasGen]);

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
        // `layout`/`minified` deps so the strip repaints after a remount (see the field
        // effect above) — the gradient itself is static.
    }, [canvasGen]);

    // --- mini Hue×Lightness pad (minified view) ---
    // The classic HSL "spectrum": X = hue, Y = lightness — WHITE on top → full-saturation
    // hue in the middle band → BLACK at the bottom. Packs the most colour into one 2D pad
    // (every hue, plus tints above and shades below) far better than a hue×value pad,
    // which has no white. Painted as a pure-hue rainbow with a white tint over the top
    // half and a black shade over the bottom half — no HSL maths in colorUtils needed.
    useEffect(() => {
        const cv = hlPadRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const { width: w, height: h } = cv;
        const hue = ctx.createLinearGradient(0, 0, w, 0);
        for (let i = 0; i <= 6; i++) hue.addColorStop(i / 6, hsbToHex({ h: (i / 6) * 360, s: 100, v: 100 }));
        ctx.fillStyle = hue;
        ctx.fillRect(0, 0, w, h);
        const tint = ctx.createLinearGradient(0, 0, 0, h);    // white over the top half
        tint.addColorStop(0, 'rgba(255,255,255,1)');
        tint.addColorStop(0.5, 'rgba(255,255,255,0)');
        tint.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, w, h);
        const shade = ctx.createLinearGradient(0, 0, 0, h);   // black over the bottom half
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(0.5, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);
    }, [minified, layout]);

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
        endColorTx();
        pushRecent(lastOutputHex.current);
    };

    const fieldDrag = useRef({ active: false, x: 0, y: 0, s: 0, v: 0, shift: false, alt: false });
    const beginField = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const s = sat01(e, r);
        const v = bri01(e, r);
        e.currentTarget.setPointerCapture(e.pointerId);
        beginColorTx();
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
        beginColorTx();
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

    // Mini HL pad: 2D drag — X = hue, Y = HSL lightness (1 = white top, 0.5 = pure hue,
    // 0 = black bottom). `hlColor` maps (hue, lightness) onto the picker's HSB state at
    // full HSL saturation, keeping the dragged hue when l hits the white/black ends (so
    // it isn't lost the way rgb→hsb would). Same absolute / precision feel as the field.
    const hlColor = (hh: number, l: number): HSB => {
        const v = l + Math.min(l, 1 - l);
        const s = v === 0 ? 0 : 2 * (1 - l / v);
        return clampHsb(hh, s * 100, v * 100);
    };
    const hlPadDrag = useRef({ active: false, x: 0, y: 0, h: 0, l: 0, shift: false, alt: false });
    const hueX = (e: React.PointerEvent<HTMLCanvasElement>, r: DOMRect) => Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 360;
    const lightY = (e: React.PointerEvent<HTMLCanvasElement>, r: DOMRect) => 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const beginHLPad = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const hh = hueX(e, r);
        const l = lightY(e, r);
        e.currentTarget.setPointerCapture(e.pointerId);
        beginColorTx();
        colorSession.onPointerDown();
        emit(hlColor(hh, l));
        hlPadDrag.current = { active: true, x: e.clientX, y: e.clientY, h: hh, l, shift: e.shiftKey, alt: e.altKey };
    };
    const moveHLPad = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const d = hlPadDrag.current;
        if (!d.active) return;
        const r = e.currentTarget.getBoundingClientRect();
        const m = precisionMultiplier(e);
        let hh: number, l: number;
        if (m === 1) {
            hh = hueX(e, r); l = lightY(e, r);
            d.h = hh; d.l = l; d.x = e.clientX; d.y = e.clientY; d.shift = false; d.alt = false;
        } else {
            const baseH = 360 / r.width;
            const baseL = 1 / r.height;
            if (d.shift !== e.shiftKey || d.alt !== e.altKey) {
                const om = precisionMultiplier({ shiftKey: d.shift, altKey: d.alt });
                d.h = Math.max(0, Math.min(360, d.h + (e.clientX - d.x) * baseH * om));
                d.l = Math.max(0, Math.min(1, d.l - (e.clientY - d.y) * baseL * om));
                d.x = e.clientX; d.y = e.clientY; d.shift = e.shiftKey; d.alt = e.altKey;
            }
            hh = Math.max(0, Math.min(360, d.h + (e.clientX - d.x) * baseH * m));
            l = Math.max(0, Math.min(1, d.l - (e.clientY - d.y) * baseL * m));
        }
        emit(hlColor(hh, l));
    };
    const endHLPad = endDrag(hlPadDrag);

    // Keep the set in step with the colour: the ACTIVE handle is always the live colour, and
    // its followers are recomputed whenever that colour moves under the rule. Editing anywhere
    // (a channel slider, the hex, the eyedropper) therefore moves the harmony with it.
    useEffect(() => {
        const base: HsvHandle = { h: hsb.h, s: hsb.s / 100, v: hsb.v };
        if (skipHandleSync.current) { skipHandleSync.current = false; return; }
        setHandles((prev) => {
            if (!prev.length) return harmonyHandles(base, harmony, harmonyCount, harmonyAngle);
            const cur = prev[Math.min(activeHandle, prev.length - 1)];
            const same = cur && Math.abs(cur.h - base.h) < 1e-6 && Math.abs(cur.s - base.s) < 1e-6 && Math.abs(cur.v - base.v) < 1e-6;
            if (same && prev.length === (harmony === 'free' ? prev.length : harmonyHandles(base, harmony, harmonyCount, harmonyAngle).length)) return prev;
            if (harmony === 'free') return prev.map((f, i) => (i === activeHandle ? base : f));
            return harmonyHandles(base, harmony, harmonyCount, harmonyAngle);
        });
        if (harmony !== 'free') setActiveHandle(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hsb.h, hsb.s, hsb.v, harmony, harmonyCount, harmonyAngle]);

    const wheelHandles = handles.length ? handles : [{ h: hsb.h, s: hsb.s / 100, v: hsb.v }];
    const wheelActive = Math.min(activeHandle, wheelHandles.length - 1);

    // through `emit`, like every other control here: it also carries the hex draft and the
    // echo guard, which a hand-rolled setHsb would silently drop
    const wheelMove = useCallback((h: number, s: number) => emit(clampHsb(h, s * 100, hsb.v)), [emit, hsb.v]);
    const wheelValue = useCallback((v: number) => emit(clampHsb(hsb.h, hsb.s, v)), [emit, hsb.h, hsb.s]);
    /** Selecting a handle makes it the live colour and moves NOTHING else. */
    const wheelActivate = useCallback((i: number) => {
        const t = wheelHandles[i];
        if (!t) return;
        skipHandleSync.current = true;
        setActiveHandle(i);
        setFromHex(hsbToHex({ h: t.h, s: t.s * 100, v: t.v }));
    }, [wheelHandles, setFromHex]);
    /** Ctrl/Cmd + click adds a handle — free mode only (a harmony's set is its rule). */
    const wheelAdd = useCallback((h: number, s: number) => {
        if (harmony !== 'free') return;
        const next = [...wheelHandles.map((x) => ({ ...x })), { h, s, v: hsb.v }];
        skipHandleSync.current = true;
        setHandles(next);
        setActiveHandle(next.length - 1);
        setFromHex(hsbToHex({ h, s: s * 100, v: hsb.v }));
    }, [harmony, wheelHandles, hsb.v, setFromHex]);

    /** Free mode: drop the active handle (never the last one). */
    const wheelRemove = useCallback(() => {
        if (harmony !== 'free' || wheelHandles.length < 2) return;
        const rest = wheelHandles.filter((_, i) => i !== wheelActive).map((x) => ({ ...x }));
        const nextActive = Math.min(wheelActive, rest.length - 1);
        skipHandleSync.current = true;
        setHandles(rest);
        setActiveHandle(nextActive);
        const t = rest[nextActive];
        if (t) setFromHex(hsbToHex({ h: t.h, s: t.s * 100, v: t.v }));
    }, [harmony, wheelHandles, wheelActive, setFromHex]);

    const countRange = HARMONY_COUNT[harmony];
    const angleRange = HARMONY_ANGLE[harmony];

    /** One channel moved. With a multi-selection host the move is a DELTA it applies to each
     *  of its own things; otherwise it is just this colour's edit. */
    const channelEdit = useCallback((ch: 'r' | 'g' | 'b' | 'h' | 's' | 'v', next: number, current: number, own: () => void) => {
        if (onChannelAdjust) {
            const delta = next - current;
            if (delta) onChannelAdjust(ch, delta);
            return;
        }
        own();
    }, [onChannelAdjust]);

    const doCopy = () => { void clip.copy(hex); };
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
    // drag tick when the section is hidden — the minified / sub-collapsed dock default).
    const harmonies = useMemo(() => (swatchesVisible ? {
        analogous: analogous(hex, 5, 30),
        monochromatic: monochromatic(hex, 5),
        complementary: complementary(hex),
        split: splitComplementary(hex),
    } : null), [hex, swatchesVisible]);

    const handleContainerContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget as HTMLElement);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    // --- The responsive groups (laid out per `layout` below) ---------------------

    // Group 1a — the NORMAL pads: 2D saturation×value field + vertical hue strip (the
    // "SL pad + H strip"). Shown when expanded / in the wide layouts.
    const fieldBlock = (
        // Field + hue strip (shrinks on narrow/mobile; Shift/Alt = coarse/fine)
        <div className={`flex ${soft ? 'gap-2' : 'gap-1.5'}`} style={soft ? { width: SURFACE_PX + 8 + 16 } : undefined}>
            <div className="relative flex-1">
                <canvas
                    ref={setFieldCanvas}
                    width={208}
                    height={120}
                    className={`w-full cursor-crosshair touch-none ${soft ? `h-[${SURFACE_PX}px] ${CTRL_R}` : 'h-[76px] md:h-[86px] rounded'}`}
                    style={soft ? { height: SURFACE_PX } : undefined}
                    onPointerDown={beginField}
                    onPointerMove={moveField}
                    onPointerUp={endField}
                    onPointerCancel={endField}
                    onLostPointerCapture={endField}
                />
                {/* A NEUTRAL marker. `mix-blend-difference` inverts whatever is under it, so on a
                    warm field it turned cyan and on a cool one it turned red — it read as a
                    coloured thing rather than a pointer (owner, 2026-09-08). */}
                <div
                    className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white/85 shadow-[0_0_0_1px_rgba(0,0,0,.55)] pointer-events-none"
                    style={{ left: `${hsb.s}%`, top: `${100 - hsb.v}%` }}
                />
            </div>
            <div className="relative w-4 shrink-0">
                <canvas
                    ref={setHueCanvas}
                    width={16}
                    height={120}
                    className={`w-4 cursor-crosshair touch-none ${soft ? CTRL_R : 'h-[76px] md:h-[86px] rounded'}`}
                    style={soft ? { height: SURFACE_PX } : undefined}
                    onPointerDown={beginHue}
                    onPointerMove={moveHue}
                    onPointerUp={endHue}
                    onPointerCancel={endHue}
                    onLostPointerCapture={endHue}
                />
                <div
                    className="absolute left-0 w-full h-[3px] -mt-[1.5px] bg-line/90 rounded-full pointer-events-none shadow"
                    style={{ top: `${(hsb.h / 360) * 100}%` }}
                />
            </div>
        </div>
    );

    // Group 1c — the MINI Hue×Lightness pad (minified state): one compact 2D control to
    // pick any colour. X = hue, Y = HSL lightness (white top → pure hue → black bottom).
    // Marker Y uses the HSV→HSL lightness L = v·(1 − s/2) so it sits where the painted
    // pad shows the live colour. Half-height — it's a strip, not a full square.
    const padLightness = (hsb.v / 100) * (1 - (hsb.s / 100) / 2);
    const hlPad = (
        <div className="relative">
            <canvas
                ref={setHlPadCanvas}
                width={208}
                height={120}
                className={`w-full h-9 cursor-crosshair touch-none ${soft ? CTRL_R : "rounded"}`}
                onPointerDown={beginHLPad}
                onPointerMove={moveHLPad}
                onPointerUp={endHLPad}
                onPointerCancel={endHLPad}
                onLostPointerCapture={endHLPad}
            />
            <div
                className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white/85 shadow-[0_0_0_1px_rgba(0,0,0,.55)] pointer-events-none"
                style={{ left: `${(hsb.h / 360) * 100}%`, top: `${(1 - padLightness) * 100}%` }}
            />
        </div>
    );

    // Group 1b — the always-visible swatch/hex line: expand chevron (mini state only) ·
    // current-colour swatch · hex input · copy · eyedropper. Stays on top when minimized.
    const hexRow = (
        <div className="flex items-center gap-1.5">
            {showChevron && (
                <button
                    onClick={toggleDetails}
                    title={detailsOpen ? 'Collapse picker' : 'Expand picker'}
                    className="shrink-0 grid place-items-center text-fg-tertiary hover:text-fg transition-colors select-none -ml-0.5"
                >
                    <span className={`inline-flex transition-transform [&_svg]:w-[18px] [&_svg]:h-[18px] ${detailsOpen ? '' : '-rotate-90'}`}>
                        <ChevronDown />
                    </span>
                </button>
            )}
            <div
                className={`shrink-0 border overflow-hidden ${soft ? 'w-7 h-7 rounded-lg border-line/20' : 'w-6 h-6 rounded border-line/10'}`}
                style={gestureFrom
                    // mid-gesture: the new colour on the left, the one you started from on the right
                    ? { backgroundImage: `linear-gradient(to right, ${hex} 50%, ${gestureFrom} 50%)` }
                    : { backgroundColor: hex }}
                title={gestureFrom ? `${hex} \u2190 ${gestureFrom} (Esc to keep the original)` : hex}
            />
            <input
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                onBlur={(e) => setFromHex(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                // mono type on the hex ALONE (V5): it is a code, the rest of the picker is not
                className={`flex-1 min-w-0 font-mono uppercase outline-none ${
                    soft
                        ? 'h-7 bg-surface-viewport border border-line/20 rounded-lg text-[12px] text-fg px-2'
                        : 'bg-surface-sunken border border-line/10 rounded text-[11px] text-fg-secondary px-1.5 py-1'
                }`}
                spellCheck={false}
            />
            <button onClick={doCopy} title="Copy hex" className={`shrink-0 grid place-items-center border hover:bg-line/10 text-fg-tertiary ${soft ? 'w-7 h-7 rounded-lg border-line/20 text-[12px]' : 'w-6 h-6 rounded border-line/10 text-[10px]'}`}>
                {copied ? '✓' : '⧉'}
            </button>
            <button onClick={doEyedrop} title={eyedropError ? 'Eyedropper unsupported' : 'Pick from screen'} className={`shrink-0 grid place-items-center border hover:bg-line/10 ${soft ? 'w-7 h-7 rounded-lg text-[12px]' : 'w-6 h-6 rounded text-[11px]'} ${eyedropError ? 'border-amber-500/60 text-amber-400' : soft ? 'border-line/20 text-fg-tertiary' : 'border-line/10 text-fg-tertiary'}`}>
                ⦿
            </button>
        </div>
    );


    // Group 2 — channels: the RGB + HSB (+ alpha) gradient sliders.
    const channelsBlock = (
        <>
            <GradientSlider label="R" value={rgb.r} min={0} max={255} step={1} defaultValue={128} trackBg={`linear-gradient(to right, ${rgbToHex(0, rgb.g, rgb.b)}, ${rgbToHex(255, rgb.g, rgb.b)})`}
                onChange={(r) => channelEdit('r', r, rgb.r, () => rgbEdit({ r }))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
            <GradientSlider label="G" value={rgb.g} min={0} max={255} step={1} defaultValue={128} trackBg={`linear-gradient(to right, ${rgbToHex(rgb.r, 0, rgb.b)}, ${rgbToHex(rgb.r, 255, rgb.b)})`}
                onChange={(g) => channelEdit('g', g, rgb.g, () => rgbEdit({ g }))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
            <GradientSlider label="B" value={rgb.b} min={0} max={255} step={1} defaultValue={128} trackBg={`linear-gradient(to right, ${rgbToHex(rgb.r, rgb.g, 0)}, ${rgbToHex(rgb.r, rgb.g, 255)})`}
                onChange={(b) => channelEdit('b', b, rgb.b, () => rgbEdit({ b }))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
            {/* RGB and HSV are two ways of saying the same colour, so they read as two groups */}
            <div className={soft ? 'h-px bg-line/15' : 'h-px bg-line/5 my-0.5'} />
            <GradientSlider label="H" value={Math.round(hsb.h)} min={0} max={360} step={1} defaultValue={0} trackBg="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
                onChange={(h) => channelEdit('h', h, hsb.h, () => emit(clampHsb(h, hsb.s, hsb.v)))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
            <GradientSlider label="S" value={Math.round(hsb.s)} min={0} max={100} step={1} defaultValue={100} trackBg={`linear-gradient(to right, ${hsbToHex({ h: hsb.h, s: 0, v: hsb.v })}, ${hsbToHex({ h: hsb.h, s: 100, v: hsb.v })})`}
                onChange={(s) => channelEdit('s', s, hsb.s, () => emit(clampHsb(hsb.h, s, hsb.v)))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
            {/* The H/S/V numbers are ROUNDED for display: they come from a conversion, so the
                raw values carry a colour's worth of decimals (25.94594595) that no one wants to
                read. The drag still steps by 1 and the stored colour keeps its precision. */}
            {/* V, not B: the trio is HSV — hue, saturation, VALUE (owner, 2026-09-08). The
                store calls the same number `v` already; only the label was wrong. */}
            <GradientSlider label="V" value={Math.round(hsb.v)} min={0} max={100} step={1} defaultValue={100} trackBg={`linear-gradient(to right, #000, ${hsbToHex({ h: hsb.h, s: hsb.s, v: 100 })})`}
                onChange={(v) => channelEdit('v', v, hsb.v, () => emit(clampHsb(hsb.h, hsb.s, v)))} onStart={handleSliderStart} onEnd={handleSliderEnd} />
            {alphaEnabled && (
                <GradientSlider label="A" value={a} min={0} max={100} step={1}
                    trackBg={`linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgb(${rgb.r},${rgb.g},${rgb.b}))`}
                    onChange={(v) => onAlphaChange!(v)} onStart={handleSliderStart} onEnd={handleSliderEnd} />
            )}
        </>
    );

    // The mode toolbar — which controls are on. Sits at the end of the always-visible
    // swatch/hex line, so the line reads: what the colour IS, then what you may pick it with.
    // Spectrum and Wheel are ONE joined control — the shell's segmented-button language, the
    // same shape as Even / Perceptual / Stops — because they are two answers to one question.
    // Shift-click adds rather than replaces, for the rare "show me both"; either can still be
    // turned off entirely (owner, 2026-09-08). The independent switches sit beside it and wear
    // the same thin-bordered look when they are on.
    const modeButton = (m: PickerMode, joined?: 'l' | 'r') => (
        <button
            key={m}
            type="button"
            onClick={(e) => toggleMode(m, e.shiftKey)}
            title={`${MODE_TITLE[m]}${SURFACES.includes(m) ? ' \u00b7 shift-click to keep both' : ''}`}
            aria-pressed={on(m)}
            data-gx-picker-mode={m}
            data-on={on(m) ? '' : undefined}
            className={`h-7 grid place-items-center transition-colors ${
                joined ? 'px-2.5' : 'w-7 rounded-lg border'
            } ${joined === 'l' ? 'rounded-l-lg' : ''} ${joined === 'r' ? 'rounded-r-lg' : ''} ${
                on(m)
                    ? 'bg-accent-400/15 text-accent-300 border-accent-400/40'
                    : `text-fg-dim hover:text-fg hover:bg-line/10 ${joined ? '' : 'border-transparent'}`
            }`}
        >
            <ModeGlyph mode={m} />
        </button>
    );
    const modeBar = (
        <div className="flex items-center gap-1.5 shrink-0" data-gx-picker-modes>
            <div className="inline-flex rounded-lg border border-line/20 overflow-hidden" data-gx-picker-surfaces>
                {modeButton('spectrum', 'l')}
                {modeButton('wheel', 'r')}
            </div>
            <div className="flex items-center gap-0.5">
                {(['stop', 'harmony', 'channels', 'kelvin', 'swatches'] as PickerMode[]).map((m) => modeButton(m))}
            </div>
        </div>
    );

    // Recent colours have their own space on the top line, after the mode switches, as SQUARE
    // chips — a colour you used is a thing in itself, not a band of a gradient (owner,
    // 2026-09-08). Draggable onto the ramp like every other chip here.
    const recentStrip = (
        <div className="flex items-center gap-1 shrink min-w-0 overflow-hidden" data-gx-recent-strip>
            {recents.length === 0 ? (
                <span className="text-[12px] text-fg-faint whitespace-nowrap">no recent colours</span>
            ) : (
                recents.map((c, i) => (
                    <button
                        key={`${c}-${i}`}
                        type="button"
                        onClick={() => setFromHex(c)}
                        draggable
                        onDragStart={(e) => setColorDrag(e.dataTransfer, c)}
                        title={c}
                        className={`w-5 h-5 shrink-0 ${CHIP_R} border transition-transform hover:scale-105 ${
                            c.toUpperCase() === hex.toUpperCase() ? 'border-fg' : 'border-line/20'
                        }`}
                        style={{ backgroundColor: c }}
                    />
                ))
            )}
        </div>
    );

    // Kelvin — a light's temperature rather than a screen colour. One-way by nature (a
    // rendered colour has no single temperature), so the slider proposes and the colour takes.
    const kelvinBlock = (
        <div className="flex flex-col gap-2 w-[190px]">
            <GradientSlider
                label="K"
                value={kelvin}
                min={1000}
                max={15000}
                step={50}
                trackBg={`linear-gradient(to right, ${[1000, 2500, 4000, 5500, 7000, 9000, 12000, 15000].map(kelvinToHex).join(', ')})`}
                onChange={(k) => { setKelvin(k); emit(safeHsb(applyTint(kelvinToHex(k), tint))); }}
                onStart={handleSliderStart}
                onEnd={handleSliderEnd}
            />
            <GradientSlider
                label="T"
                value={tint}
                min={-100}
                max={100}
                step={1}
                trackBg={`linear-gradient(to right, ${applyTint(kelvinToHex(kelvin), -100)}, ${kelvinToHex(kelvin)}, ${applyTint(kelvinToHex(kelvin), 100)})`}
                onChange={(t) => { setTint(t); emit(safeHsb(applyTint(kelvinToHex(kelvin), t))); }}
                onStart={handleSliderStart}
                onEnd={handleSliderEnd}
            />
        </div>
    );

    // The wheel, its handle palette, and the harmony chooser (soft dialect only).
    // With Harmony switched off the wheel is just a colour wheel: one handle, the colour you
    // are editing. The set is still there underneath — turning Harmony back on shows it again
    // unchanged (owner, 2026-09-08).
    const shownHandles = on('harmony') ? wheelHandles : [wheelHandles[wheelActive] ?? wheelHandles[0]];
    const wheelBlock = (
        <ColorWheel
            handles={shownHandles}
            activeIndex={on('harmony') ? wheelActive : 0}
            size={150}
            soft
            onActivate={(i) => wheelActivate(on('harmony') ? i : wheelActive)}
            onMove={wheelMove}
            onValue={wheelValue}
            onDragStart={handleSliderStart}
            onDragEnd={handleSliderEnd}
            onAdd={harmony === 'free' ? wheelAdd : undefined}
            onRemove={harmony === 'free' && wheelHandles.length > 1 ? wheelRemove : undefined}
        />
    );
    const harmonyBlock = (
        <div className="flex flex-col gap-2 w-[230px] shrink-0">
            <div className="flex flex-col gap-2">
                <div className="min-w-0">
                    <Dropdown
                        size="md"
                        fullWidth
                        label="Harmony"
                        value={harmony}
                        options={[
                            { label: 'Free', value: 'free' },
                            { label: 'Monochromatic', value: 'mono' },
                            { label: 'Complementary', value: 'complementary' },
                            { label: 'Analogous', value: 'analogous' },
                            { label: 'Equiangular', value: 'equiangular' },
                        ]}
                        onChange={(v) => {
                            const mode = v as ColorHarmony;
                            // Free starts from whatever is on the wheel the FIRST time, and after
                            // that it is the user's own set: re-seeding on every entry threw away
                            // hand-placed handles as soon as you looked at another harmony and
                            // came back (measured 2026-09-08 — four handles became five).
                            const range = HARMONY_ANGLE[mode];
                            if (range) setHarmonyAngle(range[2]);
                            // a count carried over from another rule can sit outside this
                            // one's range (5 handles under Complementary, which tops out at 4)
                            const cr = HARMONY_COUNT[mode];
                            if (cr) setHarmonyCount((n) => Math.max(cr[0], Math.min(cr[1], n)));
                            setHarmony(mode);
                        }}
                    />
                </div>
                {countRange && (
                    <div className="flex items-center gap-1 justify-end">
                        <button
                            type="button"
                            className="w-6 h-6 rounded-lg border border-line/20 text-fg-muted hover:text-fg disabled:opacity-40"
                            disabled={harmonyCount <= countRange[0]}
                            onClick={() => setHarmonyCount((n) => Math.max(countRange[0], n - 1))}
                            title="One fewer colour"
                        >&minus;</button>
                        <span className="w-3 text-center text-[12px] tabular-nums text-fg-muted select-none">{harmonyCount}</span>
                        <button
                            type="button"
                            className="w-6 h-6 rounded-lg border border-line/20 text-fg-muted hover:text-fg disabled:opacity-40"
                            disabled={harmonyCount >= countRange[1]}
                            onClick={() => setHarmonyCount((n) => Math.min(countRange[1], n + 1))}
                            title="One more colour"
                        >+</button>
                    </div>
                )}
            </div>
            {angleRange && (
                <Slider
                    dense
                    label={harmony === 'analogous' ? 'Step' : 'Spread'}
                    value={harmonyAngle}
                    min={angleRange[0]}
                    max={angleRange[1]}
                    step={1}
                    defaultValue={angleRange[2]}
                    onChange={(v) => setHarmonyAngle(Math.round(v))}
                />
            )}
            <SwatchRow
                label={harmony === 'free' ? 'Handles' : 'Harmony'}
                colors={wheelHandles.map((h) => hsbToHex({ h: h.h, s: h.s * 100, v: h.v }))}
                // by INDEX: picking a handle here selects it, it does not re-derive the set
                onPickIndex={wheelActivate}
                onPick={(c) => setFromHex(c)}
                current={hex}
            />
            {/* the colours of the gradient being edited — its palette row, brought here so the
                harmony and the thing it has to live with are side by side (owner) */}
            <SwatchRow label="Gradient" colors={palette} onPick={(c) => setFromHex(c)} current={hex} />
        </div>
    );

    // Group 3 — swatches: harmony rows + recents + palette.
    const swatchesBlock = (
        <>
            <SwatchRow label="Analog" colors={harmonies?.analogous ?? []} onPick={(c) => setFromHex(c)} current={hex} />
            <SwatchRow label="Mono" colors={harmonies?.monochromatic ?? []} onPick={(c) => setFromHex(c)} current={hex} />
            <SwatchRow label="Comp" colors={harmonies?.complementary ?? []} onPick={(c) => setFromHex(c)} current={hex} />
            <SwatchRow label="Split" colors={harmonies?.split ?? []} onPick={(c) => setFromHex(c)} current={hex} />
            <div className="h-px bg-line/5 my-0.5" />
            <SwatchRow label="Recent" colors={recents} onPick={(c) => setFromHex(c)} current={hex} />
            <SwatchRow label="Palette" colors={palette} onPick={(c) => setFromHex(c)} current={hex} />
        </>
    );

    return (
        <div
            ref={rootRef}
            // soft: no box of its own — the tray IS the surface (no panel inside a panel)
            className={`flex flex-col w-full gradient-interactive-element ${
                soft ? 'gap-2' : 'gap-1.5 bg-surface-section border border-line/10 rounded p-2'
            }`}
            data-help-id="ui.colorpicker"
            data-gx-picker-skin={soft ? 'soft' : 'default'}
            onContextMenu={handleContainerContextMenu}
        >
            {soft && !minified ? (
                // the chosen controls, in a fixed reading order; the hex line carries the
                // toolbar so turning one on or off is one click from the colour itself
                <>
                    <div className="flex items-center gap-2">{hexRow}{modeBar}{on('swatches') && recentStrip}</div>
                    <div className="flex flex-wrap gap-4 items-start">
                        {on('stop') && stopBlock && <div className="flex flex-col gap-2 w-[210px] shrink-0">{stopBlock}</div>}
                        {on('spectrum') && <div className="flex flex-col gap-2 shrink-0">{fieldBlock}</div>}
                        {on('wheel') && <div className="flex flex-col gap-2 shrink-0">{wheelBlock}</div>}
                        {on('harmony') && harmonyBlock}
                        {/* The channels stand exactly as tall as the spectrum / wheel beside them:
                            the column takes the surface height and SPREADS its rows into it, so
                            the two blocks line up by construction rather than by a tuned gap
                            (owner, 2026-09-08). */}
                        {on('channels') && (
                            <div className="flex flex-col justify-between flex-1 min-w-[190px]" style={{ height: SURFACE_PX }}>
                                {channelsBlock}
                            </div>
                        )}
                        {on('kelvin') && kelvinBlock}

                    </div>
                </>
            ) : layout === 'cols' ? (
                // Widest — pads | channels | swatches, three columns side by side.
                <div className={`flex items-start ${soft ? 'gap-4' : 'gap-3'}`}>
                    <div className={`min-w-0 flex flex-col ${soft ? 'gap-2 shrink-0' : 'flex-1 gap-1.5'}`}>{hexRow}{soft ? wheelBlock : fieldBlock}</div>
                    <div className={`flex-1 min-w-0 flex flex-col ${soft ? 'gap-1.5' : 'gap-1'}`}>{channelsBlock}</div>
                    <div className={`flex-1 min-w-0 flex flex-col ${soft ? 'gap-2' : 'gap-1'}`}>{soft ? harmonyBlock : swatchesBlock}</div>
                </div>
            ) : layout === 'rows' ? (
                // Medium — pads on top, channels | swatches side by side below.
                <>
                    <div className="flex flex-col gap-1.5">{hexRow}{soft ? wheelBlock : fieldBlock}</div>
                    <div className={`flex items-start pt-0.5 ${soft ? 'gap-4' : 'gap-3 border-t border-line/5'}`}>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">{channelsBlock}</div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">{soft ? harmonyBlock : swatchesBlock}</div>
                    </div>
                </>
            ) : minified ? (
                // Narrow + minified (dock default) — swatch/hex line on top, then the 2D
                // Hue×Lightness pad. The chevron on the hex line expands to the full pads.
                <>
                    {hexRow}
                    {hlPad}
                </>
            ) : (
                // Narrow + expanded — the full Saturation×Value field + hue strip, with
                // channels + swatches behind a further, persisted collapsible subitem.
                <>
                    {hexRow}
                    {fieldBlock}
                    <div className="flex flex-col gap-1 pt-1 border-t border-line/10">
                        <button
                            onClick={toggleChannels}
                            className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-fg-dim hover:text-fg-tertiary font-bold select-none"
                        >
                            <span className="inline-block w-2 text-center">{channelsOpen ? '▾' : '▸'}</span>
                            Channels &amp; swatches
                        </button>
                        {channelsOpen && (
                            <div className="flex flex-col gap-1 pt-0.5">
                                {channelsBlock}
                                <div className="h-px bg-line/10 my-1" />
                                {swatchesBlock}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default EmbeddedColorPicker;
