
/**
 * AdvancedGradientEditor — the stops editor, shared by three hosts: app-gmt's DDFS gradient
 * param (`chrome="full"`), the palette suite's generator panel, and the Gradient Explorer
 * v2 hero (`chrome="strip"`). It owns the strip, the knot track, the bias handles, the
 * selection brackets and the marquee; undo is the host's, through the bracket contract on
 * `AdvancedGradientEditorProps` (interface (d)).
 *
 * Touch (Phase F, 2026-09-10). Every drag runs on POINTER events — `onPointerDown` plus
 * window `pointermove` / `pointerup` / `pointercancel` — so a finger moves knots, bias
 * handles, brackets and the marquee down the same path a left mouse button always did, and
 * the surfaces that host a drag (the strip, the knot track, the knots, the brackets)
 * declare `touch-action: none` so the browser cannot take the gesture for a scroll. Two
 * details are load-bearing and easy to undo by accident:
 *   • the default is cancelled on the compatibility `mousedown`, NOT on the `pointerdown` —
 *     cancelling a pointerdown suppresses the rest of the gesture's mouse events, which the
 *     v2 hero's marquee-escape handoff and every close-on-outside-press listener still need.
 *     See `startDrag`, which carries the measurement.
 *   • `showBias` treats SELECTION as hover on a coarse pointer, because a finger never
 *     hovers and the strip chrome gates the handles on hover.
 * Guard: `npm run smoke:ge-phone` step [7] — a CDP touch drag on `[data-gx-knot]` must move
 * a stop in `window.__gxWorking().config.stops`; it is red against the pre-conversion file.
 * The desktop path is guarded by `npm run smoke:ge-hero` and `npm run smoke:ge-tray`, which
 * drive this editor with a real mouse.
 *
 * RAMP MODE (ADR-0122, 2026-09-14). When the VALUE is a ramp gradient (`stops: []` + `ramp`) the
 * editor is a view of 256 texels with one way in: the bar paints the ramp, there are no knots, no
 * knot-track insertion, no selection marquee, no colour drop, no keyboard nudges, no clipboard,
 * no blend chooser (it is inert on a ramp), and an "Add stops" button sits where the blend chooser
 * was (full chrome: the header; strip chrome: the blend · output · menu row) and at the head of
 * the menu's Actions. A marquee begun on the bar still runs when the host set `marqueeEscape` —
 * it draws nothing and selects nothing, but GE v2's escape into a whole-gradient drag keeps
 * working on a ramp. Every rule is a pure function in `components/gradient/rampMode.ts`; this
 * file adds only the JSX. A stop value renders and behaves exactly as before.
 * Add stops runs the host's `onAddStops` when given; otherwise the `gradientStopFitter` slot
 * (filled by `registerPaletteUI`) is emitted through `onChange` inside `editAction`, so
 * app-gmt's DDFS param gets it as one param-undo step with no host wiring.
 * Guard: `npm run test:gradient-rampmode` (the rules + a text pin on this file's gates).
 *
 * REDUCE STOPS… (2026-09-23; a stop-count axis since 2026-09-24, ADR-0128). With a reducer in the
 * `gradientStopReducer` slot (every host that mounts the palette suite), the menu offers "Reduce
 * Stops…" and this editor opens `ReduceStopsPopup` where the menu was. The reducer's PLANS are
 * pulled ONE `next()` PER MACROTASK (`reducePull`), so a long gradient and the blend-mode search
 * never block a frame; "Try other blend modes" is remembered here (`REDUCE_SEARCH_KEY`, on unless
 * turned off) and a change restarts the pull. While a count is hovered or chosen, the bar paints its stops (`editorBarSource`'s `stopsPreview`,
 * which outranks every host preview) and the knot track shows ITS knots, inert; the real knots,
 * the bias handles and every knot gesture stand down (`previewing` counts as stale). Apply is
 * `editAction(() => emitChange(...))` — the same one undo step Invert is, on whatever history the
 * host brackets; Cancel / Escape / the ☰ commit nothing. Offered only while the knots ARE what
 * the bar shows (`reduceBlocked`), and closed if the value stops being a reducible stop gradient.
 * No host wiring: app-gmt gets it through the same menu. Strip chrome also shows the quiet
 * "N stops" count beside the blend chooser (`data-gx-stop-count`), where a ramp shows Add stops.
 * Guard: `npx tsx debug/smoke-ge-reduce.mts` (→ `npm run smoke:ge-reduce`; the popup, a real mouse
 * and a phone) and `npx tsx debug/test-palette-reducestops.mts` [5] (the menu item's gating).
 */

import React, { useState, useRef, useEffect, useMemo, useCallback, useSyncExternalStore, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import type { GradientStop, GradientConfig, ColorSpaceMode, BlendColorSpace } from '../types';
import type { ContextMenuItem } from '../types/help';
import { isColorDrag, readColorDrag } from './gradient/colorDrag';
import { BlendSpacePicker, COARSE_POINTER } from './gradient/BlendSpacePicker';
import { rgbToHex, nudgeChannel, sampleStops, type RGB } from '../utils/colorUtils';
import {
    rampOfEditorValue,
    editorAffordances,
    editorEmitConfig,
    editorBarSource,
    paintStripPixels,
    barTexels256,
} from './gradient/rampMode';
import { getGradientStopFitter, subscribeGradientStopFitter } from './gradient/gradientStopFitter';
import { getGradientStopReducer, subscribeGradientStopReducer, type GradientReducePlan } from './gradient/gradientStopReducer';
import { safeLocalGet, safeLocalSet } from '../store/safeLocalStorage';
import { ReduceStopsPopup } from './gradient/ReduceStopsPopup';

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
/** Reduce stops' "Try other blend modes" — on unless it was turned off ('0'), per browser. */
const REDUCE_SEARCH_KEY = 'gmt.gradient.reduceSearchBlend';

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
    /** The pointer that started it. A second finger's moves are not this drag's (Phase F). */
    pointerId: number;
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
    /**
     * 'strip' chrome: paint the bar from THIS 256-texel ramp, in preference to any stops.
     *
     * It is the pipeline's OUTPUT, and it is what the bar should show whenever the pipeline is
     * doing anything: the stops route goes ramp → fit → stops → resample, and the fit is both
     * the expensive step and an approximation. Worse, the fit is HELD during a drag (ADR-0117),
     * so painting through it showed the held stop POSITIONS carrying live colours — "a weird
     * mix of the previous stops and the current colors" (owner, 2026-09-11), which a curve edit
     * makes obvious because a curve moves features along the ramp rather than merely retinting
     * them. Painting the ramp skips the round trip entirely and is exact by construction.
     *
     * The knots are unaffected: they keep describing the stops document, and hide themselves
     * when that is no longer what the bar shows (`knotsStale`).
     */
    previewRamp?: RGB[];
    /** 'strip' chrome: the host is giving the portalled inspector picker REAL vertical room
     *  (the v2 tray on a phone), so a narrow mount opens instead of starting folded. Passed
     *  straight through — @see EmbeddedColorPicker's `roomy`. */
    pickerRoomy?: boolean;
    /** 'strip' chrome: a single click on the bar (not on a bias handle) — the v2 hero's
     *  BAKE gesture while a face is open (C.9). Absent = the bar takes no single click. */
    onStripClick?: () => void;
    /** 'strip' chrome: the bar's tooltip while onStripClick is set. */
    stripTitle?: string;
    /** 'strip' chrome: an element rendered inside the bar (the hero's instant hover hint);
     *  the bar carries the `group/strip` class for it. */
    stripHint?: React.ReactNode;
    /**
     * How far a SELECTION MARQUEE may travel past the knot track before the host takes the
     * gesture over (px, every side). Beyond it the marquee suspends — it stops drawing and
     * stops selecting — and `onMarqueeEscape(true)` fires; come back inside and it resumes
     * with `onMarqueeEscape(false)`. That is what lets GE v2's hero turn a marquee that has
     * wandered off the ramp into a drag of the whole gradient, and turn it back again.
     *
     * Default `Infinity`: no escape, the marquee behaves exactly as it always has.
     */
    marqueeEscape?: number;
    /** Fired when a marquee crosses `marqueeEscape` in either direction, with the pointer. */
    onMarqueeEscape?: (escaped: boolean, e: MouseEvent) => void;
    /**
     * RAMP MODE's "Add stops" (ADR-0122): the host's own conversion of the ramp value into a stop
     * gradient, for a host whose document is not simply `value` (GE v2's hero folds its pipeline;
     * the old shell's Stops mode fits at the generator's Detail). It must bracket its own undo.
     * Omitted: the editor uses the `gradientStopFitter` slot and emits the result through
     * `onChange` inside `edit` — see components/gradient/gradientStopFitter.ts.
     */
    onAddStops?: () => void;
    /**
     * Host items that LEAD the menu — above the editor's own sections, in the ☰ dropdown and the
     * bar's right-click alike (the two mirror each other), and outside the section trim a hosted
     * inspector applies. For an action on the whole DOCUMENT that the host owns: GE v2's hero puts
     * New Gradient here (2026-09-23). A knot's own right-click menu does not carry them. Omitted:
     * the menu is exactly the editor's.
     */
    menuLead?: ContextMenuItem[];
    /**
     * 'strip' chrome: a host TOOL takes the bar and the knot track over — GE v2's Paint face,
     * whose brush paints on the bar (owner, 2026-09-24: "paint straight onto the hero instead of
     * there being stops"). While it is set the knots, bias handles, selection brackets, the
     * marquee, the bar's double-click and single click, colour drops and the ramp-mode label all
     * stand down (through `editorAffordances`' `takenOver`); `bar` is laid over the bar AND its 8 px
     * end gutters (the gutters' end colours are not painted — the host paints them, so a painted
     * end shows), above the preview canvas, which keeps drawing under it; `track` fills the knot
     * track's row. Everything else — the tab row, the menu, the
     * blend chooser — is unchanged. Absent = the editor exactly as it was.
     * Guard: `npm run smoke:ge-paint` [1] (the brush holds the bar, no knots) — ignoring the prop
     * reds it (S5 in that smoke's header).
     */
    stripTakeover?: { bar: React.ReactNode; track?: React.ReactNode };
}

/**
 * CURSORS, one scheme across the whole editor (owner's walk, 2026-09-08). A cursor is a
 * promise about the next click, so each shape means exactly one thing here:
 *
 *   crosshair    SELECT — drag a marquee across the knots. It is the bar's cursor, because
 *                the bar is the marquee's surface (the container's `pointerdown` starts one
 *                for any press that is not on an interactive child or the knot track).
 *   copy         MAKE — press here and a knot appears. The knot track's cursor, and nothing
 *                else's.
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
 *
 * `crosshair` and `copy` were ONE cursor until 2026-09-11, and the owner named the cost:
 * "the main bar … its drag makes a selection of the knots — thats why its confusing that the
 * bottom strip has the selection crosshair, when the bottom strip of the hero creates a new
 * knot". Two gestures wearing one cursor, and the surface that actually had the selection
 * wore no cursor at all. They are separate now, and each sits on the element that performs it.
 *
 * @see docs/adr/0118-a-surface-says-what-it-does.md
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
    /** The selected knot ids as of the last render (the v2 hero puts them on its undo entries —
     *  gradient-explorer/v2/uiHistory.ts `useStopSelectionHistory`). */
    getSelection: () => string[];
    /** Select exactly `ids` — the ones the CURRENT value has (a ramp has none); returns how many
     *  that was. For an undo that brings a selection back: call it after the editor has taken the
     *  restored value (from the host's effect, which runs after this component's), because a value
     *  from another lineage clears the selection when it arrives (grep `lineageRef`). */
    restoreSelection: (ids: readonly string[]) => number;
}

const knotsEqual = (a: AdvancedGradientKnot[], b: AdvancedGradientKnot[]): boolean =>
    a.length === b.length && a.every((k, i) =>
        k.id === b[i].id && k.position === b[i].position && k.color === b[i].color && k.bias === b[i].bias && k.interpolation === b[i].interpolation
    );

/** A knot list as one number (FNV-1a over every field `knotsEqual` compares, masked to 30
 *  bits so it stays a small integer). Only ever compared with other keys from this file. */
const knotsKey = (ks: readonly AdvancedGradientKnot[]): number => {
    let h = 0x811c9dc5;
    for (const k of ks) {
        const s = `${k.id}|${k.position}|${k.color}|${k.bias}|${k.interpolation};`;
        for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    }
    return h & 0x3fffffff;
};

/** How many knot lists one gradient's lineage remembers (see `lineageRef`). A drag emits one
 *  per pointer move, so this bounds a long session on one gradient; the list the gradient
 *  ARRIVED as is never the one dropped. */
const LINEAGE_CAP = 4096;

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

const AdvancedGradientEditor = React.forwardRef<AdvancedGradientEditorHandle, AdvancedGradientEditorProps>(({ value, onChange, helpId, onEditStart, onEditEnd, edit, featureId, paramKey, chrome = 'full', stripHeight = 32, pickerPalette, stripAside, inspectorHost, onSelectionChange, stripCorners = 'all', pickerRoomy, previewRamp, onStripClick, stripTitle, stripHint, previewConfig, marqueeEscape = Infinity, onMarqueeEscape, onAddStops, menuLead, stripTakeover }, ref) => {
    // --- PARSE POLYMORPHIC INPUT ---
    // Extract Stops and ColorSpace from input. Default to sRGB if legacy array.
    const { stops, colorSpace, blendSpace } = useMemo(() => {
        if (Array.isArray(value)) {
            return { stops: value, colorSpace: 'srgb' as ColorSpaceMode, blendSpace: 'oklab' as BlendColorSpace };
        } else {
            return { stops: value.stops, colorSpace: value.colorSpace, blendSpace: value.blendSpace || 'oklab' as BlendColorSpace };
        }
    }, [value]);
    /** The value as a RAMP gradient (ADR-0122), or null for a stop gradient — the mode switch.
     *  Read through a ref by callbacks that outlive a render (emitChange, the handle, drags). */
    const rampValue = useMemo(() => rampOfEditorValue(value), [value]);
    const isRamp = rampValue !== null;
    const rampValueRef = useRef(rampValue);
    rampValueRef.current = rampValue;

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

    /**
     * WHICH GRADIENT A SELECTION BELONGS TO (GE v2 plan §8b item 9, "Noticed, not fixed";
     * built 2026-09-16). The ids are no help: every fitted gradient numbers its stops `s0…sN`,
     * so after a swap the selected id usually still exists — on a DIFFERENT gradient — and the
     * v2 hero kept its inspector open over it (reproduced: pick A, pick B, select a stop,
     * Ctrl+Z back to A).
     *
     * So the editor remembers the knot lists of the gradient on screen (`knotsKey`): the one it
     * arrived as, every list it emitted, and every value that flowed back. An incoming value in
     * that set is this gradient again — an echo, or an undo / redo of an edit made here — and
     * the selection stays, minus any id the value no longer has (an undone insert). A value
     * outside it is a gradient this editor never showed since the last one arrived: the set
     * starts over from it and the selection is cleared. Nothing else clears it here, so a knot
     * drag and the editor's own emits never do.
     *
     * Guard: `npm run smoke:ge-tray` step [17].
     */
    const lineageRef = useRef<Set<number>>(new Set());
    const noteLineage = useCallback((key: number) => {
        const seen = lineageRef.current;
        if (seen.has(key)) return;
        if (seen.size >= LINEAGE_CAP) {
            const it = seen.values();
            it.next(); // the arrival stays
            const next = it.next();
            if (!next.done) seen.delete(next.value);
        }
        seen.add(key);
    }, []);

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
        const incoming: AdvancedGradientKnot[] = stops.map(stop => ({
            id: stop.id,
            position: stop.position,
            color: stop.color,
            bias: stop.bias ?? 0.5,
            interpolation: (stop.interpolation as InterpolationMode) ?? 'linear'
        })).sort((a, b) => a.position - b.position);
        const key = knotsKey(incoming);
        if (justEmittedRef.current) {
            justEmittedRef.current = false;
            // the echo of an emit, as the host stored it — the same gradient (see lineageRef)
            noteLineage(key);
            return;
        }
        if (lineageRef.current.has(key)) {
            // this gradient again: keep the selection, minus ids the value no longer has
            setSelectedIds((prev) => {
                if (!prev.size) return prev;
                const live = new Set(incoming.filter((k) => prev.has(k.id)).map((k) => k.id));
                return live.size === prev.size ? prev : live;
            });
        } else {
            // a different gradient: a selection made on the last one means nothing here
            lineageRef.current = new Set([key]);
            setSelectedIds((prev) => (prev.size ? new Set<string>() : prev));
        }
        setKnots(prev => (knotsEqual(prev, incoming) ? prev : incoming));
    }, [stops, noteLineage]);

    const knotsRef = useRef(knots);
    useEffect(() => { knotsRef.current = knots; }, [knots]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    // Read by the handle (`getSelection` / `restoreSelection`), which outlives a render.
    const selectedIdsRef = useRef(selectedIds);
    selectedIdsRef.current = selectedIds;
    const stopsRef = useRef(stops);
    stopsRef.current = stops;
    const [isExpandedState, setIsExpanded] = useState(true);
    // Strip chrome has no toggle: the inspector is always reachable.
    const isExpanded = chrome === 'strip' ? true : isExpandedState;
    /** Default OFF on a phone (owner, 2026-09-11: "in mobile we should hide the bias handles
     *  by default"). They are a fine-adjustment affordance drawn at mouse scale, and on a
     *  390 px bar they crowd the knots a finger is trying to hit. The ☰ menu's "Bias handles"
     *  item turns them on, so nothing becomes unreachable — and `showBias` below still gates
     *  them on a SELECTION there, so even switched on they appear only when you mean them. */
    const [isBiasHandlesVisible, setIsBiasHandlesVisible] = useState(() => !COARSE_POINTER);
    // 'strip' chrome: the bias handles show only while the pointer is over the bar (C.7,
    // owner 2026-09-07: "hero bias handles to only be visible when over the gradient").
    const [stripHover, setStripHover] = useState(false);
    /**
     * Touch (Phase F, 2026-09-10): a coarse pointer never hovers, so `stripHover` is never
     * true there and the hover gate above would hide the bias handles for good — the one
     * control on the bar a finger could never reach. On a coarse pointer SELECTION stands in
     * for hover: choose a knot and the handles appear. Read once, like the picker wall's own
     * coarse seam; a desktop mouse takes the hover path exactly as before.
     */
    const coarsePointer = useRef(
        typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(pointer: coarse)').matches,
    );
    /**
     * ARE THE KNOTS A DESCRIPTION OF WHAT THE BAR IS SHOWING? (owner, 2026-09-11: "the stops
     * should only be visible when they are current. that would reduce clutter all around and
     * make it easier to press on the gradient to bake it".)
     *
     * `previewConfig` means exactly "paint THIS on the bar instead of the edited stops" — the
     * v2 hero passes it while Adjust or Curves is live over a baked document. The knots then
     * belong to the document underneath and describe a gradient that is no longer on screen:
     * they sat still through a whole drag and stayed wrong after it, which reads as a bug and
     * was reported as one. They are also physically in the way of the click that BAKES.
     *
     * So the presence of `previewConfig` is the rule: while the bar is showing something else,
     * the knot layer goes — markers, bias handles and the track's own gestures. The track KEEPS
     * its height, because the hero must not change size when a face opens (`smoke:ge-tray` [2]
     * and [5] assert the wall never moves). Baking brings them straight back, describing the
     * thing you baked.
     */
    const knotsStale = !!previewConfig;
    // `previewRamp` alone does NOT make them stale: with a live source the knots are the fit of
    // that same ramp and describe it truly once the drag lets go. `previewConfig` is the case
    // where a baked document sits underneath something else — see its own note above.
    // RAMP MODE: what a ramp value may do (nothing knot-shaped) and whether Add stops has a way
    // to run — the host's `onAddStops`, else the palette host's fitter slot.
    const stopFitter = useSyncExternalStore(subscribeGradientStopFitter, getGradientStopFitter);
    /**
     * REDUCE STOPS (see the file header). `reduceAt` is the open popup's anchor; `reducePlan`
     * is the reducer's latest plan (null until the first); `reducePreview` is what the popup wants on the bar right
     * now. While previewing, the knots describe the gradient UNDER the candidate, not the bar —
     * exactly the `knotsStale` rule — so every knot affordance stands down with it.
     */
    const stopReducer = useSyncExternalStore(subscribeGradientStopReducer, getGradientStopReducer);
    const [reduceAt, setReduceAt] = useState<{ x: number; y: number } | null>(null);
    const [reducePlan, setReducePlan] = useState<GradientReducePlan | null>(null);
    const [reduceSearch, setReduceSearchState] = useState(() => safeLocalGet(REDUCE_SEARCH_KEY) !== '0');
    const setReduceSearch = useCallback((on: boolean) => { setReduceSearchState(on); safeLocalSet(REDUCE_SEARCH_KEY, on ? '1' : '0'); }, []);
    const [reducePreview, setReducePreview] = useState<GradientConfig | null>(null);
    const previewing = !!reducePreview;
    /** A host tool holds the bar and the track (`stripTakeover`): the knot gestures stand down
     *  through the affordances, the bar's own clicks and the gutters' paint below. */
    const taken = chrome === 'strip' && !!stripTakeover;
    const affordances = editorAffordances({ isRamp, knotsStale: knotsStale || previewing, canAddStops: !!onAddStops || !!stopFitter, takenOver: taken });
    const showBias = affordances.knots && isBiasHandlesVisible && (chrome !== 'strip' || stripHover || (coarsePointer.current && selectedIds.size > 0));
    // Entering ramp mode drops any selection left from a stop value (an undo, a pick): the
    // ids point at nothing, and a live selection keeps the host's inspector face open.
    useEffect(() => {
        if (isRamp) setSelectedIds((prev) => (prev.size ? new Set<string>() : prev));
    }, [isRamp]);
    
    const dragPayloadRef = useRef<DragPayload | null>(null);
    /**
     * THE DRAG OWNS THE CURSOR FOR ITS DURATION (owner, 2026-09-11: "during a selection drag,
     * the cursor should stay selection drag and not be changing mid drag").
     *
     * Every surface here names its own gesture — the bar selects, the track makes, a knot grabs
     * — which is right until a gesture is UNDER WAY, and then the cursor kept announcing
     * whatever the pointer happened to be passing over: a marquee begun on the bar turned into
     * `copy` the moment it crossed the knot track. `document.body.style.cursor` does not fix
     * it, because a descendant that sets its own `cursor` wins over an inherited one; the root
     * carries the cursor and forces every descendant to inherit it instead.
     */
    const [dragCursor, setDragCursor] = useState<string | null>(null);
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
    // On a ramp it is the ramp value itself — the knot array is empty, and `{ stops: [] }`
    // alone is a config of neither form (the shelf would refuse it).
    const currentConfig = useMemo<GradientConfig>(
        () => rampValue ?? ({ stops: knots, colorSpace, blendSpace }),
        [rampValue, knots, colorSpace, blendSpace],
    );

    /** Blend space under the cursor in BlendSpacePicker — preview only, never emitted. */
    const [hoverBlend, setHoverBlend] = useState<BlendColorSpace | null>(null);

    // Preview strip = the EXACT 256-step ramp (LOCKED P0c decision 2), rendered by
    // the engine canonical sampler so it matches the baked texture (no CSS-gradient
    // approximation). colorSpace is the OUTPUT-texture transform, not an authoring
    // concern — the strip shows the sRGB authoring colours (as the old CSS string
    // did), so it stays a faithful colour preview. Memoised so unrelated re-renders
    // (selection / marquee / expand) don't re-sample 256 texels.
    // WHAT THE BAR PAINTS — `editorBarSource` (components/gradient/rampMode.ts): the host's
    // `previewRamp` (strip chrome only), else a RAMP-form gradient on screen (`previewConfig` or
    // the value) as its texels, else stops (`previewConfig.stops` or the knots, as always). A ramp
    // config walked as stops painted black here before ADR-0122's ramp mode.
    // Keyed on `rampValue`, not `value`: it is null for every stop value, so a host handing a
    // fresh-but-equal stop config each render does not repaint the 1536 px strip.
    const barSource = useMemo(
        () => editorBarSource({ stopsPreview: reducePreview?.stops, previewRamp: chrome === 'strip' ? previewRamp : undefined, previewConfig, value: rampValue ?? knots, knots }),
        [chrome, previewRamp, previewConfig, rampValue, knots, reducePreview],
    );
    // Hovering a chip in BlendSpacePicker re-renders THIS strip in that mode. It takes
    // precedence over the host's previewConfig so the hover always wins visually, and it
    // never emits — leaving the row restores the committed mode.
    const previewBlend = reducePreview?.blendSpace ?? hoverBlend ?? previewConfig?.blendSpace ?? blendSpace;
    // 'strip' chrome paints from `previewWide` below and never reads a texel of this, so it
    // is not computed there: 256 oklab samples per keystroke of an Adjust dial, thrown away
    // (measured 2026-09-11). The two END colours the gutters want come from `previewWide`
    // instead — see `stripEnds`.
    // Named for its one consumer, so it cannot be confused with the `previewRamp` PROP (which
    // is strip chrome's, and is the pipeline's output rather than a render of these stops).
    const fullChromeRamp = useMemo(
        () => (chrome === 'strip' ? null : barTexels256(barSource, previewBlend)),
        [barSource, previewBlend, chrome],
    );
    // Strip chrome (the v2 hero, ~1100 px wide): the preview samples the STOPS once per
    // display pixel instead of stretching the 256-texel ramp — a bilinear scale-up softened
    // every step edge into a little gradient, and nearest would band the smooth ones
    // (owner, 2026-09-07: pixelated only where it is stepped). A RAMP (the pipeline's own
    // output, or a ramp gradient) upsamples NEAREST: 1536 / 256 is exactly 6, so every texel is
    // a clean 6 px run. Full chrome (GMT main) keeps the 256-texel canvas.
    const previewWide = useMemo(
        () => (chrome !== 'strip' ? null : paintStripPixels(STRIP_PREVIEW_W, barSource, previewBlend)),
        [barSource, previewBlend, chrome],
    );

    /** 'strip' chrome only: the ramp's two END colours, for the 8 px gutters either side.
     *  Read out of the strip buffer that is being painted anyway — they used to be
     *  `previewRamp[0]` / `[255]`, which is what kept the whole 256-texel ramp alive here. */
    const stripEnds = useMemo(() => {
        if (!previewWide) return null;
        const last = (STRIP_PREVIEW_W - 1) * 4;
        return {
            a: `rgb(${previewWide[0]} ${previewWide[1]} ${previewWide[2]})`,
            b: `rgb(${previewWide[last]} ${previewWide[last + 1]} ${previewWide[last + 2]})`,
        };
    }, [previewWide]);

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
        if (!fullChromeRamp) return;
        const img = ctx.createImageData(256, 1);
        for (let i = 0; i < 256; i++) {
            img.data[i * 4] = fullChromeRamp[i].r;
            img.data[i * 4 + 1] = fullChromeRamp[i].g;
            img.data[i * 4 + 2] = fullChromeRamp[i].b;
            img.data[i * 4 + 3] = 255;
        }
        // 256×1 backing store stretched by CSS to the strip's full width/height —
        // the browser's display scaling smooths it into a continuous gradient.
        ctx.putImageData(img, 0, 0);
    }, [fullChromeRamp, previewWide]);

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
        noteLineage(knotsKey(sorted));
        setKnots(sorted);

        const newStops = sorted.map(({ id, position, color, bias, interpolation }) => ({
            id, position, color, bias, interpolation
        }));

        // `editorEmitConfig`: stops as always — but an emit with NO stops on a ramp value (the
        // output-space toggle is the one that can run there) keeps the ramp.
        onChangeRef.current(editorEmitConfig(
            newStops,
            newColorSpace || colorSpace,
            newBlendSpace ?? blendSpace,
            rampValueRef.current,
        ));
    }, [colorSpace, blendSpace, noteLineage]);

    /** Commit a whole config verbatim — the menu's ramp items (Invert, output space). */
    const emitConfig = useCallback((cfg: GradientConfig) => { onChangeRef.current(cfg); }, []);

    /**
     * RAMP MODE's Add stops. The host's `onAddStops` when given (it brackets its own undo);
     * otherwise the palette host's fitter, emitted through `onChange` inside `editAction` — one
     * undo step on whatever history the host brackets (app-gmt: the DDFS param stack). The
     * fitter keeps the gradient's `colorSpace`; the knots appear when the new value flows back.
     */
    const onAddStopsRef = useRef(onAddStops);
    onAddStopsRef.current = onAddStops;
    const addStops = useCallback(() => {
        const host = onAddStopsRef.current;
        if (host) { host(); return; }
        const fit = getGradientStopFitter();
        const ramp = rampValueRef.current;
        if (!fit || !ramp) return;
        editAction(() => onChangeRef.current(fit(ramp)));
    }, [editAction]);

    /** A stop action where the stops cannot be edited — a ramp, or a host tool holding the strip —
     *  ASKS to add them, and a yes is Add stops (the host's, which applies its tool's work first).
     *  Offered only when there is an Add stops to run. @see gradientActions `offerStops`. */
    const canOfferStops = !!onAddStops || (!!stopFitter && isRamp);
    const offerStops = useCallback(() => {
        if (window.confirm('Add stops so you can edit them?')) addStops();
    }, [addStops]);

    /** Where the last menu opened (☰ or right-click): the Reduce popup opens in its place. */
    const menuAnchorRef = useRef<{ x: number; y: number } | null>(null);
    /** Why Reduce cannot run now, beyond what the menu sees for itself (a ramp, two stops). */
    const reduceBlocked = knotsStale ? 'These stops describe the gradient underneath. Bake the change to reduce them' : undefined;
    const canReduceNow = !!stopReducer && !isRamp && !knotsStale && knots.length > 2 && !taken;
    const reduceOpen = reduceAt !== null;
    const reduceOpenRef = useRef(reduceOpen);
    reduceOpenRef.current = reduceOpen;
    const openReduce = useCallback(() => {
        const r = containerRef.current?.getBoundingClientRect();
        const menuAt = menuAnchorRef.current ?? (r ? { x: r.left, y: r.bottom } : { x: 16, y: 16 });
        // Never OVER the bar it previews: full chrome's ☰ sits above the strip (app-gmt), and a
        // right-click lands on it, so the popup opens under the knot track, where the menu was
        // only in x. GE v2's ☰ is already below the track and keeps its place.
        const track = knotTrackRef.current?.getBoundingClientRect();
        const at = track ? { x: menuAt.x, y: Math.max(menuAt.y, track.bottom + 6) } : menuAt;
        // a selected knot would keep the host's inspector open over knots the preview hides
        setSelectedIds(new Set<string>());
        setReduceAt({ ...at });
    }, []);
    const closeReduce = useCallback(() => { setReduceAt(null); setReducePreview(null); }, []);
    // The value stopped being something to reduce while the popup was open (an undo to a ramp,
    // a face opened over the stops): the popup goes, and its preview with it.
    useEffect(() => { if (reduceOpen && !canReduceNow) closeReduce(); }, [reduceOpen, canReduceNow, closeReduce]);
    // Pull the plan ONE `next()` PER MACROTASK while the popup is open, and start over whenever the
    // gradient under it changes (an undo, a pick) or the search is switched. A superseded run is
    // cancelled. A new GRADIENT drops the old plan at once (it describes something else); a
    // switched SEARCH keeps showing the old one until the new one's first plan lands, so the bar
    // does not blink back to the gradient for a frame.
    const reduceSubject = useRef<unknown[]>([]);
    useEffect(() => {
        const subject = [reduceOpen, stopReducer, knots, colorSpace, blendSpace];
        const sameGradient = subject.every((v, i) => v === reduceSubject.current[i]);
        reduceSubject.current = subject;
        // same object when already null: with the popup closed this runs on every knot edit and
        // must not cost the editor a render each time. A kept plan is marked PENDING at once, so
        // the popup never looks finished while it is being replaced (the counts on screen are the
        // old search's until the new first plan lands).
        if (!sameGradient) setReducePlan((prev) => (prev ? null : prev));
        else setReducePlan((prev) => (prev && !prev.pending ? { ...prev, pending: true } : prev));
        if (!reduceOpen || !stopReducer || !canReduceNow) return;
        const it: Iterator<GradientReducePlan | null> = stopReducer.reduce({ stops: knots, colorSpace, blendSpace }, { searchBlend: reduceSearch });
        let alive = true;
        let timer = 0;
        const pull = () => {
            if (!alive) return;
            const r = it.next();
            if (r.done) return;
            if (r.value) setReducePlan(r.value);
            timer = window.setTimeout(pull, 0);
        };
        timer = window.setTimeout(pull, 0);
        return () => { alive = false; window.clearTimeout(timer); };
    }, [reduceOpen, stopReducer, canReduceNow, knots, colorSpace, blendSpace, reduceSearch]);
    /** Apply: ONE undo step, through the same bracket as every menu action. */
    const applyReduce = useCallback((cfg: GradientConfig) => {
        setReduceAt(null);
        setReducePreview(null);
        setSelectedIds(new Set<string>());
        editAction(() => emitChange(cfg.stops, cfg.colorSpace, cfg.blendSpace));
    }, [editAction, emitChange]);

    const cycleColorSpace = () => {
        const nextMode = colorSpace === 'srgb' ? 'linear' : colorSpace === 'linear' ? 'aces_inverse' : 'srgb';
        editAction(() => emitChange(knots, nextMode));
    };

    /** Commit a blend space chosen in BlendSpacePicker. Replaced `cycleBlendSpace`
     *  (owner, 2026-09-10) — see BlendSpacePicker for why cycling had to go. */
    const selectBlendSpace = useCallback((next: BlendColorSpace) => {
        if (next === blendSpace) return;
        editAction(() => emitChange(knotsRef.current, undefined, next));
    }, [blendSpace, editAction, emitChange]);

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
        // A ramp has no knot to recolour, and one knot inserted into `stops: []` is not a gradient.
        if (rampValueRef.current) return;
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
            if (rampValueRef.current) return; // a ramp has no knots to select or insert (ADR-0122)
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
        getSelection: () => Array.from(selectedIdsRef.current),
        restoreSelection: (ids: readonly string[]) => {
            // A ramp has no knots; an open Reduce popup cleared the selection on purpose (a selected
            // knot keeps the host's inspector open over knots its preview hides — `openReduce`).
            if (rampValueRef.current || reduceOpenRef.current) { setSelectedIds((prev) => (prev.size ? new Set<string>() : prev)); return 0; }
            const have = new Set(stopsRef.current.map((s) => s.id));
            const keep = ids.filter((id) => have.has(id));
            setSelectedIds(new Set(keep));
            return keep.length;
        },
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
        if (rampValueRef.current) return; // no paste over a ramp (the menu disables it too)
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
    // sections (owner, 2026-09-07 evening): favients, interpolation, blend and output have
    // homes elsewhere there (the shelf, the inspector, the strip, Export). The CLIPBOARD
    // section has no home in GX and that is deliberate, not a gap (owner, 2026-09-13): Copy /
    // Paste gradient is intentionally absent from the Gradient Explorer — the path from GX
    // to GMT is gradient → library (the shared `gmt.favients` collection) → GMT. app-gmt,
    // which passes no `inspectorHost`, keeps the section.
    // View ▸ Reset Default goes too (owner, 2026-09-24): the hero's New Gradient (the host's
    // `menuLead`) already starts from the same black → white. GMT keeps the item.
    const onlySections = (items: ContextMenuItem[]): ContextMenuItem[] => {
        if (!inspectorHost) return items;
        const keep = new Set(['Actions', 'View']);
        let on = false;
        return items.filter((it) => {
            if (it.isHeader) { on = keep.has(it.label ?? ''); return on; }
            return on && it.label !== 'Reset Default';
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
        setConfig: emitConfig,
        addStops: affordances.addStops ? addStops : undefined,
        reduceStops: stopReducer ? openReduce : undefined,
        reduceStopsBlocked: reduceBlocked,
        takenOver: taken,
        offerStops: canOfferStops ? offerStops : undefined,
    })), [knots, currentConfig, selectedIds, blendSpace, colorSpace, isBiasHandlesVisible, emitChange, editAction, handleCopy, handlePaste, favientsBridge, inspectorHost, emitConfig, affordances.addStops, addStops, stopReducer, openReduce, reduceBlocked, taken, canOfferStops, offerStops]);
    /** The ☰ dropdown and the bar's right-click: the host's `menuLead` above the shared list. */
    const menuWithLead = useCallback(
        (): ContextMenuItem[] => (menuLead?.length ? [...menuLead, ...buildMenuItems()] : buildMenuItems()),
        [menuLead, buildMenuItems],
    );

    const handlePointerMove = useCallback((e: PointerEvent) => {
        const payload = dragPayloadRef.current;
        if (!payload || e.pointerId !== payload.pointerId) return;

        const { type, ids, startX, startY, initialKnots } = payload;
        const trackRect = knotTrackRef.current?.getBoundingClientRect();
        if (!trackRect) return;

        const deltaX = e.clientX - startX;
        const deltaXRatio = deltaX / trackRect.width;

        if (type === 'marquee') {
            // Has it wandered off the knots? Crossing `marqueeEscape` SUSPENDS the marquee
            // — it stops drawing and stops selecting — and tells the host, which may take
            // the gesture over (GE v2's hero turns it into a drag of the whole gradient).
            // Coming back inside resumes it, so the escape is reversible the whole way:
            // nothing is committed until mouseup, and mouseup while escaped commits
            // nothing at all.
            const escaped = beyondMarqueeEscape(e.clientX, e.clientY);
            if (escaped !== marqueeEscapedRef.current) {
                marqueeEscapedRef.current = escaped;
                onMarqueeEscapeRef.current?.(escaped, e);
            }
            // RAMP MODE: the gesture runs only for the host's escape — it draws nothing.
            setMarqueeRect(escaped || !marqueeDrawsRef.current ? null : {
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
                const c = isPullingAway ? 'no-drop' : type === 'knot' ? 'grabbing' : 'move';
                setDragCursor(c);
                document.body.style.cursor = c;
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

    const handlePointerUp = useCallback((e: PointerEvent) => {
        const payload = dragPayloadRef.current;
        if (!payload || e.pointerId !== payload.pointerId) return;

        if (payload.type === 'marquee' && marqueeEscapedRef.current) {
            // It left, and whoever took it over owns the release. Select nothing.
            marqueeEscapedRef.current = false;
            setMarqueeRect(null);
        } else if (payload.type === 'marquee' && knotTrackRef.current) {
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
        setDragCursor(null);
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
        // knotSession intentionally omitted: useInteractionGesture returns a fresh
        // wrapper object each render, but its end() closes over a stable ref, so a
        // captured-stale knotSession.end() is correct. Listing it would churn this
        // callback's identity every render (the original omitted it for the same reason).
    }, [emitChange, handlePointerMove, editEnd]);

    /**
     * Has a marquee wandered far enough from the knots that it is no longer about them?
     * The knot track's box grown by `marqueeEscape` on every side — inside is still a
     * selection, outside the host may take the gesture over. `Infinity` disables it.
     */
    const beyondMarqueeEscape = (x: number, y: number): boolean => {
        const reach = marqueeEscapeRef.current;
        if (!Number.isFinite(reach)) return false;
        const r = knotTrackRef.current?.getBoundingClientRect();
        if (!r) return false;
        return x < r.left - reach || x > r.right + reach || y < r.top - reach || y > r.bottom + reach;
    };
    /** True while the current marquee is suspended because it escaped. */
    const marqueeEscapedRef = useRef(false);
    /** Whether the current marquee draws and selects. False on a ramp (ADR-0122), where a drag
     *  on the bar exists only so a host's `marqueeEscape` can take it over. */
    const marqueeDrawsRef = useRef(true);
    // `handlePointerMove` is a `useCallback` memoised on `[emitChange]` and is registered as a
    // window listener for the life of a gesture, so anything it closes over can be several
    // renders old. The host's escape callback closes over the CURRENT gradient — read it
    // through a ref, or a drag that escapes hands over the gradient that was showing when
    // the callback was last rebuilt (measured 2026-09-09: "the drag avatar is holding a
    // stale gradient"). Same for the threshold.
    const onMarqueeEscapeRef = useRef(onMarqueeEscape);
    onMarqueeEscapeRef.current = onMarqueeEscape;
    const marqueeEscapeRef = useRef(marqueeEscape);
    marqueeEscapeRef.current = marqueeEscape;

    /**
     * Cancel the default of the mouse's own `mousedown`, which arrives immediately after the
     * `pointerdown` that starts a drag. See `startDrag` for why it cannot be cancelled on the
     * pointerdown itself.
     */
    const preventNextMouseDown = (ev: MouseEvent) => ev.preventDefault();

    const startDrag = (type: DragPayload['type'], ids: string[], e: React.PointerEvent, overrideKnots?: AdvancedGradientKnot[], skipSnapshot?: boolean) => {
        e.stopPropagation();
        // Touch (Phase F, 2026-09-10). The drag runs on POINTER events, so a finger drives the
        // same path a left mouse button does — but the default is still cancelled on the
        // compatibility `mousedown`, not here. Cancelling a `pointerdown` suppresses the whole
        // gesture's compatibility mouse events (measured in Chromium, 2026-09-10: of an
        // 11-move drag, mousedown 0, mousemove 1, mouseup 0), and things outside this file
        // listen for those — the v2 hero's marquee-escape handoff (`pointerGradientDrag`)
        // drives its avatar off window `mousemove`/`mouseup`, and close-on-outside-press
        // handlers watch `mousedown`. A finger has nothing left to cancel: `touch-action:
        // none` on the track and the strip already tells the browser this is not a scroll.
        if (e.pointerType === 'mouse') window.addEventListener('mousedown', preventNextMouseDown, { capture: true, once: true });

        if (type !== 'marquee' && !skipSnapshot) {
            editStart();
            knotSession.begin();
        }

        dragPayloadRef.current = {
            type, ids, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId,
            initialKnots: JSON.parse(JSON.stringify(overrideKnots || knots))
        };
        // What this gesture IS, held until it ends. `bracket_move` moves a whole selection;
        // the two `bracket_scale_*` and `bias` change a value along the axis.
        const held = type === 'marquee' ? (marqueeDrawsRef.current ? 'crosshair' : 'default')
            : type === 'knot' ? 'grabbing'
            : type === 'bracket_move' ? 'move'
            : 'ew-resize';
        setDragCursor(held);
        document.body.style.cursor = held;
        // Listened for on the WINDOW, not captured on the element: a release outside the
        // window still ends the drag, which is what the mouse listeners always guaranteed. A
        // touch pointer is implicitly captured by its target anyway, so its moves keep
        // arriving here even when the finger leaves the knot. `pointercancel` ends the gesture
        // the same way a release does — leaving the payload set would wedge the editor.
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    const handleTrackPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.gradient-interactive-element') || !knotTrackRef.current) return;
        if (rampValueRef.current) return; // belt to the JSX gate: no knot insertion on a ramp

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
            // a ramp has no knots to nudge; an arrow would emit `stops: []` over it
            if (rampValueRef.current || selectedIds.size === 0 || (e.target as HTMLElement).tagName === 'INPUT') return;

            if ((e.key === 'Delete' || e.key === 'Backspace') && knots.length > selectedIds.size) {
                editAction(() => {
                    emitChange(stopOps.delete(knots, Array.from(selectedIds)));
                    setSelectedIds(new Set<string>());
                });
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                // Left / Right only: the bar is horizontal, and Up / Down used to nudge right.
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
    /**
     * Tell the host when the SELECTION CHANGES — and only then.
     *
     * `onSelectionChange` used to be a dep of this effect, so it re-fired on every render in
     * which the host passed a fresh callback (GE v2's hero takes an inline arrow, so: every
     * shell render). The host reads the notification as an EVENT and acts on it, and its rule
     * is "a stop is selected and the tray is elsewhere → open the inspector". Put together,
     * any re-render while a stop was selected hauled the tray back:
     *
     *   click Adjust → tray = adjust → this effect re-fires with the SAME count → the hero
     *   opens the inspector again → the hero's own "left the inspector" effect then clears the
     *   selection → count 0 → the hero closes the tray. Net: nothing opened, and the owner had
     *   to click the tab twice (reproduced 2026-09-11, every one of the four tabs).
     *
     * The callback lives in a ref instead, so its identity cannot make this an event that did
     * not happen.
     */
    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;
    useEffect(() => { onSelectionChangeRef.current?.(selectionCount); }, [selectionCount]);
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
        menuAnchorRef.current = { x: e.clientX, y: e.clientY };
        // Same shared list the header dropdown renders — see buildMenuItems.
        openContextMenu(e.clientX, e.clientY, menuWithLead(), [helpId || 'ui.gradient_editor']);
    };

    /** Right-click ON a knot: its own menu. The v2 hero trims the strip's menu to Actions and
     *  View, but a knot's INTERPOLATION belongs on the knot itself — it is the one property
     *  you reach for while looking at it (owner, 2026-09-08). Built from the same shared list,
     *  so the wording and the checkmarks cannot drift from the inspector's. */
    const openKnotContextMenu = (e: React.MouseEvent, knotId: string) => {
        e.preventDefault();
        e.stopPropagation();
        menuAnchorRef.current = { x: e.clientX, y: e.clientY };
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
            setConfig: emitConfig,
            addStops: affordances.addStops ? addStops : undefined,
            reduceStops: stopReducer ? openReduce : undefined,
            reduceStopsBlocked: reduceBlocked,
            takenOver: taken,
        offerStops: canOfferStops ? offerStops : undefined,
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
        // the ☰ is also the Reduce popup's trigger: with it open, a click closes it and commits
        // nothing (owner: close by choosing, by Escape, or by the trigger)
        if (reduceAt) { closeReduce(); return; }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        menuAnchorRef.current = { x: rect.left, y: rect.bottom + 5 };
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

    /** RAMP MODE's one control: where the blend chooser was (blend is inert on a ramp). Absent
     *  when the host offers no way to add stops. `data-gx-add-stops` is a test's handle. */
    const addStopsButton = affordances.addStops ? (
        <button
            type="button"
            data-gx-add-stops=""
            className={`gradient-interactive-element shrink-0 whitespace-nowrap rounded border border-accent-400/40 text-accent-300 hover:bg-accent-400/15 hover:text-accent-200 font-semibold transition-colors ${chrome === 'strip' ? 'text-[10px] px-1.5 py-0.5' : 'text-[9px] px-1.5 py-px'}`}
            onClick={addStops}
            title="This gradient is a 256-colour ramp with no stops. Add stops fits it with editable stops (one undo step)"
        >
            Add stops
        </button>
    ) : null;

    return (
        <div 
            className={`w-full select-none rounded ${chrome === 'strip' ? '' : 'bg-surface-raised'} ${dragCursor ? '[&_*]:!cursor-[inherit]' : ''}`}
            style={dragCursor ? { cursor: dragCursor } : undefined}
            ref={containerRef}
            data-help-id={helpId || "ui.gradient_editor"}
            onContextMenu={handleWrapperContextMenu}
            onPointerDown={(e) => {
                if (e.button !== 0 || taken) return;
                if (!(e.target as HTMLElement).closest('.gradient-interactive-element')) {
                    if (knotTrackRef.current?.contains(e.target as Node)) return; // the track's own handlers
                    // RAMP MODE: no selection marquee — only the host's escape drag, if it has one.
                    if (!affordances.selectMarquee && !Number.isFinite(marqueeEscape)) return;
                    marqueeDrawsRef.current = affordances.selectMarquee;
                    if (!e.shiftKey && !e.ctrlKey) setSelectedIds(new Set<string>());
                    marqueeEscapedRef.current = false;
                    startDrag('marquee', [] as string[], e);
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

                    {/* Blend space — the same picker as the strip row, sized for this
                        header. Not a cycle: six modes make cycling a guessing game. */}
                    {isRamp ? addStopsButton : <BlendSpacePicker value={blendSpace} onSelect={selectBlendSpace} onPreview={setHoverBlend} compact />}
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
                    options={menuWithLead()}
                />
            )}
            {reduceAt && stopReducer && (
                <ReduceStopsPopup
                    anchor={reduceAt}
                    steps={stopReducer.steps}
                    plan={reducePlan}
                    blendSpace={blendSpace}
                    searchBlend={reduceSearch}
                    onSearchBlend={setReduceSearch}
                    from={knots.length}
                    onPreview={setReducePreview}
                    onApply={applyReduce}
                    onCancel={closeReduce}
                />
            )}

            {/* The 8 px gutters either side of the strip exist so an end knot has somewhere
                to sit. In 'strip' chrome they are painted with the ramp's two end colours so
                the gradient does not look as if it stops short (owner, 2026-09-07); the
                strip itself has no border there — the v2 hero draws it borderless. 'full'
                chrome (GMT main) is unchanged. */}
            <div
                className={`relative px-2 ${chrome === 'strip' ? `${stripCorners === 'bottom' ? 'rounded-b-[10px]' : 'rounded-[10px]'} overflow-hidden` : ''}`}
                style={chrome === 'strip' && stripEnds && !taken ? {
                    backgroundImage: `linear-gradient(to right, ${stripEnds.a} 50%, ${stripEnds.b} 50%)`,
                    backgroundSize: `100% ${stripHeight}px`,
                    backgroundRepeat: 'no-repeat',
                } : undefined}
                onContextMenu={openTrackContextMenu}
            >
                {/* a TAKEOVER covers the bar AND its 8 px gutters (the `px-2` either side): the host
                    paints the ends itself, so a painted end is not left wearing the stops' colour */}
                {taken && <div className="absolute left-0 right-0 top-0 z-10" style={{ height: stripHeight }}>{stripTakeover!.bar}</div>}
                <div
                    // `pointer` while a click BAKES (a face is open), otherwise `crosshair`:
                    // a drag here marquees the knots. It wore `pointer` unconditionally in full
                    // chrome and `default` in strip chrome, so the one surface with a real
                    // gesture on it was the one saying nothing happens here.
                    className={`w-full relative mb-0 overflow-hidden group/strip ${taken ? 'cursor-default' : onStripClick ? 'cursor-pointer' : affordances.selectMarquee ? 'cursor-crosshair' : 'cursor-default'} ${chrome === 'strip' ? '' : 'rounded-t border border-line/20'}`}
                    // The bar hosts drags of its own — the bias handles, and a marquee from the
                    // bar's background — so a finger on it belongs to the editor, not to
                    // whatever scrolls behind it. A mouse ignores `touch-action` entirely.
                    style={{ height: stripHeight, touchAction: 'none' }}
                    onDoubleClick={taken ? undefined : (e) => { e.preventDefault(); setSelectedIds(new Set(knots.map(k => k.id))); }}
                    onClick={onStripClick && !taken ? (e) => { if (!(e.target as HTMLElement).closest('.bias-handle')) onStripClick(); } : undefined}
                    onMouseEnter={chrome === 'strip' ? () => setStripHover(true) : undefined}
                    onMouseLeave={chrome === 'strip' ? () => setStripHover(false) : undefined}
                    title={taken ? undefined : onStripClick ? stripTitle : isRamp ? undefined : 'Double-click to select all'}
                    data-gx-result-half={onStripClick && !taken ? 'bake' : undefined}
                >
                     {!taken && stripHint}
                     {/* Exact 256-ramp preview (engine sampler) — pointer-events-none so
                         the strip's double-click + bias handles still receive events.
                         `data-gx-ramp` is the handle a test has on the RESULT bar, and it earns
                         its keep: with a face live the hero shows a SOURCE band above this one,
                         also a canvas, also 1136 px wide, and correctly frozen — `[data-gx-hero]
                         canvas` picks whichever of them is first in the DOM, which flips as the
                         split opens and closes. Same spirit as `data-gx-knot` below. */}
                     <canvas
                        ref={previewCanvasRef}
                        data-gx-ramp=""
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
                                style={{ left: `${visualPos * 100}%`, touchAction: 'none' }}
                                onPointerDown={(e) => {
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
                    // the span `t` is measured against. A host projecting a drop from
                    // elsewhere onto this gradient must use THIS rect, not the ramp's outer
                    // box: `chrome="strip"` insets the track 8 px each side for the gutters,
                    // so the two disagree by up to ~0.7 % of t at the edges (GE v2 §8b item 1).
                    data-gx-knot-track=""
                    data-gx-knots-stale={knotsStale ? '' : undefined}
                    data-gx-ramp-mode={isRamp ? '' : undefined}
                    className={`h-6 w-full ${taken ? '' : 'bg-line/5'} relative ${affordances.addKnot ? 'cursor-copy' : 'cursor-default'} ${chrome === 'strip' ? '' : 'border-x border-b border-line/10 rounded-b'}`}
                    // Every drag that starts here is the track's own (add / move a knot, the
                    // brackets, the marquee) — the browser must not read it as a scroll.
                    style={{ touchAction: 'none' }}
                    onPointerDown={affordances.addKnot ? handleTrackPointerDown : undefined}
                    title={taken ? undefined : isRamp ? 'A 256-colour ramp: it has no stops to edit — Add stops to edit it stop by stop' : knotsStale ? 'These stops describe the gradient underneath — bake the change to edit them' : 'Click and drag to add or move a stop'}
                    onDragOver={(e) => {
                        // a ramp takes no dropped colour: there is no knot to land it on
                        if (!affordances.knotEdits || !isColorDrag(e.dataTransfer)) return;
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
                        if (!hex || !affordances.knotEdits) return;
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
                    {/* RAMP MODE says what the track is, since it no longer answers a click */}
                    {taken && stripTakeover!.track}
                    {isRamp && !taken && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-fg-faint pointer-events-none select-none whitespace-nowrap overflow-hidden" data-gx-ramp-label="">
                            256-colour ramp · no stops
                        </span>
                    )}
                    {affordances.knots && knots.map(knot => (
                        <div 
                            key={knot.id} 
                            // `data-gx-knot` is the only handle a test has on a knot: the class
                            // list is layout and the position is a style. Structure-neutral.
                            data-gx-knot=""
                            className={`gradient-interactive-element absolute top-0 w-4 h-5 -ml-2 cursor-grab active:cursor-grabbing z-20 flex flex-col items-center group transition-opacity duration-200 ${isDragRemoving && selectedIds.has(knot.id) ? 'opacity-30' : 'opacity-100'}`}
                            style={{ left: `${knot.position * 100}%`, touchAction: 'none' }}
                            onContextMenu={(e) => openKnotContextMenu(e, knot.id)}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                const isRightClick = e.button === 2;

                                // Ctrl+drag (⌘ on a Mac, where Ctrl+click is a right-click): duplicate the knot
                                if ((e.ctrlKey || e.metaKey) && !isRightClick) {
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
                    {/* REDUCE STOPS preview: the candidate's knots, inert — the real ones stand
                        down while it is on the bar (`previewing`). `data-gx-knot-preview` is a
                        test's handle, apart from `data-gx-knot` so a count of either is honest. */}
                    {reducePreview && reducePreview.stops.map((s) => (
                        <div
                            key={`reduce-${s.id}`}
                            data-gx-knot-preview=""
                            className="absolute top-0 w-4 h-5 -ml-2 flex flex-col items-center pointer-events-none"
                            style={{ left: `${s.position * 100}%` }}
                        >
                            <KnotIcon color={s.color} isSelected={false} interpolation={s.interpolation as InterpolationMode | undefined} />
                        </div>
                    ))}

                    {selectionRange && !taken && (
                        <>
                            {/* Selection background — solid fill behind handles, dashed bottom for drag affordance */}
                            <div
                                className="gradient-interactive-element absolute top-0 z-[5] cursor-move bg-accent-400/10 border-b-[2px] border-dashed border-accent-400/40"
                                style={{ left: `calc(${selectionRange.min * 100}% - 8px)`, width: `calc(${(selectionRange.max - selectionRange.min) * 100}% + 16px)`, bottom: '-6px', touchAction: 'none' }}
                                onPointerDown={(e) => {
                                    if (e.button !== 0) return;
                                    // Ctrl+drag (⌘ on a Mac): duplicate selected knots then drag copies
                                    if (e.ctrlKey || e.metaKey) {
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
                                style={{ left: `calc(${selectionRange.min * 100}% - 18px)`, bottom: '-6px', touchAction: 'none' }}
                                onPointerDown={(e) => { e.stopPropagation(); if(e.button===0) startDrag('bracket_scale_left', Array.from(selectedIds) as string[], e); }}
                            >
                                <svg width="16" height="100%" viewBox="0 0 16 30" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                                    <path d="M 14 1.5 L 4 1.5 L 4 28.5 L 14 28.5" fill="none" stroke="rgb(34 211 238)" strokeWidth="2.5" strokeLinecap="round" className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                </svg>
                            </div>
                            {/* Right bracket ] */}
                            <div
                                className="gradient-interactive-element absolute top-0 w-[16px] z-30 cursor-ew-resize group"
                                style={{ left: `calc(${selectionRange.max * 100}% + 2px)`, bottom: '-6px', touchAction: 'none' }}
                                onPointerDown={(e) => { e.stopPropagation(); if(e.button===0) startDrag('bracket_scale_right', Array.from(selectedIds) as string[], e); }}
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
                // A phone's hero row (v2, the inspector hosted): tabs + "N stops · blend · ☰" must
                // hold ONE line at 360 px, so the row sheds padding and gap there (L1), and the ☰
                // grows to a finger's 28 px by height alone — the row is already that tall (L9; the
                // blend chooser does the same inside BlendSpacePicker).
                const tight = COARSE_POINTER && !!inspectorHost;
                const meta = (
                    <div className={`flex items-center ${tight ? 'gap-1.5' : 'gap-2'} text-[10px] text-fg-dim`}>
                        {/* "blend" is the picker's own quiet word (`showNoun`); on a coarse pointer
                            the picker IS the word (see BlendSpacePicker) */}
                        {/* RAMP MODE: blend is inert on a ramp, so its slot holds Add stops */}
                        {isRamp ? addStopsButton : (
                            <>
                                {/* THE STOP COUNT, where a ramp says it has none (owner's parity
                                    row E10b). Quiet on purpose — the ramp label's ink. Hidden (not
                                    removed, so the row never shifts) while the bar shows something
                                    other than these stops. */}
                                <span
                                    className={`text-fg-faint tabular-nums whitespace-nowrap ${knotsStale ? 'invisible' : ''}`}
                                    data-gx-stop-count=""
                                >
                                    {knots.length} {knots.length === 1 ? 'stop' : 'stops'}
                                </span>
                                <BlendSpacePicker value={blendSpace} onSelect={selectBlendSpace} onPreview={setHoverBlend} showNoun />
                            </>
                        )}
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
                            className={`flex items-center px-1.5 py-0.5 ${tight ? 'min-h-7' : ''} rounded border border-line/10 hover:border-line/25 hover:bg-line/10 text-fg-dim hover:text-fg font-medium transition-colors`}
                            onClick={handlePresetsClick}
                            // the name only: smokes select the prefix `title^="Stops menu"`
                            title="Stops menu"
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
                            <div className={`flex flex-wrap items-center gap-1.5 mt-1.5 ${tight ? 'px-1' : 'px-2'} gradient-interactive-element`}>
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
                                        roomy={pickerRoomy}
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
