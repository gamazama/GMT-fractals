
import React, { useState, useRef, useEffect, useMemo, useCallback, useSyncExternalStore, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import type { GradientStop, GradientConfig, ColorSpaceMode, BlendColorSpace } from '../types';
import type { ContextMenuItem } from '../types/help';
import { isColorDrag, readColorDrag } from './gradient/colorDrag';
import { rgbToHex, nudgeChannel, sampleStops, renderStopsToRamp } from '../utils/colorUtils';

/** Strip-chrome preview width in px — sampled per pixel, wider than any hero (see previewWide). */
const STRIP_PREVIEW_W = 1536;
import { stopOps } from '../utils/stopOps';
import Slider from './Slider';
import { z } from './ui';
import EmbeddedColorPicker from './EmbeddedColorPicker';
import Dropdown from './Dropdown';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import { useInteractionGesture } from '../engine/hooks/useInteractionDrag';
import { collectHelpIds } from '../utils/helpUtils';
import { ContextMenu as PresetMenu } from './gradient/GradientContextMenu';
import { MenuIcon } from './Icons';
import { useRenderPause } from '../hooks/useRenderPause';
import {
    getGradientEditorEntrance,
    subscribeGradientEditorEntrance,
} from './gradient/gradientEditorEntrance';
import {
    getGradientFavientsBridge,
    subscribeGradientFavientsBridge,
} from './gradient/gradientFavients';
import { buildGradientMenu } from './gradient/gradientActions';

// Host-agnostic InteractionSession token (ADR-0061) for the continuous
// stop/bracket/bias drags. The same string app-gmt's INTERACTION_SOURCES.slider
// uses — inlined so this engine-core editor doesn't import engine-gmt's
// app-level token table (the type is the open `InteractionSource = string`).
const STOP_DRAG_SOURCE = 'slider';

type InterpolationMode = 'linear' | 'step' | 'smooth' | 'cubic';

interface AdvancedGradientKnot {
    id: string;
    position: number;
    color: string;
    bias: number;
    interpolation: InterpolationMode;
}

interface DragPayload {
    type: 'knot' | 'bias' | 'bracket_move' | 'bracket_scale_left' | 'bracket_scale_right' | 'marquee';
    ids: string[];
    startX: number;
    startY: number;
    initialKnots: AdvancedGradientKnot[];
}

interface AdvancedGradientEditorProps {
    // Polymorphic input: Can be legacy Array OR new Object
    value: GradientStop[] | GradientConfig;
    onChange: (val: GradientStop[] | GradientConfig) => void;
    helpId?: string;
    /**
     * Reusable-editor undo contract (interface (d), FROZEN P0c). A host brackets
     * the editor's mutations into ITS own history:
     *   - `onEditStart()` / `onEditEnd()` wrap a continuous gesture (knot / bracket
     *     / bias drag) so the net change is ONE undo entry.
     *   - `edit(mutate)` wraps a discrete one-shot action (cycle, paste, menu op,
     *     keyboard nudge) — start + mutate + end.
     * All three are OPTIONAL: when omitted they fall back to the engine
     * StoreCallbacks interaction bracket (`handleInteractionStart('param')` /
     * `handleInteractionEnd()`), so app-gmt's DDFS gradient param rides undo with
     * zero host wiring. The palette host passes its `genEditStart/genEditEnd/genEdit`
     * (which drive its `registerHistoryProvider` snapshot). No host-specific undo
     * path lives in this shared view — only this contract + the generic default.
     */
    onEditStart?: () => void;
    onEditEnd?: () => void;
    edit?: (mutate: () => void) => void;
    /** Generic identity of the DDFS param this editor edits (set by AutoFeaturePanel
     *  when the editor is a feature-panel gradient widget). Forwarded to the host
     *  header entrance so its Favients button can resolve the matching send target. */
    featureId?: string;
    paramKey?: string;
    /**
     * Chrome (additive, 2026-09-03, Gradient Explorer v2 hero — plans/ge-v2-design.md §5.1):
     *   'full'  (default) — the header row (expand toggle, blend/output space indicators, the
     *            host entrance, the clipboard menu) above the strip; the inspector collapses
     *            behind the toggle. Every existing host renders this.
     *   'strip' — NO header row: the strip + knot track are the whole top edge, the inspector
     *            is always available below (it shows when a knot is selected), and the
     *            blend/output-space indicators + the clipboard menu sit in the inspector's LEFT
     *            column next to the host's `stripAside`, beside the colour picker. No raised
     *            backdrop. The host entrance is not rendered (the v2 hero has its own star).
     */
    chrome?: 'full' | 'strip';
    /** Height of the colour strip in px (default 32, the panel size). The v2 hero uses ~60. */
    stripHeight?: number;
    /** Host override for the inspector colour picker's fixed Palette row (hex strings). The
     *  v2 hero feeds its working palette here so there is ONE palette, not two. */
    pickerPalette?: string[];
    /** Strip chrome only: host items for the inspector's LEFT column (the v2 hero puts its
     *  Curves / Adjust toggles here). With a knot selected they stack down the left of the
     *  colour picker, which is wide enough to lend the space; with nothing selected they lie
     *  in one line with the blend / output / menu items. */
    stripAside?: React.ReactNode;
    /** Strip chrome only (additive, 2026-09-07, GE v2 Phase C — plans/ge-v2-figma/trays-spec.md):
     *  an element to PORTAL the stop inspector into. The v2 hero hangs a tray under its card
     *  and the inspector is one of the tray's faces, so with a host given the inspector (the
     *  colour picker + the stop column) renders THERE instead of under the strip, and the strip
     *  row keeps only `stripAside` + blend / output / menu. `onSelectionChange` tells the host
     *  when to show that face. Every other host is unchanged (no host → today's layout). */
    inspectorHost?: HTMLElement | null;
    /** Fires with the number of selected knots whenever it changes (strip chrome hosts). */
    onSelectionChange?: (count: number) => void;
    /** Strip chrome only: which corners of the bar are rounded. 'bottom' when the host stacks
     *  a source half on top of the strip (the v2 hero's split ramp) so the two read as one bar. */
    stripCorners?: 'all' | 'bottom';
    /** 'strip' chrome: paint THIS gradient on the bar instead of the edited stops — the v2
     *  hero passes the pipeline's RESULT while Adjust / curves are live over an edited
     *  document (measured 2026-09-07: after a Curves bake the bar showed the stops document,
     *  so Adjust moved the palette swatches and not the ramp). The knots stay the document's. */
    previewConfig?: GradientConfig;
    /** 'strip' chrome: a single click on the bar (not on a bias handle) — the v2 hero's
     *  BAKE gesture while a face is open (C.9). Absent = the bar takes no single click. */
    onStripClick?: () => void;
    /** 'strip' chrome: the bar's tooltip while onStripClick is set. */
    stripTitle?: string;
    /** 'strip' chrome: an element rendered inside the bar (the hero's instant hover hint);
     *  the bar carries the `group/strip` class for it. */
    stripHint?: React.ReactNode;
}

/**
 * CURSORS, one scheme across the whole editor (owner's walk, 2026-09-08). A cursor is a
 * promise about the next click, so each shape means exactly one thing here:
 *
 *   crosshair    place or draw ON the track  — add a knot, drag a marquee
 *   grab/grabbing  pick a knot up and move it
 *   move         move a whole selection
 *   ew-resize    change a value along the axis — scale a selection, a bias handle, a slider,
 *                a palette swatch sliding along the ramp
 *   pointer      a click that DOES something — bake, cancel, a chip, a button
 *   no-drop      let go here and the knot is dropped from the gradient
 *   default      nothing happens here
 *
 * The rule that keeps it honest: a surface only wears `pointer` while it actually has a
 * click to give. The bar used to wear it always, including when a click did nothing.
 */

/** Imperative seam for a host that owns a palette face over the strip (the v2 hero). */
export interface AdvancedGradientEditorHandle {
    /** Select the knot within `tolerance` of `t`; if there is none, insert one there (the
     *  ramp's colour at `t`, the segment's interpolation) as ONE bracketed edit and select it. */
    selectAt: (t: number, tolerance?: number) => void;
    /** Deselect every knot (the host's Esc order closes the inspector face this way). */
    clearSelection: () => void;
    /** A colour was DROPPED at `t`: recolour the knot within `tolerance`, or insert one there.
     *  One bracketed edit either way; the touched knot ends up selected. */
    dropColourAt: (t: number, hex: string, tolerance?: number) => void;
}

const knotsEqual = (a: AdvancedGradientKnot[], b: AdvancedGradientKnot[]): boolean =>
    a.length === b.length && a.every((k, i) =>
        k.id === b[i].id && k.position === b[i].position && k.color === b[i].color && k.bias === b[i].bias && k.interpolation === b[i].interpolation
    );

const BiasIcon = () => (
    <svg width="12" height="12" viewBox="0 0 10 10" className="fill-gray-700 hover:fill-white drop-shadow-md stroke-white stroke-[0.5] pointer-events-none">
        <path d="M 5 0 L 10 5 L 5 10 L 0 5 Z" />
    </svg>
);

/**
 * The knot's SHAPE says what its segment does (owner, 2026-09-08): a pointed house for a
 * segment that travels (linear, smooth), a flat-topped SQUARE for one that holds (step).
 * A stepped gradient is then readable straight off the track.
 */
const KnotIcon = ({ color, isSelected, interpolation }: { color: string, isSelected: boolean, interpolation?: InterpolationMode }) => (
    <svg width="14" height="18" viewBox="0 0 14 18" className="drop-shadow-md pointer-events-none">
        <path 
            d={interpolation === 'step' ? "M 0 1 L 14 1 L 14 17 L 0 17 Z" : "M 7 0 L 14 7 L 14 17 L 0 17 L 0 7 Z"}
            fill={color} 
            stroke={isSelected ? "white" : "#555"} 
            strokeWidth={isSelected ? "2" : "1"} 
        />
    </svg>
);

const AdvancedGradientEditor = React.forwardRef<AdvancedGradientEditorHandle, AdvancedGradientEditorProps>(({ value, onChange, helpId, onEditStart, onEditEnd, edit, featureId, paramKey, chrome = 'full', stripHeight = 32, pickerPalette, stripAside, inspectorHost, onSelectionChange, stripCorners = 'all', onStripClick, stripTitle, stripHint, previewConfig }, ref) => {
    // --- PARSE POLYMORPHIC INPUT ---
    // Extract Stops and ColorSpace from input. Default to sRGB if legacy array.
    const { stops, colorSpace, blendSpace } = useMemo(() => {
        if (Array.isArray(value)) {
            return { stops: value, colorSpace: 'srgb' as ColorSpaceMode, blendSpace: 'oklab' as BlendColorSpace };
        } else {
            return { stops: value.stops, colorSpace: value.colorSpace, blendSpace: value.blendSpace || 'oklab' as BlendColorSpace };
        }
    }, [value]);

    const [knots, setKnots] = useState<AdvancedGradientKnot[]>([]);

    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // Suppress the next prop-sync if we just emitted. Without this guard
    // the path is: emitChange → setKnots(local) + onChange(parent) →
    // parent commits → value prop changes → useMemo re-derives stops →
    // useEffect[stops] fires → setKnots again. With strict-mode and any
    // per-frame store updates (e.g. from animation/accumulation tick)
    // batched into the same commit window, the back-and-forth can
    // saturate React's update budget mid-drag and trip "Maximum update
    // depth exceeded". The local state is already current; skipping the
    // sync is safe — incoming==prev anyway. External value changes
    // (preset load, undo, parent overrides) leave the flag unset and
    // sync normally.
    const justEmittedRef = useRef(false);

    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();

    // Interface (d) resolution: prefer the injected host callbacks; default to the
    // engine StoreCallbacks 'param' interaction bracket (app-gmt's DDFS undo). These
    // are stable references (host callbacks are stable; the context's are too), so
    // the window-listener drag callbacks that depend on them keep a stable identity.
    const editStart = useCallback(
        () => (onEditStart ?? (() => handleInteractionStart('param')))(),
        [onEditStart, handleInteractionStart],
    );
    const editEnd = useCallback(
        () => (onEditEnd ?? handleInteractionEnd)(),
        [onEditEnd, handleInteractionEnd],
    );
    const editAction = useCallback(
        (mutate: () => void) => {
            if (edit) { edit(mutate); return; }
            // Fall back through editStart/editEnd (not the raw context) so a host
            // that supplies only start/end still brackets discrete actions its way.
            editStart();
            mutate();
            editEnd();
        },
        [edit, editStart, editEnd],
    );

    // Session for the continuous knot / bracket / bias drags (window mouse-listener
    // gesture), anchored to the same edit boundary (ADR-0061 P3b). The marquee
    // select + the discrete menu/keyboard/cycle handlers deliberately open no
    // session. The <Slider> bias/position controls are the already-wired connected
    // component.
    const knotSession = useInteractionGesture(STOP_DRAG_SOURCE);

    useEffect(() => {
        if (justEmittedRef.current) {
            justEmittedRef.current = false;
            return;
        }
        setKnots(prev => {
            const incoming = stops.map(stop => ({
                id: stop.id,
                position: stop.position,
                color: stop.color,
                bias: stop.bias ?? 0.5,
                interpolation: (stop.interpolation as InterpolationMode) ?? 'linear'
            })).sort((a, b) => a.position - b.position);
            if (knotsEqual(prev, incoming)) return prev;
            return incoming;
        });
    }, [stops]);

    const knotsRef = useRef(knots);
    useEffect(() => { knotsRef.current = knots; }, [knots]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExpandedState, setIsExpanded] = useState(true);
    // Strip chrome has no toggle: the inspector is always reachable.
    const isExpanded = chrome === 'strip' ? true : isExpandedState;
    const [isBiasHandlesVisible, setIsBiasHandlesVisible] = useState(true);
    // 'strip' chrome: the bias handles show only while the pointer is over the bar (C.7,
    // owner 2026-09-07: "hero bias handles to only be visible when over the gradient").
    const [stripHover, setStripHover] = useState(false);
    const showBias = isBiasHandlesVisible && (chrome !== 'strip' || stripHover);
    
    const dragPayloadRef = useRef<DragPayload | null>(null);
    const [isDragRemoving, setIsDragRemoving] = useState(false);
    const isDragRemovingRef = useRef(false);
    
    const [marqueeRect, setMarqueeRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);
    const [presetMenu, setPresetMenu] = useState<{x:number, y:number} | null>(null);

    // Pause the render loop while the preset menu is open.
    useRenderPause(presetMenu !== null);

    const containerRef = useRef<HTMLDivElement>(null);
    const knotTrackRef = useRef<HTMLDivElement>(null);
    /** Where a colour being dragged would land (0..1), or null when none is in flight. The
     *  ramp shows every knot dashed while this is set — see components/gradient/colorDrag.ts. */
    const [colourDropAt, setColourDropAt] = useState<number | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Host-injected header entrance (app-gmt / explorer mount the Favients shelf
    // button here). Engine-core can't import palette, so it renders whatever the
    // host registered through the gradientEditorEntrance seam — or nothing.
    const entrance = useSyncExternalStore(subscribeGradientEditorEntrance, getGradientEditorEntrance);

    // The editor's current gradient as a config — handed to the header entrance so the
    // host's Favients button can add it (when the shelf is already open), and reused for
    // the menu's "Send to Favients".
    const currentConfig = useMemo<GradientConfig>(
        () => ({ stops: knots, colorSpace, blendSpace }),
        [knots, colorSpace, blendSpace],
    );

    // Preview strip = the EXACT 256-step ramp (LOCKED P0c decision 2), rendered by
    // the engine canonical sampler so it matches the baked texture (no CSS-gradient
    // approximation). colorSpace is the OUTPUT-texture transform, not an authoring
    // concern — the strip shows the sRGB authoring colours (as the old CSS string
    // did), so it stays a faithful colour preview. Memoised so unrelated re-renders
    // (selection / marquee / expand) don't re-sample 256 texels.
    const previewStops = previewConfig?.stops ?? knots;
    const previewBlend = previewConfig?.blendSpace ?? blendSpace;
    const previewRamp = useMemo(() => renderStopsToRamp(previewStops, previewBlend), [previewStops, previewBlend]);
    // Strip chrome (the v2 hero, ~1100 px wide): the preview samples the STOPS once per
    // display pixel instead of stretching the 256-texel ramp — a bilinear scale-up softened
    // every step edge into a little gradient, and nearest would band the smooth ones
    // (owner, 2026-09-07: pixelated only where it is stepped). Full chrome (GMT main) keeps
    // the 256-texel canvas.
    const previewWide = useMemo(() => {
        if (chrome !== 'strip') return null;
        const out = new Uint8ClampedArray(STRIP_PREVIEW_W * 4);
        const sorted = [...previewStops].sort((a, b) => a.position - b.position);
        for (let x = 0; x < STRIP_PREVIEW_W; x++) {
            const c = sampleStops(sorted, x / (STRIP_PREVIEW_W - 1), previewBlend, 'srgb');
            out[x * 4] = c.r; out[x * 4 + 1] = c.g; out[x * 4 + 2] = c.b; out[x * 4 + 3] = 255;
        }
        return out;
    }, [previewStops, previewBlend, chrome]);

    useEffect(() => {
        const cv = previewCanvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        if (previewWide) {
            const img = ctx.createImageData(STRIP_PREVIEW_W, 1);
            img.data.set(previewWide);
            ctx.putImageData(img, 0, 0);
            return;
        }
        const img = ctx.createImageData(256, 1);
        for (let i = 0; i < 256; i++) {
            img.data[i * 4] = previewRamp[i].r;
            img.data[i * 4 + 1] = previewRamp[i].g;
            img.data[i * 4 + 2] = previewRamp[i].b;
            img.data[i * 4 + 3] = 255;
        }
        // 256×1 backing store stretched by CSS to the strip's full width/height —
        // the browser's display scaling smooths it into a continuous gradient.
        ctx.putImageData(img, 0, 0);
    }, [previewRamp, previewWide]);

    // --- OUTPUT LOGIC ---
    // Always emits the Object format if we detect we are in "Advanced Mode" (internal check), 
    // or if the input was already an object.
    // For safety, we simply ALWAYS emit the object now. The utils handle it fine.
    // The Store handles saving it.
    // Accepts any GradientStop[] — the generic stopOps preserve the knot shape, but
    // `stopOps.double`/`default` return bare GradientStop[]; normalising bias/
    // interpolation here keeps every op funnelling through one place (and any future
    // host that feeds raw stops works too). Runtime is unchanged for knot inputs.
    const emitChange = useCallback((newKnots: GradientStop[], newColorSpace?: ColorSpaceMode, newBlendSpace?: BlendColorSpace) => {
        const sorted: AdvancedGradientKnot[] = [...newKnots]
            .sort((a, b) => a.position - b.position)
            .map(({ id, position, color, bias, interpolation }) => ({
                id, position, color,
                bias: bias ?? 0.5,
                interpolation: (interpolation as InterpolationMode) ?? 'linear',
            }));
        // Mark BEFORE calling setKnots so the prop-sync useEffect skips
        // the redundant sync that fires when the parent's onChange
        // re-flows the value back to us. See justEmittedRef comment.
        justEmittedRef.current = true;
        setKnots(sorted);

        const newStops = sorted.map(({ id, position, color, bias, interpolation }) => ({
            id, position, color, bias, interpolation
        }));

        onChangeRef.current({
            stops: newStops,
            colorSpace: newColorSpace || colorSpace,
            blendSpace: newBlendSpace ?? blendSpace
        });
    }, [colorSpace, blendSpace]);

    const cycleColorSpace = () => {
        const nextMode = colorSpace === 'srgb' ? 'linear' : colorSpace === 'linear' ? 'aces_inverse' : 'srgb';
        editAction(() => emitChange(knots, nextMode));
    };

    const cycleBlendSpace = () => {
        // 'hsv-far' is retired (owner, 2026-09-08) — the cycle skips it; a gradient already
        // saved in it still renders and simply moves on at the next click.
        const order: BlendColorSpace[] = ['rgb', 'hsv', 'oklab'];
        const next = order[(order.indexOf(blendSpace) + 1) % order.length];
        editAction(() => emitChange(knots, undefined, next));
    };

    const handleColorChange = useCallback((color: string) => {
        if (selectedIds.size > 0) {
            emitChange(knotsRef.current.map(k => selectedIds.has(k.id) ? { ...k, color } : k));
        }
    }, [selectedIds, emitChange]);

    /**
     * A channel nudged while SEVERAL knots are selected: move that channel by `delta` on each
     * of them and leave the rest of each colour alone. Setting a colour outright still paints
     * them all the same; this is the other half of that pair (owner, 2026-09-08: "adjust just
     * that channel while keeping each individual knot's other settings").
     * Clamped per knot, so one knot hitting the end does not drag the others with it.
     */
    const adjustChannel = useCallback((channel: 'r' | 'g' | 'b' | 'h' | 's' | 'v', delta: number) => {
        const ids = selectedIds;
        if (ids.size === 0) return;
        emitChange(knotsRef.current.map((k) => (ids.has(k.id) ? { ...k, color: nudgeChannel(k.color, channel, delta) } : k)));
    }, [emitChange, selectedIds]);

    // Host seam (v2 hero): a palette swatch click lands on its stop. The knot nearest `t`
    // within the tolerance is selected; otherwise one is inserted there the way a track
    // click inserts (sampled colour, the segment's interpolation) — one bracketed edit.
    /** A colour landed at `t`: recolour the knot within `tolerance`, else insert one there.
     *  Shared by the imperative handle (the hero's palette row drops through it) and by the
     *  knot track's own onDrop. */
    const dropColourAt = useCallback((t: number, hex: string, tolerance = 0.02) => {
        const pos = Math.max(0, Math.min(1, t));
        const cur = knotsRef.current;
        let best: AdvancedGradientKnot | null = null;
        for (const k of cur) {
            const d = Math.abs(k.position - pos);
            if (d <= tolerance && (!best || d < Math.abs(best.position - pos))) best = k;
        }
        // The SELECTION is not the drop's business: you are colouring a knot, not choosing one,
        // and stealing it swaps the inspector out from under the colour you just dragged
        // (owner, 2026-09-08).
        if (best) {
            const target = best;
            editAction(() => emitChange(cur.map((k) => (k.id === target.id ? { ...k, color: hex } : k))));
            return;
        }
        const prev = [...cur].sort((a, b) => a.position - b.position).filter((k) => k.position <= pos).pop();
        const added: AdvancedGradientKnot = { id: `${Date.now()}_drop`, position: pos, color: hex, bias: 0.5, interpolation: prev ? prev.interpolation : 'linear' };
        editAction(() => emitChange([...cur, added]));
    }, [editAction, emitChange]);

    useImperativeHandle(ref, () => ({
        selectAt: (t: number, tolerance = 0.015) => {
            const pos = Math.max(0, Math.min(1, t));
            const cur = knotsRef.current;
            let best: AdvancedGradientKnot | null = null;
            for (const k of cur) {
                const d = Math.abs(k.position - pos);
                if (d <= tolerance && (!best || d < Math.abs(best.position - pos))) best = k;
            }
            if (best) { setSelectedIds(new Set([best.id])); return; }
            const color = rgbToHex(sampleStops(cur, pos, blendSpace));
            const prev = [...cur].sort((a, b) => a.position - b.position).filter(k => k.position <= pos).pop();
            const newKnot: AdvancedGradientKnot = { id: Date.now().toString(), position: pos, color, bias: 0.5, interpolation: prev ? prev.interpolation : 'linear' };
            editAction(() => emitChange([...cur, newKnot]));
            setSelectedIds(new Set([newKnot.id]));
        },
        clearSelection: () => setSelectedIds(new Set()),
        dropColourAt,
    }), [blendSpace, editAction, emitChange, dropColourAt]);

    const handleCopy = useCallback(() => {
        const data = JSON.stringify({
            stops: knotsRef.current.map(({ position, color, bias, interpolation }) => ({ position, color, bias, interpolation })),
            colorSpace,
            blendSpace
        });
        navigator.clipboard.writeText(data);
    }, [colorSpace, blendSpace]);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            const data = JSON.parse(text);

            // Engine-core normalisation: tolerates a legacy array OR a { stops }
            // wrapper, drops malformed entries, clamps + upper-cases hex, fills ids.
            const parsed = stopOps.normalizePaste(data);
            if (!parsed || parsed.length < 2) return;

            // colorSpace/blendSpace ride the wrapper (not the stop array). Preserve
            // the prior defaults: a bare-array paste blends rgb; an object paste
            // takes its own spaces or srgb/oklab.
            let newSpace: ColorSpaceMode = 'srgb';
            let newBlend: BlendColorSpace = 'rgb';
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                newSpace = (data as GradientConfig).colorSpace || 'srgb';
                newBlend = (data as GradientConfig).blendSpace || 'oklab';
            }

            const newKnots: AdvancedGradientKnot[] = parsed.map((s, i) => ({
                id: s.id ?? `p${i}`,
                position: s.position,
                color: s.color,
                bias: s.bias ?? 0.5,
                interpolation: (s.interpolation as InterpolationMode) ?? 'linear',
            }));
            editAction(() => {
                emitChange(newKnots, newSpace, newBlend);
                setSelectedIds(new Set());
            });
        } catch (e) {
            console.error(e);
        }
    }, [emitChange, editAction]);

    // Single source of truth for BOTH menus: the header dropdown and the right-click
    // track context menu build their items from `buildGradientMenu`, so the dropdown is
    // a literal mirror of the context menu (gradients actions + Send to Favients +
    // clipboard + view/blend/output toggles). The favients bridge is host-injected
    // (subscribed for late registration); the dropdown shows the same "Send to Favients"
    // the context menu does. Built at call time so `checked`/disabled stay fresh.
    const favientsBridge = useSyncExternalStore(subscribeGradientFavientsBridge, getGradientFavientsBridge);
    // In the v2 hero (the inspector is hosted) the menu keeps only its ACTIONS and VIEW
    // sections (owner, 2026-09-07 evening): favients, clipboard, interpolation, blend and
    // output all have homes elsewhere there (the shelf, the inspector, the strip, Export).
    const onlySections = (items: ContextMenuItem[]): ContextMenuItem[] => {
        if (!inspectorHost) return items;
        const keep = new Set(['Actions', 'View']);
        let on = false;
        return items.filter((it) => {
            if (it.isHeader) { on = keep.has(it.label ?? ''); return on; }
            return on;
        });
    };
    const buildMenuItems = useCallback(() => onlySections(buildGradientMenu({
        knots,
        config: currentConfig,
        selectedIds,
        blendSpace,
        colorSpace,
        isBiasHandlesVisible,
        emit: emitChange,
        editAction,
        setSelectedIds,
        setBiasHandlesVisible: setIsBiasHandlesVisible,
        copy: handleCopy,
        paste: handlePaste,
    })), [knots, currentConfig, selectedIds, blendSpace, colorSpace, isBiasHandlesVisible, emitChange, editAction, handleCopy, handlePaste, favientsBridge, inspectorHost]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const payload = dragPayloadRef.current;
        if (!payload) return;
        
        const { type, ids, startX, startY, initialKnots } = payload;
        const trackRect = knotTrackRef.current?.getBoundingClientRect();
        if (!trackRect) return;

        const deltaX = e.clientX - startX;
        const deltaXRatio = deltaX / trackRect.width;

        if (type === 'marquee') {
            setMarqueeRect({ 
                x: Math.min(startX, e.clientX), 
                y: Math.min(startY, e.clientY), 
                w: Math.abs(e.clientX - startX), 
                h: Math.abs(e.clientY - startY) 
            });
            return;
        }

        if (type === 'knot' || type === 'bracket_move') {
            const vDist = Math.abs(e.clientY - (trackRect.top + trackRect.height / 2));
            const hDist = Math.max(0, trackRect.left - e.clientX, e.clientX - trackRect.right);
            const isPullingAway = (vDist > 50 || hDist > 50) && initialKnots.length > ids.length;
            
            if (isDragRemovingRef.current !== isPullingAway) {
                isDragRemovingRef.current = isPullingAway;
                setIsDragRemoving(isPullingAway);
                // match what the element under the pointer already promised: a knot is
                // GRABBED, a selection is MOVED. It used to say ew-resize for both, which
                // contradicted the knot's own grab cursor (owner's cursor walk, 2026-09-08).
                document.body.style.cursor = isPullingAway ? 'no-drop' : type === 'knot' ? 'grabbing' : 'move';
            }

            // Engine stop-op: move selected stops by the pointer delta (shift-snaps).
            emitChange(stopOps.move(initialKnots, ids, deltaXRatio, e.shiftKey));
        }

        if (type.startsWith('bracket_scale')) {
             // Engine stop-op: signed scale about the anchored edge (crossing the
             // pivot inverts the selection). No-op for <2 selected / degenerate span.
             const side = type === 'bracket_scale_left' ? 'left' : 'right';
             emitChange(stopOps.scaleAboutPivot(initialKnots, ids, deltaXRatio, side));
        }

        if (type === 'bias') {
            // `initialKnots` is position-sorted (snapshot of the sorted `knots`), so
            // findIndex gives the segment's left index — exactly what setBias wants.
            const knotIndex = initialKnots.findIndex(k => k.id === ids[0]);
            emitChange(stopOps.setBias(initialKnots, knotIndex, deltaXRatio, e.shiftKey));
        }
    }, [emitChange]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        const payload = dragPayloadRef.current;
        if (!payload) return;

        if (payload.type === 'marquee' && knotTrackRef.current) {
            const r = knotTrackRef.current.getBoundingClientRect();
            const x1 = Math.min(payload.startX, e.clientX), x2 = Math.max(payload.startX, e.clientX);
            const y1 = Math.min(payload.startY, e.clientY), y2 = Math.max(payload.startY, e.clientY);

            const newSelected = new Set<string>();
            knotsRef.current.forEach(k => {
                const kx = r.left + k.position * r.width;
                const kY = r.top + r.height / 2;
                if (kx >= x1 && kx <= x2 && kY >= y1 - 20 && kY <= y2 + 20) newSelected.add(k.id);
            });
            
            setSelectedIds(prev => (e.shiftKey || e.ctrlKey) ? new Set([...prev, ...newSelected]) : newSelected);
            setMarqueeRect(null);

        } else if (payload.type === 'knot' || payload.type === 'bracket_move') {
             if (isDragRemovingRef.current) {
                 emitChange(knotsRef.current.filter(k => !payload.ids.includes(k.id)));
                 setSelectedIds(new Set());
             } else {
                 emitChange(knotsRef.current);
             }
             isDragRemovingRef.current = false;
             setIsDragRemoving(false);
             knotSession.end();
             editEnd();

        } else if (payload.type !== 'marquee') {
            emitChange(knotsRef.current);
            knotSession.end();
            editEnd();
        }

        dragPayloadRef.current = null;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        // knotSession intentionally omitted: useInteractionGesture returns a fresh
        // wrapper object each render, but its end() closes over a stable ref, so a
        // captured-stale knotSession.end() is correct. Listing it would churn this
        // callback's identity every render (the original omitted it for the same reason).
    }, [emitChange, handleMouseMove, editEnd]);

    const startDrag = (type: DragPayload['type'], ids: string[], e: React.MouseEvent, overrideKnots?: AdvancedGradientKnot[], skipSnapshot?: boolean) => {
        e.preventDefault(); e.stopPropagation();

        if (type !== 'marquee' && !skipSnapshot) {
            editStart();
            knotSession.begin();
        }

        dragPayloadRef.current = {
            type, ids, startX: e.clientX, startY: e.clientY,
            initialKnots: JSON.parse(JSON.stringify(overrideKnots || knots))
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleTrackMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.gradient-interactive-element') || !knotTrackRef.current) return;

        editStart();
        knotSession.begin();

        const rect = knotTrackRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        // Bug-fix (LOCKED P0c decision 3): the new-knot colour comes from the engine
        // bias/smooth-aware sampler, so a knot inserted on a biased/smooth segment
        // picks the colour the baked ramp actually shows (the old local sampler
        // ignored bias + smooth and drifted).
        const color = rgbToHex(sampleStops(knots, pos, blendSpace));
        
        const sortedKnots = [...knots].sort((a, b) => a.position - b.position);
        
        let prevKnot: AdvancedGradientKnot | undefined;
        for (let k of sortedKnots) {
            if (k.position <= pos) {
                prevKnot = k;
            } else {
                break;
            }
        }
        
        const newKnot: AdvancedGradientKnot = {
            id: Date.now().toString(), 
            position: pos, 
            color, 
            bias: 0.5, 
            interpolation: prevKnot ? prevKnot.interpolation : 'linear'
        };
        
        const newKnots = [...knots, newKnot].sort((a, b) => a.position - b.position);
        setKnots(newKnots);
        setSelectedIds(new Set([newKnot.id]));
        emitChange(newKnots);
        
        startDrag('knot', [newKnot.id], e, newKnots, true);
    };

    // ... (Keyboard handling unchanged) ...
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIds.size === 0 || (e.target as HTMLElement).tagName === 'INPUT') return;

            if ((e.key === 'Delete' || e.key === 'Backspace') && knots.length > selectedIds.size) {
                editAction(() => {
                    emitChange(stopOps.delete(knots, Array.from(selectedIds)));
                    setSelectedIds(new Set<string>());
                });
            } else if (e.key.startsWith('Arrow')) {
                e.preventDefault();
                const dir = e.key === 'ArrowLeft' ? -1 : 1;
                const step = e.shiftKey ? 0.05 : 0.01;
                editAction(() => emitChange(stopOps.move(knots, Array.from(selectedIds), dir * step)));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, knots, emitChange, editAction]);

    const selectionRange = useMemo(() => {
        if (selectedIds.size < 2) return null;
        const selected = knots.filter(k => selectedIds.has(k.id));
        if (selected.length === 0) return null;
        return { min: Math.min(...selected.map(k => k.position)), max: Math.max(...selected.map(k => k.position)) };
    }, [selectedIds, knots]);

    const selectedNodes = useMemo(() => knots.filter(k => selectedIds.has(k.id)), [knots, selectedIds]);
    const selectionCount = selectedIds.size;
    useEffect(() => { onSelectionChange?.(selectionCount); }, [selectionCount, onSelectionChange]);
    // The stop column (position · bias · interpolation) beside the picker in the portalled
    // inspector — collapsed until asked for (owner, 2026-09-07: "another hidden column").
    const [stopColumnOpen, setStopColumnOpen] = useState(false);
    
    const commonInterpolation = useMemo(() => {
        if (selectedNodes.length === 0) return 'linear';
        const first = selectedNodes[0].interpolation;
        return selectedNodes.every(k => k.interpolation === first) ? first : 'mixed';
    }, [selectedNodes]);

    const commonBias = useMemo(() => {
        if (selectedNodes.length === 0) return 0.5;
        const first = selectedNodes[0].bias;
        return selectedNodes.every(k => k.bias === first) ? first : -1;
    }, [selectedNodes]);

    const commonColor = useMemo(() => {
        if (selectedNodes.length === 0) return '#FFFFFF';
        const first = selectedNodes[0].color;
        return selectedNodes.every(k => k.color === first) ? first : selectedNodes[0].color;
    }, [selectedNodes]);

    // Discrete change (dropdown, one-shot) — wraps with undo snapshot
    const handleMultiPropertyChange = (prop: keyof AdvancedGradientKnot, value: any) => {
        const updatedKnots = knots.map(k => selectedIds.has(k.id) ? { ...k, [prop]: value } as AdvancedGradientKnot : k);
        editAction(() => emitChange(updatedKnots));
    };

    // Continuous change (slider drag) — no undo wrap, Slider handles its own drag lifecycle
    const handleSliderPropertyChange = (prop: keyof AdvancedGradientKnot, value: any) => {
        const updatedKnots = knots.map(k => selectedIds.has(k.id) ? { ...k, [prop]: value } as AdvancedGradientKnot : k);
        emitChange(updatedKnots);
    };
    
    const openTrackContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Same shared list the header dropdown renders — see buildMenuItems.
        openContextMenu(e.clientX, e.clientY, buildMenuItems(), [helpId || 'ui.gradient_editor']);
    };

    /** Right-click ON a knot: its own menu. The v2 hero trims the strip's menu to Actions and
     *  View, but a knot's INTERPOLATION belongs on the knot itself — it is the one property
     *  you reach for while looking at it (owner, 2026-09-08). Built from the same shared list,
     *  so the wording and the checkmarks cannot drift from the inspector's. */
    const openKnotContextMenu = (e: React.MouseEvent, knotId: string) => {
        e.preventDefault();
        e.stopPropagation();
        // a right-click on an unselected knot selects it first, so the menu acts on what you clicked
        if (!selectedIds.has(knotId)) setSelectedIds(new Set([knotId]));
        const full = buildGradientMenu({
            knots,
            config: currentConfig,
            selectedIds: selectedIds.has(knotId) ? selectedIds : new Set([knotId]),
            blendSpace,
            colorSpace,
            isBiasHandlesVisible,
            emit: emitChange,
            editAction,
            setSelectedIds,
            setBiasHandlesVisible: setIsBiasHandlesVisible,
            copy: handleCopy,
            paste: handlePaste,
        });
        // the Interpolation section, then whatever the host's own trim leaves
        const interp: ContextMenuItem[] = [];
        let inSection = false;
        for (const it of full) {
            if (it.isHeader) {
                inSection = /^Interpolation/.test(it.label ?? '');
                if (inSection) interp.push(it);
                continue;
            }
            if (inSection) interp.push(it);
        }
        const rest = onlySections(full).filter((it) => !interp.includes(it));
        openContextMenu(e.clientX, e.clientY, [...interp, ...rest], [helpId || 'ui.gradient_editor']);
    };

    const handlePresetsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPresetMenu({ x: rect.left, y: rect.bottom + 5 });
    };
    
    const handleWrapperContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    return (
        <div 
            className={`w-full select-none rounded ${chrome === 'strip' ? '' : 'bg-surface-raised'}`}
            ref={containerRef}
            data-help-id={helpId || "ui.gradient_editor"}
            onContextMenu={handleWrapperContextMenu}
            onMouseDown={(e) => {
                if (e.button !== 0) return; 
                if (!(e.target as HTMLElement).closest('.gradient-interactive-element')) {
                    if (!e.shiftKey && !e.ctrlKey && !knotTrackRef.current?.contains(e.target as Node)) {
                         setSelectedIds(new Set<string>());
                    }
                    if (!knotTrackRef.current?.contains(e.target as Node)) {
                        startDrag('marquee', [] as string[], e);
                    }
                }
            }}
        >
            {chrome === 'full' && (
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center cursor-pointer text-[10px] font-semibold text-fg-muted hover:text-fg gradient-interactive-element"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <span className={`transform transition-transform duration-200 text-base ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                    </div>

                    {/* Blend space indicator */}
                    <div
                        className={`text-[8px] font-bold cursor-pointer transition-colors select-none ${blendSpace === 'oklab' ? 'text-fg-faint hover:text-accent-400' : 'text-accent-400 hover:text-accent-300'}`}
                        onClick={cycleBlendSpace}
                        title="Click to switch Blend Mode (RGB → HSV → HSV Far → Oklab)"
                    >
                        {blendSpace === 'rgb' ? 'RGB' : blendSpace === 'hsv' ? 'HSV' : blendSpace === 'hsv-far' ? 'HSV Far' : 'Oklab'}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Output color space indicator */}
                    <div
                        className="text-[8px] font-bold text-fg-faint cursor-pointer hover:text-accent-400 transition-colors select-none"
                        onClick={cycleColorSpace}
                        title="Click to switch Output Color Profile"
                    >
                        {colorSpace === 'srgb' ? 'sRGB' : colorSpace === 'linear' ? 'Linear' : 'ACES'}
                    </div>

                    {/* Host-injected header entrance (app-gmt / explorer mount the
                        Favients saved-gradients shelf button here; engine-core renders
                        whatever the host registered, or nothing). */}
                    {entrance && entrance.render({ config: currentConfig, featureId, paramKey })}

                    {/* Utility menu (clipboard) */}
                    <button
                        className="gradient-interactive-element flex items-center px-1.5 py-0.5 rounded border border-line/10 hover:border-line/25 hover:bg-line/10 text-fg-dim hover:text-fg text-[9px] font-medium transition-colors active:scale-95"
                        onClick={handlePresetsClick}
                        title="Menu"
                    >
                        <MenuIcon />
                    </button>
                </div>
            </div>
            )}
            {presetMenu && (
                <PresetMenu
                    x={presetMenu.x}
                    y={presetMenu.y}
                    onClose={() => setPresetMenu(null)}
                    options={buildMenuItems()}
                />
            )}

            {/* The 8 px gutters either side of the strip exist so an end knot has somewhere
                to sit. In 'strip' chrome they are painted with the ramp's two end colours so
                the gradient does not look as if it stops short (owner, 2026-09-07); the
                strip itself has no border there — the v2 hero draws it borderless. 'full'
                chrome (GMT main) is unchanged. */}
            <div
                className={`relative px-2 ${chrome === 'strip' ? `${stripCorners === 'bottom' ? 'rounded-b-[10px]' : 'rounded-[10px]'} overflow-hidden` : ''}`}
                style={chrome === 'strip' ? {
                    backgroundImage: `linear-gradient(to right, rgb(${previewRamp[0].r} ${previewRamp[0].g} ${previewRamp[0].b}) 50%, rgb(${previewRamp[255].r} ${previewRamp[255].g} ${previewRamp[255].b}) 50%)`,
                    backgroundSize: `100% ${stripHeight}px`,
                    backgroundRepeat: 'no-repeat',
                } : undefined}
                onContextMenu={openTrackContextMenu}
            >
                <div
                    className={`w-full relative mb-0 overflow-hidden group/strip ${onStripClick || chrome !== 'strip' ? 'cursor-pointer' : 'cursor-default'} ${chrome === 'strip' ? '' : 'rounded-t border border-line/20'}`}
                    style={{ height: stripHeight }}
                    onDoubleClick={(e) => { e.preventDefault(); setSelectedIds(new Set(knots.map(k => k.id))); }}
                    onClick={onStripClick ? (e) => { if (!(e.target as HTMLElement).closest('.bias-handle')) onStripClick(); } : undefined}
                    onMouseEnter={chrome === 'strip' ? () => setStripHover(true) : undefined}
                    onMouseLeave={chrome === 'strip' ? () => setStripHover(false) : undefined}
                    title={onStripClick ? stripTitle : 'Double-click to select all'}
                    data-gx-result-half={onStripClick ? 'bake' : undefined}
                >
                     {stripHint}
                     {/* Exact 256-ramp preview (engine sampler) — pointer-events-none so
                         the strip's double-click + bias handles still receive events. */}
                     <canvas
                        ref={previewCanvasRef}
                        width={chrome === 'strip' ? STRIP_PREVIEW_W : 256}
                        height={1}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                     />
                     {showBias && [...knots].sort((a, b) => a.position - b.position).map((k, i, arr) => {
                        if (i >= arr.length - 1 || arr[i+1].position - k.position < 0.02 || k.interpolation === 'step') return null;
                        
                        const visualPos = k.position + (arr[i+1].position - k.position) * k.bias;
                        
                        return (
                            <div 
                                key={`bias-${k.id}`} 
                                className="bias-handle gradient-interactive-element absolute top-1/2 -translate-y-1/2 w-3 h-3 transform -translate-x-1/2 cursor-ew-resize z-10" 
                                style={{ left: `${visualPos * 100}%` }} 
                                onMouseDown={(e) => {
                                    if(e.button === 0) startDrag('bias', [k.id], e);
                                }}
                            >
                                <BiasIcon />
                            </div>
                        );
                    })}
                </div>

                <div 
                    ref={knotTrackRef} 
                    className={`h-6 w-full bg-line/5 relative cursor-crosshair ${chrome === 'strip' ? '' : 'border-x border-b border-line/10 rounded-b'}`}
                    onMouseDown={handleTrackMouseDown} 
                    title="Click & drag to add/move knot"
                    onDragOver={(e) => {
                        if (!isColorDrag(e.dataTransfer)) return;
                        // preventDefault is what makes this a legal drop target at all;
                        // stopPropagation keeps the hero's own drop zone (which projects a
                        // drop anywhere on the gradient down onto this track — §8b item 1)
                        // from ALSO handling it and inserting the colour twice.
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'copy';
                        const r = e.currentTarget.getBoundingClientRect();
                        setColourDropAt(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
                    }}
                    onDragLeave={(e) => {
                        // ignore the leaves fired as the pointer crosses child knots
                        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                        setColourDropAt(null);
                    }}
                    onDrop={(e) => {
                        const hex = readColorDrag(e.dataTransfer);
                        setColourDropAt(null);
                        if (!hex) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        dropColourAt(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), hex);
                    }}
                    data-gx-colour-drop={colourDropAt !== null ? '' : undefined}
                >
                    {/* Where a NEW knot would go, when the colour is not over an existing one. */}
                    {colourDropAt !== null && !knots.some((k) => Math.abs(k.position - colourDropAt) <= 0.02) && (
                        <div
                            className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-accent-300 z-30 pointer-events-none"
                            style={{ left: `${colourDropAt * 100}%` }}
                            data-gx-colour-drop-new
                        />
                    )}
                    {knots.map(knot => (
                        <div 
                            key={knot.id} 
                            className={`gradient-interactive-element absolute top-0 w-4 h-5 -ml-2 cursor-grab active:cursor-grabbing z-20 flex flex-col items-center group transition-opacity duration-200 ${isDragRemoving && selectedIds.has(knot.id) ? 'opacity-30' : 'opacity-100'}`} 
                            style={{ left: `${knot.position * 100}%` }} 
                            onContextMenu={(e) => openKnotContextMenu(e, knot.id)}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const isRightClick = e.button === 2;

                                // Ctrl+drag: duplicate the knot
                                if (e.ctrlKey && !isRightClick) {
                                    editStart();
                                    const dupeId = `${Date.now()}_dup`;
                                    const dupe: AdvancedGradientKnot = { ...knot, id: dupeId };
                                    const newKnots = [...knots, dupe].sort((a, b) => a.position - b.position);
                                    setKnots(newKnots);
                                    setSelectedIds(new Set([dupeId]));
                                    emitChange(newKnots);
                                    startDrag('knot', [dupeId], e, newKnots, true);
                                    return;
                                }

                                let newSel = new Set(selectedIds);
                                if (e.shiftKey) {
                                    if (selectedIds.has(knot.id)) newSel.delete(knot.id);
                                    else newSel.add(knot.id);
                                } else {
                                    if (!selectedIds.has(knot.id) || !isRightClick) {
                                        newSel = new Set([knot.id]);
                                    }
                                }
                                setSelectedIds(newSel);
                                if (!isRightClick) {
                                    startDrag('knot', Array.from(newSel) as string[], e);
                                }
                            }}
                        >
                            <KnotIcon color={knot.color} isSelected={selectedIds.has(knot.id)} interpolation={knot.interpolation} />
                            {/* "this one will take it" — a dashed ring on every knot while a
                                colour is in flight, brighter on the one under the pointer */}
                            {colourDropAt !== null && (
                                <span
                                    aria-hidden
                                    className={`absolute -inset-x-1 -top-1 bottom-0 rounded border-2 border-dashed pointer-events-none ${
                                        Math.abs(knot.position - colourDropAt) <= 0.02 ? 'border-accent-300' : 'border-accent-300/40'
                                    }`}
                                    data-gx-colour-drop-knot
                                />
                            )}
                        </div>
                    ))}

                    {selectionRange && (
                        <>
                            {/* Selection background — solid fill behind handles, dashed bottom for drag affordance */}
                            <div
                                className="gradient-interactive-element absolute top-0 z-[5] cursor-move bg-accent-400/10 border-b-[2px] border-dashed border-accent-400/40"
                                style={{ left: `calc(${selectionRange.min * 100}% - 8px)`, width: `calc(${(selectionRange.max - selectionRange.min) * 100}% + 16px)`, bottom: '-6px' }}
                                onMouseDown={(e) => {
                                    if (e.button !== 0) return;
                                    // Ctrl+drag: duplicate selected knots then drag copies
                                    if (e.ctrlKey) {
                                        e.stopPropagation();
                                        editStart();
                                        const dupeMap = new Map<string, string>();
                                        const dupes: AdvancedGradientKnot[] = [];
                                        knots.filter(k => selectedIds.has(k.id)).forEach((k, i) => {
                                            const dupeId = `${Date.now()}_dup${i}`;
                                            dupeMap.set(k.id, dupeId);
                                            dupes.push({ ...k, id: dupeId });
                                        });
                                        const newKnots = [...knots, ...dupes].sort((a, b) => a.position - b.position);
                                        const dupeIds = [...dupeMap.values()];
                                        setKnots(newKnots);
                                        setSelectedIds(new Set(dupeIds));
                                        emitChange(newKnots);
                                        startDrag('bracket_move', dupeIds, e, newKnots, true);
                                        return;
                                    }
                                    startDrag('bracket_move', Array.from(selectedIds) as string[], e);
                                }}
                            />
                            {/* Left bracket [ */}
                            <div
                                className="gradient-interactive-element absolute top-0 w-[16px] z-30 cursor-ew-resize group"
                                style={{ left: `calc(${selectionRange.min * 100}% - 18px)`, bottom: '-6px' }}
                                onMouseDown={(e) => { e.stopPropagation(); if(e.button===0) startDrag('bracket_scale_left', Array.from(selectedIds) as string[], e); }}
                            >
                                <svg width="16" height="100%" viewBox="0 0 16 30" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                                    <path d="M 14 1.5 L 4 1.5 L 4 28.5 L 14 28.5" fill="none" stroke="rgb(34 211 238)" strokeWidth="2.5" strokeLinecap="round" className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                </svg>
                            </div>
                            {/* Right bracket ] */}
                            <div
                                className="gradient-interactive-element absolute top-0 w-[16px] z-30 cursor-ew-resize group"
                                style={{ left: `calc(${selectionRange.max * 100}% + 2px)`, bottom: '-6px' }}
                                onMouseDown={(e) => { e.stopPropagation(); if(e.button===0) startDrag('bracket_scale_right', Array.from(selectedIds) as string[], e); }}
                            >
                                <svg width="16" height="100%" viewBox="0 0 16 30" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                                    <path d="M 2 1.5 L 12 1.5 L 12 28.5 L 2 28.5" fill="none" stroke="rgb(34 211 238)" strokeWidth="2.5" strokeLinecap="round" className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                </svg>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isExpanded && chrome === 'strip' && (() => {
                const meta = (
                    <div className="flex items-center gap-2 text-[10px] text-fg-dim">
                        <span>blend</span>
                        <button className="font-bold text-fg-muted hover:text-accent-300" onClick={cycleBlendSpace} title="Blend space (RGB → HSV → HSV Far → Oklab)">
                            {blendSpace === 'rgb' ? 'RGB' : blendSpace === 'hsv' ? 'HSV' : blendSpace === 'hsv-far' ? 'HSV Far' : 'Oklab'}
                        </button>
                        {/* the output profile is an EXPORT concern in v2 — it lives in the
                            Export window when the host hosts the inspector (C.15, owner) */}
                        {!inspectorHost && (
                            <>
                                <span>output</span>
                                <button className="font-bold text-fg-muted hover:text-accent-300" onClick={cycleColorSpace} title="Output colour profile">
                                    {colorSpace === 'srgb' ? 'sRGB' : colorSpace === 'linear' ? 'Linear' : 'ACES'}
                                </button>
                            </>
                        )}
                        <button
                            className="flex items-center px-1.5 py-0.5 rounded border border-line/10 hover:border-line/25 hover:bg-line/10 text-fg-dim hover:text-fg font-medium transition-colors"
                            onClick={handlePresetsClick}
                            title={inspectorHost ? 'Stops menu — invert, double, distribute, delete · bias handles, reset' : 'Stops menu — copy, paste, reverse, distribute, interpolation…'}
                        >
                            <MenuIcon />
                        </button>
                    </div>
                );
                // The knot's fields on their own, for the v2 picker's 'stop' mode. Same
                // controls as the studio's side column below, without its collapsing divider.
                const stopFields = selectedNodes.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <Dropdown
                            size="md"
                            fullWidth
                            label="Interpolation"
                            value={commonInterpolation}
                            onChange={(v) => handleMultiPropertyChange('interpolation', v as InterpolationMode)}
                            options={[
                                ...(commonInterpolation === 'mixed' ? [{ label: 'Mixed', value: 'mixed' }] : []),
                                { label: 'Linear', value: 'linear' },
                                { label: 'Step', value: 'step' },
                                { label: 'Smooth', value: 'smooth' },
                            ]}
                        />
                        {selectedNodes.length === 1 && (
                            <Slider dense label="Position" value={selectedNodes[0].position * 100} min={0} max={100} step={0.1} onChange={(val) => handleSliderPropertyChange('position', val / 100)} />
                        )}
                        <Slider
                            dense
                            label="Bias"
                            value={commonBias === -1 ? 50 : commonBias * 100}
                            min={0} max={100} step={1}
                            onChange={(val) => handleSliderPropertyChange('bias', val / 100)}
                            overrideInputText={commonBias === -1 ? 'Mixed' : undefined}
                        />
                    </div>
                );
                const stopColumn = selectedNodes.length > 0 && (
                    <div className="flex items-stretch gap-2 self-stretch">
                        {/* the divider that collapses the stop column */}
                        <button
                            type="button"
                            className="flex flex-col items-center gap-1.5 w-4 shrink-0 text-fg-muted hover:text-fg"
                            onClick={() => setStopColumnOpen((o) => !o)}
                            title={stopColumnOpen ? 'Hide position, bias and interpolation' : 'Show position, bias and interpolation'}
                        >
                            <span className="flex-1 w-px bg-line/20" />
                            <span className="w-4 h-4 rounded-full border border-line/20 bg-surface-section flex items-center justify-center">
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={stopColumnOpen ? 'M10 4l-4 4 4 4' : 'M6 4l4 4-4 4'} /></svg>
                            </span>
                            <span className="flex-1 w-px bg-line/20" />
                        </button>
                        {stopColumnOpen ? (
                            <div className="w-[220px] shrink-0 flex flex-col gap-1">
                                <Dropdown
                                    label="Interpolation"
                                    value={commonInterpolation}
                                    onChange={(v) => handleMultiPropertyChange('interpolation', v as InterpolationMode)}
                                    options={[
                                        ...(commonInterpolation === 'mixed' ? [{ label: 'Mixed', value: 'mixed' }] : []),
                                        { label: 'Linear', value: 'linear' },
                                        { label: 'Step', value: 'step' },
                                        { label: 'Smooth', value: 'smooth' }
                                    ]}
                                />
                                {selectedNodes.length === 1 && (
                                    <Slider label="Position" value={selectedNodes[0].position * 100} min={0} max={100} step={0.1} onChange={(val) => handleSliderPropertyChange('position', val / 100)} />
                                )}
                                <Slider
                                    label="Bias (Midpoint)"
                                    value={commonBias === -1 ? 50 : commonBias * 100}
                                    min={0} max={100} step={1}
                                    onChange={(val) => handleSliderPropertyChange('bias', val / 100)}
                                    overrideInputText={commonBias === -1 ? 'Mixed' : undefined}
                                />
                            </div>
                        ) : (
                            <div className="w-[18px] shrink-0 flex items-center justify-center">
                                <span className="text-[11px] uppercase tracking-wide text-fg-muted" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>position · bias · interpolation</span>
                            </div>
                        )}
                    </div>
                );
                if (inspectorHost) {
                    // v2 tray: the strip row keeps the host aside + meta in one line; the
                    // inspector (picker + stop column) is portalled into the tray face.
                    return (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-2 gradient-interactive-element">
                                {stripAside}
                                {/* blend · output · menu sit at the row's right (owner, C.15) */}
                                <div className="ml-auto flex items-center">{meta}</div>
                            </div>
                            {selectedNodes.length > 0 && createPortal(
                                <div className="gradient-interactive-element">
                                    {/* The knot's own controls are a picker MODE here, not a column
                                        of their own: the owner asked for them on the left, on a
                                        switch like everything else (2026-09-08). */}
                                    <EmbeddedColorPicker
                                        color={commonColor}
                                        onColorChange={handleColorChange}
                                        palette={pickerPalette}
                                        stopBlock={stopFields}
                                        onChannelAdjust={selectedNodes.length > 1 ? adjustChannel : undefined}
                                    />
                                </div>,
                                inspectorHost,
                            )}
                        </>
                    );
                }
                return (
                    <div className={`flex gap-3 mt-1.5 px-2 gradient-interactive-element ${selectedNodes.length > 0 ? 'items-start' : 'items-center'}`}>
                        {/* Left: the host aside (v2: Curves / Adjust) + blend / output / menu. With a
                            selection they stack down the left of the picker; without one they lie in
                            a single line — no bar behind them either way. */}
                        <div className={`flex gap-1.5 ${selectedNodes.length > 0 ? 'flex-col items-start w-[160px] shrink-0 pt-1' : 'flex-row flex-wrap items-center flex-1'}`}>
                            {stripAside}
                            {meta}
                        </div>
                        {selectedNodes.length > 0 && (
                            <div className="flex-1 min-w-0">
                                <EmbeddedColorPicker color={commonColor} onColorChange={handleColorChange} palette={pickerPalette} />
                            </div>
                        )}
                    </div>
                );
            })()}
            {isExpanded && chrome === 'full' && (
                <div className="flex flex-col gradient-interactive-element overflow-hidden">
                    {selectedNodes.length > 0 ? (
                        <>
                             <div className="mb-px mt-2">
                                <EmbeddedColorPicker color={commonColor} onColorChange={handleColorChange} palette={pickerPalette} />
                             </div>

                             <div className="flex flex-col">
                                 <Dropdown
                                    label="Interpolation"
                                    value={commonInterpolation}
                                    onChange={(v) => handleMultiPropertyChange('interpolation', v as InterpolationMode)}
                                    options={[
                                        ...(commonInterpolation === 'mixed' ? [{ label: 'Mixed', value: 'mixed' }] : []),
                                        { label: 'Linear', value: 'linear' },
                                        { label: 'Step', value: 'step' },
                                        { label: 'Smooth', value: 'smooth' }
                                    ]}
                                    className="mb-px"
                                 />

                                 {selectedNodes.length === 1 && (
                                     <Slider
                                        label="Position"
                                        value={selectedNodes[0].position * 100}
                                        min={0} max={100} step={0.1}
                                        onChange={(val) => handleSliderPropertyChange('position', val / 100)}
                                    />
                                 )}

                                 <Slider
                                    label="Bias (Midpoint)"
                                    value={commonBias === -1 ? 50 : commonBias * 100}
                                    min={0} max={100} step={1}
                                    onChange={(val) => handleSliderPropertyChange('bias', val / 100)}
                                    overrideInputText={commonBias === -1 ? "Mixed" : undefined}
                                 />
                             </div>
                        </>
                    ) : (
                        <div className="h-1 bg-line/5 opacity-50 mt-1" />
                    )}
                </div>
            )}

            {marqueeRect && createPortal(<div className="fixed border border-info bg-info/20 pointer-events-none" style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.w, height: marqueeRect.h, zIndex: z('tooltip') }} />, document.body)}
        </div>
    );
});
AdvancedGradientEditor.displayName = 'AdvancedGradientEditor';

export default AdvancedGradientEditor;
