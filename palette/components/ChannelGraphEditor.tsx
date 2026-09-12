/**
 * ChannelGraphEditor — the Generator's L / C / h channel-curve editor.
 *
 * Reuses the engine's PURE animation-graph pieces (GraphCanvas + GraphRenderer +
 * GraphUtils + AnimationMath) to render and edit three local Tracks — the
 * gradient's OKLCh channel curves. The LIVE animation timeline is untouched: this
 * editor drives its OWN sequence and writes via the controlled `onTracksChange`
 * prop (the host holds the tracks so the generator pipeline can sample them).
 *
 * The interaction + tools + selection-bbox are the SHARED engine hooks
 * (useGraphInteraction / useGraphTools / GraphSelectionBBox), driven through a
 * local `GraphDataSource` built below. That DATA SOURCE omits the timeline-only
 * paths — no scrub/playhead, no track-selection sync, and none of the sequence
 * store's undo. See utils/GraphDataSource.ts.
 *
 * Edits here ARE undoable, and the editor DOES touch the engine store — it just
 * brackets them itself instead of going through the data source. Grep `genEdit`
 * (== `paramEdit` from `palette/store/paramUndoBracket`): discrete gestures
 * self-bracket to one entry each, and a pointerdown/window-pointerup pair wraps a
 * whole drag in one engine param transaction (grep `genEditStart`). The snapshot
 * is `captureGeneratorHistory`, registered as a param-undo history provider in
 * `registerPaletteUI` — so curves ride Ctrl+Z alongside the DDFS dials.
 *
 * Channel ranges: t∈[0,1] maps to frame 0..CURVE_FRAMES (1:1 with 256 samples);
 * the vertical axis is normalized per-channel (L, C, h have very different value
 * ranges) so all three fit the view at once, the active one drawn bold.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { GraphCanvas } from '../../components/graph/GraphCanvas';
import {
  GraphViewTransform,
  frameToPixel,
  valueToPixel,
  pixelToFrame,
  pixelToValue,
  THEME,
} from '../../utils/GraphUtils';
import { GRAPH_LEFT_GUTTER_WIDTH, GRAPH_RULER_HEIGHT } from '../../data/constants';
import { calculateViewBounds } from '../../utils/keyframeViewBounds';
import { calculateTangentModeUpdates, calculateGlobalInterpolationUpdates } from '../../utils/timelineUtils';
import { FitIcon, FitSelectionIcon, NormIcon, WaveIcon, BakeIcon, MagicIcon, PencilIcon, BrushIcon } from '../../components/Icons';
import type { Track, Keyframe, AnimationSequence, SoftSelectionType } from '../../types';
import type { RGB } from '../core/oklab';
import type { Channels } from '../core/generatorPipeline';
import { CURVE_FRAMES, reTangentBezier } from '../core/channelCurve';
import { useGraphInteraction } from '../../hooks/useGraphInteraction';
import { useGraphTools } from '../../hooks/useGraphTools';
import { usePencilTool, PENCIL_CURSOR } from '../../hooks/usePencilTool';
import { balancedToolColumnMaxHeight } from '../../utils/toolColumn';
import { GraphSelectionBBox } from '../../components/graph/GraphSelectionBBox';
import type { GraphDataSource } from '../../utils/GraphDataSource';
import { KeyframeInspector } from '../../components/timeline/KeyframeInspector';
import { ChannelTrackSidebar, type ChannelInfo } from './ChannelTrackSidebar';
import { genEdit, genEditStart, genEditEnd } from '../store/generatorStore';
import { WaveOverlay } from './WaveOverlay';
import { WaveToolHead, SHAPE_PATHS } from './WaveToolHead';
import { DEFAULT_WAVE, applyWaveSample, sampleWaveSpan, waveSpanFrames, type WaveParams } from '../core/waveGen';
import { DEFAULT_CURVE_SPACE, channelForRole, curveSpace, curveSpaceKeys, type CurveSpace } from '../core/curveSpaces';
import { presetParams, type WavePreset } from '../core/wavePresets';
import { fitSamplesToKeys, spliceSpan } from '../../utils/CurveFitting';
import { evaluateTrackValue } from '../../utils/timelineUtils';

/**
 * A channel key is the ACTIVE SPACE's channel key — 'L' | 'C' | 'h' in OkLCh, 'R' | 'G' | 'B'
 * in RGB, 'L*' | 'C*' | 'h*' in CIE LCh, and so on. It widened from that literal union when
 * Curves stopped being OkLCh-only (2026-09-12); the space registry is the authority on which
 * three keys are live, and `curveSpaceKeys(space)` is how to ask.
 * @see palette/core/curveSpaces.ts
 */
export type ChannelKey = string;
export type ChannelTracks = Record<string, Track>;

/**
 * The channel table is the SPACE's, not a constant. Each entry carries its relevant plot
 * range in its own units, its fit epsilon and whether it is an angle — see
 * palette/core/curveSpaces.ts, which is the authority. An angular channel's range is grown
 * to whole turns below when the unwrapped value runs past one.
 */
const channelsOf = (space: CurveSpace): ChannelInfo[] =>
  curveSpace(space).channels.map((c) => ({ key: c.key, label: c.label, color: c.color }));

/**
 * The wave filter's settings SURVIVE closing the tool (owner, 2026-09-12: "loading it again
 * keeps the same settings if they wish to apply it to other channels after tweaking") — so
 * putting the same ripple on chroma after lightness is a reopen and a nudge, not a re-dial.
 * Module-level rather than component state because the Curves face unmounts this editor
 * whenever the tracks go null, and a re-fit must not cost the dial-in.
 */
let lastWave: WaveParams = DEFAULT_WAVE;

const SIDEBAR_W = 112;
/** PHONE (owner, 2026-09-12): the value-axis gutter, cut from 62 px. 62 is sized for the
 *  animation editor's arbitrary values; these curves are normalised, so the column only ever
 *  prints "1.0" and "0.0" and the other 32 px were a sixth of a 390 px screen given to
 *  nothing. The plot's own maths reads this through `gutter`, and so does the renderer. */
const PHONE_GUTTER = 30;
// Shared KeyframeInspector widths: full (w-64) vs collapsed rail (w-7).
const INSPECTOR_W = 256;
const INSPECTOR_W_COLLAPSED = 28;
const STRIP_H = 12;

/**
 * Left/right insets of the graph's PLOT area within the editor's full width, so the
 * Generator can align its gradient strips with the curve plot (t-axis lines up). The
 * right inset assumes the inspector is expanded; it collapses to a rail at runtime.
 */
export const CHANNEL_PLOT_INSET_LEFT = SIDEBAR_W + GRAPH_LEFT_GUTTER_WIDTH;
export const CHANNEL_PLOT_INSET_RIGHT = INSPECTOR_W;

// Keep the playhead arrow off-screen — a gradient curve has no time-playhead.
const HIDDEN_FRAME = -1e6;

/** Inverse of v2p: pixel-Y → channel value (normalised-aware). Pure so it works with
 *  either the LIVE view/range (the move handle, double-click add) or a basis FROZEN at
 *  gesture start (the pencil). `range` is the channel's {min,max,span} or undefined. */
const pixelToChannelValue = (
  py: number,
  view: GraphViewTransform,
  range: { min: number; max: number; span: number } | undefined,
  normalized: boolean,
): number => {
  const raw = pixelToValue(py, view);
  return normalized && range ? range.min + raw * range.span : raw;
};

// Compact graph-tool button, mirroring GMT's GraphToolbar styling.
const ToolButton: React.FC<{
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  icon: React.ReactNode;
  tooltip: string;
  active?: boolean;
  /** rendered as data-gx-tool, for the smokes */
  tag?: string;
}> = ({ onClick, onPointerDown, icon, tooltip, active, tag }) => (
  <button
    onClick={onClick}
    onPointerDown={onPointerDown}
    title={tooltip}
    data-gx-tool={tag}
    className={`group/btn relative w-6 h-6 flex items-center justify-center rounded border transition-all ${
      active ? 'bg-accent-900/80 text-accent-300 border-accent-500/50' : 'bg-surface/80 text-fg-muted border-line/10 hover:text-fg'
    }`}
  >
    {icon}
  </button>
);

interface ChannelGraphEditorProps {
  tracks: ChannelTracks;
  onTracksChange: (tracks: ChannelTracks) => void;
  width: number;
  /** PHONE (2026-09-11): the keyframe inspector goes below the plot, full width, open. */
  phone?: boolean;
  height: number;
  /** Optional result ramp, drawn as a thin strip under the graph for context. */
  previewRamp?: RGB[];
  /**
   * The PROSPECTIVE-FIT source channels (256 values each, hue unwrapped) at the
   * host's current detail/smooth — painted as a faint dashed "ghost" behind the
   * editable bezier so the user sees what a re-fit/bake would commit BEFORE
   * committing it. detail/smooth move this ghost, never the live curve.
   * (Decision 3 — see generatorStore.prospectiveFitChannels.)
   */
  ghost?: Record<string, number[]> | null;
  /**
   * Per-channel prospective-fit keyframe FRAMES at the host's current detail/smooth —
   * drawn as faint "ghost points" ON the ghost curve so those two sliders are legible:
   * detail = how many points; smooth = where they land. Frames are 0..CURVE_FRAMES (==
   * the ghost sample index). (generatorStore.prospectiveFitFrames.)
   */
  ghostPoints?: Record<string, number[]> | null;
  /** The ghost's resting visibility (the eye toggles it). Default true (the studio); the v2
   *  Curves face passes false — there the ghost is a layer that shows itself only while the
   *  fit recipe is being adjusted (`ghostActive`), unless the user turns the eye on (owner,
   *  2026-09-07 evening: "visible only during adjusting curve input settings, unless user
   *  specified"). */
  ghostDefault?: boolean;
  /** The host is adjusting Detail / Smooth right now: the ghost shows whatever the eye says. */
  ghostActive?: boolean;
  /**
   * The host's DETAIL setting, as a multiplier on each channel's own `eps`, so the tools that
   * simplify — the Pencil, the smoothing brush, the wave stamp — fit at the same tolerance
   * the Detail slider is asking the main fit for.
   *
   * Without it they used the channel's BASE eps, which happens to equal Detail 8 exactly
   * (`fitChannelsToTracks` scales by `(11 - detail) / 3`, and (11-8)/3 = 1). So the dial moved
   * the fit and the tools stayed pinned to one end of it — a stroke drawn at Detail 2 came
   * back four times denser than the curve around it. Default 1, which is that same
   * behaviour, so a host that does not pass it is unchanged.
   */
  epsScale?: number;
  /** Show the Normalize (0–1) toggle. The v2 Curves face passes false: there the plot is
   *  ALWAYS on the channels' relevant ranges (L 0–1 = C 0–0.4 = one hue turn; owner,
   *  2026-09-07 evening) — the un-normalized view was where Fit all / Fit selection broke. */
  normalizeToggle?: boolean;
  /**
   * When false the editor is a read-only SCOPE: no keyframe edits, the editing tools are
   * hidden, but the axes + ghost still render. Used before any curves are fit so the
   * channel scope (and the Modify chain's effect) is always visible. Default true.
   */
  interactive?: boolean;
  /** WHICH three axes to draw. Defaults to OkLCh, which is what every host passed before
   *  the space chooser existed. @see palette/core/curveSpaces.ts */
  space?: CurveSpace;
  /** The space chooser, rendered at the head of the track list (it names what the tracks
   *  are). The editor does not own the choice — the host does, since the tracks have to be
   *  re-fit into the new space and only the host knows what to re-fit them FROM. */
  spaceChooser?: React.ReactNode;
}

export const ChannelGraphEditor: React.FC<ChannelGraphEditorProps> = ({
  tracks,
  onTracksChange,
  width,
  height,
  previewRamp,
  ghost,
  ghostPoints,
  ghostDefault = true,
  ghostActive = false,
  epsScale = 1,
  normalizeToggle = true,
  interactive = true, phone = false, space = DEFAULT_CURVE_SPACE, spaceChooser }) => {
  const interactionRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const pencilRef = useRef<HTMLCanvasElement>(null);

  const CHANNELS = useMemo(() => channelsOf(space), [space]);
  const spaceDef = useMemo(() => curveSpace(space), [space]);
  /** The active space's definition for one channel key, falling back to its first channel
   *  for the render between a space switch and the activeChannel effect below. */
  const chanDef = useCallback(
    (key: string) => spaceDef.channels.find((c) => c.key === key) ?? spaceDef.channels[0],
    [spaceDef],
  );
  const [activeChannel, setActiveChannel] = useState<ChannelKey>(() => channelsOf(space)[0].key);
  // A space switch renames every channel, so an activeChannel from the old space would
  // point at a track that no longer exists (and the pencil / wave would target nothing).
  useEffect(() => {
    if (!CHANNELS.some((c) => c.key === activeChannel)) setActiveChannel(CHANNELS[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CHANNELS]);
  const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<string[]>([]);
  // MINIMIZED BY DEFAULT (owner, 2026-09-12), on every host and both pointer kinds: the
  // inspector is where you go to type an exact value, and the plot is what you came for.
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  // The sidebar (112) + inspector (256) + a usable canvas don't fit on a narrow
  // (phone) editor, so the inspector overflows over the graph. Auto-collapse it to
  // its rail when the area is narrow; only fires on a width change, so the user can
  // still expand it manually at that size.
  useEffect(() => {
    if (width > 0 && width < 560) setInspectorCollapsed(true);
  }, [width]);
  const [normalized, setNormalized] = useState(true);
  // The FUNCTION TOOL. `waveOn` is a MODE: while it is live every other canvas gesture is
  // suppressed (owner, 2026-09-12: "other canvas handles, beziers, etc should not be active
  // while the function tool runs") — a stray grab at a tangent mid-wave would commit an edit
  // the preview never showed. Params seed from the module-level carry-over, see `lastWave`.
  const [waveOn, setWaveOn] = useState(false);
  const [waveParams, setWaveParams] = useState<WaveParams>(lastWave);
  const [wavePill, setWavePill] = useState<string | null>(null);
  /** Bumped whenever `waveBaseRef` is re-snapshotted. A ref change triggers no render, so
   *  without this the preview below never re-runs after a channel switch re-bases it. */
  const [waveBaseTick, setWaveBaseTick] = useState(0);
  const waveArmed = interactive && waveOn;
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  // Source-ghost visibility — a transient local UI flag (like `normalized` / `visible`),
  // NOT a DDFS param. Default on so the prospective fit is visible the moment curves exist.
  const [ghostVisible, setGhostVisible] = useState(ghostDefault);
  const showGhost = ghostVisible || ghostActive;
  // Soft selection (proportional editing) — local state mirroring the animation
  // store's softSelection fields.
  const [softEnabled, setSoftEnabled] = useState(false);
  const [softRadius, setSoftRadius] = useState(10);
  const [softType, setSoftType] = useState<SoftSelectionType>('Dome');
  const setSoft = useCallback((radius: number, enabled: boolean) => {
    setSoftRadius(radius);
    setSoftEnabled(enabled);
  }, []);
  // View state (mirrors GraphEditor's scrollLeft / frameWidth / viewY split).
  const [scrollLeft, setScrollLeft] = useState(0);
  const [frameWidth, setFrameWidth] = useState(2);
  const [viewY, setViewY] = useState({ pan: 0.5, scale: 100 });

  // width/height are the full graph AREA; the canvas sits between the track
  // sidebar and the keyframe inspector, with the result strip below. The canvas
  // reclaims the inspector's space when it's collapsed to its rail.
  // PHONE (owner, 2026-09-11): the keyframe inspector moves BELOW the plot, full width and
  // open, where there is room; beside the plot it left ~200 px of curve on a 390 px
  // screen. The plot then spans `width - SIDEBAR_W`.
  const inspectorW = phone ? 0 : inspectorCollapsed ? INSPECTOR_W_COLLAPSED : INSPECTOR_W;
  // PHONE (owner, 2026-09-12): the track list and the tool column BOTH move above the plot,
  // so neither takes width from it, and the plot then spans the editor edge to edge at a
  // fixed 4:3 — `height` is ignored there, since a shape is what was asked for and a phone's
  // width is what is actually known. The strip rides under it as always.
  const sidebarW = phone ? 0 : SIDEBAR_W;
  const gutter = phone ? PHONE_GUTTER : GRAPH_LEFT_GUTTER_WIDTH;
  const canvasWidth = Math.max(120, width - sidebarW - inspectorW);
  const canvasHeight = phone ? Math.round((canvasWidth * 3) / 4) : Math.max(80, height - STRIP_H);

  // Fit the t-axis (0..CURVE_FRAMES) across the canvas and the normalized
  // vertical [0,1] into the plot area whenever the size changes.
  useEffect(() => {
    const available = canvasWidth - gutter;
    if (available <= 0) return;
    setFrameWidth(available / CURVE_FRAMES);
    setScrollLeft(0);
    setViewY({ pan: 0.5, scale: Math.max(20, canvasHeight - GRAPH_RULER_HEIGHT - 30) });
  }, [canvasWidth, canvasHeight]);

  const sequence: AnimationSequence = useMemo(
    () => ({ durationFrames: CURVE_FRAMES, tracks: { ...tracks } }),
    [tracks],
  );

  const trackIds = useMemo(() => CHANNELS.map((c) => c.key), [CHANNELS]);
  // Only visible channels are drawn / hit-tested / fit / tooled.
  const displayTrackIds = useMemo(() => trackIds.filter((t) => visible[t] !== false), [trackIds, visible]);

  const view: GraphViewTransform = useMemo(() => {
    const panX = scrollLeft / frameWidth;
    return { panX, panY: viewY.pan, scaleX: frameWidth, scaleY: viewY.scale, width: canvasWidth, height: canvasHeight };
  }, [scrollLeft, frameWidth, viewY, canvasWidth, canvasHeight]);

  // Per-channel value range — same shape as GraphEditor's trackRanges. NORMALIZED (the
  // default) maps each channel's RELEVANT range to [0,1]: L 0..1, C 0..0.4 (sRGB's reach),
  // h one turn (grown to whole turns when the unwrapped hue runs past it) — not the data's
  // own min..max, which made a nearly flat channel fill the plot and read as a wild swing
  // (owner, 2026-09-07 evening: "lightness, chroma and hue have different relevant ranges —
  // this is what needs to be normalized to 0–1, not their current range"). Un-normalized:
  // the data's min/max as before (the shared-axis view). The GHOST extent is folded in so
  // the result ghost (which can swing outside the keyframe band under the Modify chain, or
  // be the only data when there are no keyframes yet) always stays in view AND shares the
  // editable curve's scale — they overlay where equal and diverge to show what Modify did.
  // Gated on `ghostVisible`: hiding the ghost must also drop its range contribution, else
  // the editable bezier would stay compressed with no visible cause.
  /**
   * The keyframes the armed channel had BEFORE the tool touched it. Every preview frame and
   * the final commit are computed against THIS, never against the live track — otherwise
   * each preview would compound onto the last and one drag would stack a hundred waves.
   */
  const waveBaseRef = useRef<Keyframe[] | null>(null);
  /** WHICH channel `waveBaseRef` belongs to, so switching channel mid-tool can put the old
   *  one back before adopting the new one. Without it the previous channel kept whatever the
   *  live preview had written into it — a wave you never committed, left behind. */
  const waveChanRef = useRef<string | null>(null);

  // The channel's OWN relevant range (L 1.0, chroma 0.4, one hue turn), not the plotted
  // one. Two reasons: a fractional amplitude then means the same thing whatever the plot
  // happens to be zoomed to, and `trackRanges` folds the wave's extent in below — reading
  // the plotted span here would make that circular.
  const waveRange = useMemo(() => {
    const c = chanDef(activeChannel);
    return Math.max(1e-6, c.max - c.min);
  }, [chanDef, activeChannel]);

  /**
   * The armed wave's TRUE value extent, sampled from the filter itself rather than read off
   * the fitted keys. `trackRanges` folds this in so the crest and trough stay on the plot
   * (owner, 2026-09-12: "we need to do a graph resize to ensure the outermost handles are
   * visible"). Reading the keys instead leaves the curve 3 px over the top edge, measured:
   * the Douglas-Peucker fit slightly undershoots a peak it places no key exactly on.
   */
  const waveExtent = useMemo(() => {
    const src = waveBaseRef.current;
    if (!waveArmed || !src) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i <= 128; i++) {
      const t = i / 128;
      const v = applyWaveSample(evaluateTrackValue(src, t * CURVE_FRAMES, false, false), t, waveParams, waveRange);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return { lo, hi };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveArmed, waveParams, waveRange, activeChannel]);

  const trackRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number; span: number }> = {};
    trackIds.forEach((tid) => {
      let min = Infinity;
      let max = -Infinity;
      const track = tracks[tid as ChannelKey];
      track?.keyframes.forEach((k) => {
        if (k.value < min) min = k.value;
        if (k.value > max) max = k.value;
      });
      const g = showGhost ? ghost?.[tid] : undefined;
      if (g) for (let i = 0; i < g.length; i++) {
        if (g[i] < min) min = g[i];
        if (g[i] > max) max = g[i];
      }
      if (waveExtent && tid === activeChannel) {
        min = Math.min(min, waveExtent.lo);
        max = Math.max(max, waveExtent.hi);
      }
      if (!isFinite(min) || !isFinite(max)) {
        min = 0;
        max = 1;
      }
      if (normalized) {
        // the channel's relevant range, grown only where the data runs past it
        const rel = chanDef(tid);
        if (rel.angular) {
          const turn = Math.PI * 2;
          const lo = Math.floor(Math.min(min, 0) / turn) * turn;
          const hi = Math.ceil(Math.max(max, turn) / turn - 1e-9) * turn;
          min = lo; max = hi;
        } else {
          min = Math.min(rel.min, min);
          max = Math.max(rel.max, max);
        }
      } else if (max - min < 0.00001) {
        min -= 0.5;
        max += 0.5;
      }
      ranges[tid] = { min, max, span: max - min };
    });
    return ranges;
  }, [tracks, trackIds, ghost, showGhost, normalized, chanDef, waveExtent, activeChannel]);

  const getLocalY = useCallback(
    (val: number, tid: string) => {
      const r = trackRanges[tid];
      if (!r) return 0.5;
      return (val - r.min) / r.span;
    },
    [trackRanges],
  );

  const v2p = useCallback(
    (val: number, tid: string) => valueToPixel(normalized ? getLocalY(val, tid) : val, view),
    [getLocalY, view, normalized],
  );
  // Inverse of v2p: pixel-Y → channel value (normalised-aware). Used by the box's
  // centre MOVE handle and the PENCIL tool to map screen space back into the track's
  // value space (so a drawn stroke / dragged selection lands at the right value).
  const p2v = useCallback(
    (py: number, tid: string) => pixelToChannelValue(py, view, trackRanges[tid], normalized),
    [view, normalized, trackRanges],
  );
  const frameToCanvasPixel = useCallback((f: number) => frameToPixel(f, view) + gutter, [view, gutter]);
  const canvasPixelToFrame = useCallback((px: number) => pixelToFrame(px - gutter, view), [view, gutter]);

  // --- view fitting (ported from GraphEditor) ---
  const applyFit = useCallback(
    (bounds: { minV: number; maxV: number; minF: number; maxF: number } | null, norm: boolean) => {
      const availW = Math.max(10, canvasWidth - gutter);
      const availH = Math.max(40, canvasHeight - GRAPH_RULER_HEIGHT - 30);
      if (!bounds) {
        setFrameWidth(availW / CURVE_FRAMES);
        setScrollLeft(0);
        setViewY({ pan: norm ? 0.5 : 0.5, scale: availH });
        return;
      }
      if (norm) {
        setViewY({ pan: 0.5, scale: availH });
      } else {
        const rangeV = Math.max(bounds.maxV - bounds.minV, 0.1);
        setViewY({ scale: Math.max(20, availH / (rangeV * 1.15)), pan: (bounds.minV + bounds.maxV) / 2 });
      }
      let rangeF = bounds.maxF - bounds.minF;
      if (rangeF <= 1) {
        rangeF = CURVE_FRAMES;
        const pad = rangeF * 0.04;
        const sx = availW / (rangeF + pad * 2);
        setFrameWidth(sx);
        setScrollLeft(-pad * sx);
      } else {
        const pad = rangeF * 0.08;
        const sx = availW / (rangeF + pad * 2);
        setFrameWidth(sx);
        setScrollLeft((bounds.minF - pad) * sx);
      }
    },
    [canvasWidth, canvasHeight],
  );

  const fitAll = useCallback(() => applyFit(calculateViewBounds(displayTrackIds, sequence), normalized), [applyFit, displayTrackIds, sequence, normalized]);
  const fitSelection = useCallback(() => {
    if (selectedKeyframeIds.length > 0) applyFit(calculateViewBounds(displayTrackIds, sequence, selectedKeyframeIds), normalized);
    else applyFit(calculateViewBounds(displayTrackIds, sequence), normalized);
  }, [applyFit, displayTrackIds, sequence, selectedKeyframeIds, normalized]);
  const toggleNormalize = useCallback(() => {
    const next = !normalized;
    setNormalized(next);
    applyFit(calculateViewBounds(displayTrackIds, sequence), next);
  }, [normalized, applyFit, displayTrackIds, sequence]);

  // --- local-state write callbacks (replace the store actions) ---
  // updateKeyframes MUST be a STABLE reference: the interaction hook adds the
  // window mousemove listener at mousedown bound to a specific closure, and a
  // cleanup effect removes it on identity change. If updateKeyframes changed
  // each render (it writes tracks, which re-renders) the listener would be torn
  // down mid-drag — the exact bug useGraphInteraction documents. So read the
  // current tracks from a ref and depend only on the (stable) setter.
  //
  // Every mutator below writes this ref EAGERLY, before calling onTracksChange —
  // the effect only re-syncs it after the commit, so two mutations in the same tick
  // would both read the pre-commit tracks and the second would silently discard the
  // first. That composition is load-bearing: the selection box's Ctrl-drag calls
  // `replaceKeyframes` (insert the copies) and then `updateKeyframes` (transform them)
  // inside ONE mouse-move, and without the eager write the copies vanish and the
  // selection points at ids that no longer exist.
  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  });
  /** Publish a new tracks object: ref first (so a same-tick follow-up composes), then up. */
  const commitTracks = useCallback(
    (next: ChannelTracks) => {
      tracksRef.current = next;
      onTracksChange(next);
    },
    [onTracksChange],
  );
  const updateKeyframes = useCallback(
    (updates: { trackId: string; keyId: string; patch: Partial<Keyframe> }[]) => {
      const next: ChannelTracks = { ...tracksRef.current };
      const touched = new Set<ChannelKey>();
      for (const { trackId, keyId, patch } of updates) {
        const tr = next[trackId as ChannelKey];
        if (!tr) continue;
        touched.add(trackId as ChannelKey);
        next[trackId as ChannelKey] = {
          ...tr,
          keyframes: tr.keyframes.map((k) => (k.id === keyId ? { ...k, ...patch } : k)),
        };
      }
      // Keep every touched track sorted by frame — parity with the timeline store
      // (grep `touchedTracks` in store/animation/sequenceSlice.ts). trackToRamp samples
      // through evaluateTrackValue, which early-outs on keys[0] / keys[last] and walks
      // the array forward: an out-of-order array silently samples the wrong curve. Any
      // patch that moves a key past its neighbour gets here — a key dragged across one,
      // or a selection MIRRORED by the bbox's scale handles, which reverses a whole run.
      touched.forEach((tid) => {
        next[tid] = { ...next[tid], keyframes: [...next[tid].keyframes].sort((a, b) => a.frame - b.frame) };
      });
      commitTracks(next);
    },
    [commitTracks],
  );

  const selectKeyframes = useCallback((ids: string[], additive: boolean) => {
    setSelectedKeyframeIds((prev) => (additive ? Array.from(new Set([...prev, ...ids])) : ids));
  }, []);
  const selectKeyframe = useCallback(
    (tid: string, kid: string, additive: boolean) => selectKeyframes([`${tid}::${kid}`], additive),
    [selectKeyframes],
  );
  const deselectAllKeys = useCallback(() => setSelectedKeyframeIds([]), []);
  // Wholesale-replace target tracks' keyframe arrays (bake / simplify add and
  // remove keys). Reads the live tracks ref so it composes with an in-flight
  // drag, replaces only the named tracks, leaves the rest intact.
  const replaceKeyframes = useCallback(
    (updates: { trackId: string; newKeys: Keyframe[] }[]) => {
      const next: ChannelTracks = { ...tracksRef.current };
      for (const { trackId, newKeys } of updates) {
        const tr = next[trackId as ChannelKey];
        if (tr) next[trackId as ChannelKey] = { ...tr, keyframes: newKeys };
      }
      commitTracks(next);
    },
    [commitTracks],
  );

  // Delete the selected keys, never stripping a channel below its two endpoints.
  // Defined before the data source so it can back ds.deleteSelectedKeyframes.
  const deleteSelected = useCallback(() => {
    if (selectedKeyframeIds.length === 0) return;
    const byTrack = new Map<string, Set<string>>();
    selectedKeyframeIds.forEach((cid) => {
      const [tid, kid] = cid.split('::');
      if (!byTrack.has(tid)) byTrack.set(tid, new Set());
      byTrack.get(tid)!.add(kid);
    });
    const next: ChannelTracks = { ...tracks };
    byTrack.forEach((kids, tid) => {
      const tr = next[tid as ChannelKey];
      if (!tr) return;
      const kept = tr.keyframes.filter((k) => !kids.has(k.id));
      if (kept.length >= 2) next[tid as ChannelKey] = { ...tr, keyframes: kept };
    });
    genEdit(() => onTracksChange(next)); // discrete delete — one undo entry
    setSelectedKeyframeIds([]);
  }, [selectedKeyframeIds, tracks, onTracksChange]);

  // Local GraphDataSource — the seam that lets this editor reuse the engine's
  // interaction/tools/bbox/inspector verbatim. Omitting scrub / setTrackSelection
  // / snapshot / onAfterMutate / addKeyframe / bounce* makes the shared pieces
  // skip the timeline-only paths (ruler scrub, track-selection sync, undo, engine
  // scrub) and fall back to the default smoothing physics (0.5 / 0.6). The
  // inspector actions (setTangents/setGlobalInterpolation/delete/softType) reuse
  // the shared pure helpers so behaviour matches the timeline exactly.
  const dataSource: GraphDataSource = {
    sequence,
    currentFrame: 0,
    selectedKeyframeIds,
    softSelectionEnabled: softEnabled,
    softSelectionRadius: softRadius,
    softSelectionType: softType,
    updateKeyframes,
    selectKeyframes,
    selectKeyframe,
    deselectAllKeys,
    setSoftSelection: setSoft,
    setSoftSelectionType: setSoftType,
    // Inspector actions are discrete clicks — self-bracket so each is one undo entry.
    setTangents: (mode) => genEdit(() => updateKeyframes(calculateTangentModeUpdates(sequence, selectedKeyframeIds, mode))),
    setGlobalInterpolation: (type, tm) => genEdit(() => replaceKeyframes(calculateGlobalInterpolationUpdates(sequence, type, tm))),
    deleteSelectedKeyframes: deleteSelected,
    replaceKeyframes,
  };

  const { handleMouseDown, getHit, selectionBox, softInteraction, shouldSuppressContextMenu } = useGraphInteraction(
    interactionRef,
    view,
    displayTrackIds,
    normalized,
    trackRanges,
    v2p,
    setScrollLeft,
    setFrameWidth,
    setViewY,
    frameToCanvasPixel,
    canvasPixelToFrame,
    gutter,
    dataSource,
  );

  // Bake / smooth / simplify — drag tools on the local tracks. selectedTrackIds
  // = the visible channels so "nothing selected" targets all of them (the
  // palette has no track-selection concept; this reproduces the fork's default).
  const tools = useGraphTools(
    {
      sequence,
      trackIds: displayTrackIds,
      selectedTrackIds: displayTrackIds,
      selectedKeyframeIds,
      v2p,
      canvasPixelToFrame,
      // the elastic Smooth bakes the selection (+ one key either side) to a key per frame
      // first (owner, 2026-09-07 evening)
      smoothBakes: true,
    },
    dataSource,
  );

  // --- add / delete keyframes (active channel) ---
  const addKeyAtMouse = useCallback(
    (mx: number, my: number) => {
      const r = trackRanges[activeChannel];
      const frame = Math.max(0, Math.min(CURVE_FRAMES, Math.round(canvasPixelToFrame(mx))));
      const py = pixelToValue(my, view);
      const value = normalized ? (r ? r.min + py * r.span : py) : py;

      const tr = tracks[activeChannel];
      const id = `${activeChannel}-add-${frame.toFixed(0)}-${tr.keyframes.length}`;
      const inserted: Keyframe = { id, frame, value, interpolation: 'Bezier' };
      const merged = [...tr.keyframes, inserted].sort((a, b) => a.frame - b.frame);
      // Recompute auto-tangents for the inserted key and its immediate neighbours.
      const idx = merged.findIndex((k) => k.id === id);
      const withTangents = reTangentBezier(merged, (_k, n) => n >= idx - 1 && n <= idx + 1);
      genEdit(() => onTracksChange({ ...tracks, [activeChannel]: { ...tr, keyframes: withTangents } })); // discrete add
      setSelectedKeyframeIds([`${activeChannel}::${id}`]);
    },
    [activeChannel, tracks, trackRanges, canvasPixelToFrame, view, onTracksChange, normalized],
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!interactive || pencilMode || brushMode || waveArmed) return;
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return;
    addKeyAtMouse(e.clientX - rect.left, e.clientY - rect.top);
  };

  // --- PENCIL tool (shared with the timeline graph editor) ----------------------
  // Toggle on, then click-drag across the plot to sketch the ACTIVE channel's curve.
  // The stroke maps into the channel's range (basis frozen at pen-down) and is fit to
  // clean keyframes ONLY across the drawn span on release (one undo entry). Bias + move
  // are now handles in the selection box (GraphSelectionBBox), shared with the timeline.
  const { pencilMode, setPencilMode, beginPencil, brushMode, setBrushMode, beginBrush } = usePencilTool({
    interactionRef,
    overlayRef: pencilRef,
    view,
    maxFrame: CURVE_FRAMES,
    frameToCanvasPixel,
    canvasPixelToFrame,
    getTarget: () => {
      const info = CHANNELS.find((c) => c.key === activeChannel);
      return {
        trackId: activeChannel,
        color: info?.color,
        // the Detail dial reaches the tools too, so a Pencil stroke or a brush pass simplifies
        // at the tolerance the curve around it was fitted at (see `epsScale`)
        eps: chanDef(activeChannel).eps * epsScale,
        toValue: (py, v) => pixelToChannelValue(py, v, trackRanges[activeChannel], normalized),
      };
    },
    getKeys: (tid) => tracksRef.current[tid as ChannelKey]?.keyframes ?? [],
    commit: (tid, keys) =>
      genEdit(() => {
        const tr = tracksRef.current[tid as ChannelKey];
        if (tr) commitTracks({ ...tracksRef.current, [tid]: { ...tr, keyframes: keys } });
      }),
    // the brush's live preview: a plain write (the pointer-down bracket spans the gesture)
    preview: (tid, keys) => {
      const tr = tracksRef.current[tid as ChannelKey];
      if (tr) commitTracks({ ...tracksRef.current, [tid]: { ...tr, keyframes: keys } });
    },
  });

  // --- FUNCTION TOOL (the wave filter) ------------------------------------------
  // A filter, not a layer: live only while its parameters are being chosen, then baked to
  // keyframes and gone (owner — "GX is not a parametric editor"). The commit path is the
  // pencil's: samples → fitSamplesToKeys → spliceSpan, which keeps every key outside the
  // span and heals the seam. One `genEdit` bracket, so it is one Ctrl+Z.
  // @see palette/core/waveGen.ts · palette/components/WaveOverlay.tsx
  const waveEps = chanDef(activeChannel).eps * epsScale;
  const sampleWaveBase = useCallback(
    (frame: number) => {
      const tr = tracksRef.current[activeChannel];
      return tr ? evaluateTrackValue(tr.keyframes, frame, false, false) : 0;
    },
    [activeChannel],
  );
  /** The filtered track for a given wave, or null when the span is too narrow to commit. */
  const waveKeys = useCallback(
    (p: WaveParams): Keyframe[] | null => {
      const src = waveBaseRef.current;
      const win = waveSpanFrames(p, CURVE_FRAMES);
      if (!src || !win) return null;
      // Strength 0 means DO NOTHING, and it has to mean it exactly. The samples would already
      // equal the base at 0, but they would still go through `fitSamplesToKeys` — a
      // Douglas-Peucker approximation of the curve by itself, which drifts within eps and is
      // not the keys you started with (measured 2026-09-12: ~1% of full-scale). Every other
      // strength pays that refit because it is being changed anyway; zero must not.
      if (p.strength <= 0) return src;
      const samples = sampleWaveSpan(p, win.lo, win.hi, CURVE_FRAMES, waveRange, (f) =>
        evaluateTrackValue(src, f, false, false),
      );
      const spanKeys = fitSamplesToKeys(samples, win.lo, waveEps, `${activeChannel}-wave-${win.lo}-${win.hi}`);
      return spliceSpan(src, win.lo, win.hi, spanKeys);
    },
    [activeChannel, waveRange, waveEps],
  );

  /** Write a keyframe list to the armed channel WITHOUT a bracket — the tool holds one open
   *  across its whole session, so these are preview frames inside it, not undo entries. */
  const writeWave = useCallback(
    (keys: Keyframe[]) => {
      const tr = tracksRef.current[activeChannel];
      if (tr) commitTracks({ ...tracksRef.current, [activeChannel]: { ...tr, keyframes: keys } });
    },
    [activeChannel, commitTracks],
  );

  const armWave = useCallback(() => {
    setPencilMode(false);
    setBrushMode(false);
    setSelectedKeyframeIds([]);
    waveBaseRef.current = tracksRef.current[activeChannel]?.keyframes ?? null;
    waveChanRef.current = activeChannel;
    setWaveBaseTick((n) => n + 1);
    // Fit the t axis before arming (owner, 2026-09-12: "we need to do a graph resize to
    // ensure the outermost handles are visible"). The span squares sit at t=0 and t=1 by
    // default, so a zoomed-in view puts both off-screen with no way back — every gesture
    // that could pan is suppressed while the tool is modal. The VALUE axis needs no help:
    // the live preview is written into the track, so `trackRanges` grows with the wave and
    // the normalized plot keeps the crest and trough inside it by construction.
    fitAll();
    setWaveParams(lastWave);
    // ONE bracket for the whole tool session (closed by commit or cancel), so the live
    // preview writes below are invisible to undo and the result is a single Ctrl+Z.
    genEditStart();
    setWaveOn(true);
  }, [setPencilMode, setBrushMode, activeChannel, fitAll]);

  const closeWave = useCallback(() => {
    lastWave = waveParams; // the settings outlive the tool, on purpose
    // Put the channel back as it was, THEN close the bracket: endParamTransaction diffs
    // against the arm-time snapshot, so a restored track diffs to nothing and Esc leaves
    // no entry at all.
    if (waveBaseRef.current) writeWave(waveBaseRef.current);
    waveBaseRef.current = null;
    waveChanRef.current = null;
    genEditEnd();
    setWavePill(null);
    setWaveOn(false);
  }, [waveParams, writeWave]);

  const commitWave = useCallback(() => {
    // The track already HOLDS the previewed result (the effect below wrote it), so the
    // commit is just closing the bracket over it.
    const keys = waveKeys(waveParams);
    if (keys) writeWave(keys);
    lastWave = waveParams;
    waveBaseRef.current = null;
    waveChanRef.current = null;
    genEditEnd();
    setWavePill(null);
    setWaveOn(false);
  }, [waveParams, waveKeys, writeWave]);

  /**
   * THE LIVE PREVIEW (owner, 2026-09-12: "the gradient needs to update during the tool's use
   * so user can see what theyre doing"). The filtered curve is written into the track on
   * every parameter change, so the hero ramp, the result strip and the stops all follow the
   * drag — the overlay's own painted curve alone only ever showed the plot.
   */
  useEffect(() => {
    if (!waveArmed) return;
    // The base must belong to the channel being written. React runs this effect BEFORE the
    // channel effect below in the same commit, so right after a channel switch the ref still
    // holds the OLD channel's keyframes — sampling those and writing them into the new
    // channel is a real edit nobody asked for. It is invisible for a `replace` preset (which
    // ignores the base) and plainly wrong for an `add` one, which is the worst way for a bug
    // to behave. The channel effect re-bases and bumps the tick, which brings us back here.
    if (waveChanRef.current !== activeChannel) return;
    const keys = waveKeys(waveParams);
    if (keys) writeWave(keys);
  }, [waveArmed, waveParams, waveKeys, writeWave, waveBaseTick, activeChannel]);

  /**
   * Switching channel mid-tool (by the track list, or by applying a preset that names
   * another channel): put the OLD channel back first, then adopt the new one as the base.
   * Restoring is the half that is easy to miss — the live preview has been writing into the
   * old channel, and leaving it would strand a wave the user never committed.
   */
  useEffect(() => {
    if (!waveArmed) return;
    const prev = waveChanRef.current;
    // ONLY an actual switch. `armWave` already took the pristine snapshot, and this effect
    // also runs on arm (waveArmed is in its deps) — AFTER the preview effect has written.
    // Re-snapshotting there captures the already-previewed track as the "original", so Esc
    // restored to the wave instead of removing it (measured 2026-09-12: arm-then-cancel did
    // not return the gradient).
    if (prev === activeChannel) return;
    if (prev && waveBaseRef.current) {
      const tr = tracksRef.current[prev];
      if (tr) commitTracks({ ...tracksRef.current, [prev]: { ...tr, keyframes: waveBaseRef.current } });
    }
    waveChanRef.current = activeChannel;
    waveBaseRef.current = tracksRef.current[activeChannel]?.keyframes ?? null;
    setWaveBaseTick((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel, waveArmed]);

  /**
   * Apply a preset: its params, and the CHANNEL it names (owner: "preset carries its
   * channel"). A preset for a role this space does not have is never offered, so the
   * resolve below only fails if one slips through — then the channel is left alone rather
   * than the preset landing somewhere it does not mean.
   */
  const applyPreset = useCallback(
    (preset: WavePreset) => {
      const key = preset.role === 'active' ? activeChannel : channelForRole(space, preset.role);
      if (key && key !== activeChannel) setActiveChannel(key);
      setWaveParams((w) => presetParams(preset, w));
    },
    [activeChannel, space],
  );
  /** A preset's channel colour in THIS space, or null when the space has no such channel —
   *  which is how the head decides not to offer it (no lightness channel in RGB). */
  const presetColor = useCallback(
    (preset: WavePreset): string | null => {
      if (preset.role === 'active') return chanDef(activeChannel).color;
      const key = channelForRole(space, preset.role);
      return key ? chanDef(key).color : null;
    },
    [space, activeChannel, chanDef],
  );

  /** An unmount while armed (the face closes, the tracks go null) must not leak the open
   *  bracket — every later discrete edit would land inside it. */
  useEffect(() => () => { if (waveOn) genEditEnd(); }, [waveOn]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!interactive || waveArmed || shouldSuppressContextMenu()) return;
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const hit = getHit(e.clientX - rect.left, e.clientY - rect.top);
    if (hit && hit.type === 'key') {
      // Right-click a key removes it (down to the two endpoints).
      const tr = tracks[hit.trackId as ChannelKey];
      if (tr && tr.keyframes.length > 2) {
        genEdit(() => // discrete right-click remove — one undo entry
          onTracksChange({
            ...tracks,
            [hit.trackId]: { ...tr, keyframes: tr.keyframes.filter((k) => k.id !== hit.keyId) },
          }),
        );
        setSelectedKeyframeIds((prev) => prev.filter((id) => id !== `${hit.trackId}::${hit.keyId}`));
      }
    }
  };

  const handleMouseDownWrapped = (e: React.MouseEvent) => {
    if (!interactive) return; // read-only scope: no drag / pan / add
    // The wave filter is a MODE (owner): while it is armed no key, tangent or box gesture
    // reaches the canvas, so the only thing a pointer can move is the wave.
    if (waveArmed) return;
    // Smoothing brush (C.12): a left-drag over a stretch smooths the active channel there.
    if (brushMode && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      beginBrush(e);
      return;
    }
    // Pencil mode: a left-drag sketches the active channel (no modifiers).
    if (pencilMode && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      beginPencil(e);
      return;
    }
    // Ctrl+click on empty space adds a keyframe (matches GraphEditor).
    if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
      const rect = interactionRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (!getHit(mx, my)) {
          addKeyAtMouse(mx, my);
          return;
        }
      }
    }
    handleMouseDown(e);
  };

  // Delete / Backspace removes the selection while the editor is focused.
  const focusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = focusRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!interactive) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      // While the wave is armed the keyboard belongs to it: Enter bakes, Esc discards, and
      // Delete must NOT reach the selection (there is none, and the tool owns the canvas).
      if (waveArmed) {
        if (e.key === 'Enter') { e.preventDefault(); commitWave(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeWave(); }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [deleteSelected, interactive, waveArmed, commitWave, closeWave]);

  // Result strip under the graph.
  useEffect(() => {
    const cv = stripRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!previewRamp || previewRamp.length !== 256) return;
    const img = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = previewRamp[i].r;
      img.data[i * 4 + 1] = previewRamp[i].g;
      img.data[i * 4 + 2] = previewRamp[i].b;
      img.data[i * 4 + 3] = 255;
    }
    const tmp = document.createElement('canvas');
    tmp.width = 256;
    tmp.height = 1;
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, 256, 1, gutter, 0, cv.width - gutter, cv.height);
  }, [previewRamp, canvasWidth, gutter]);

  // The "source ghost" — faint dashed per-channel polylines of the RESULT channels
  // (`ghost`, post-global Modify chain) behind the editable bezier. Drawn with the
  // editor's OWN transform — `frameToCanvasPixel` (x) + `v2p` (y, honouring `normalized` +
  // `trackRanges`) — the exact pair the live curve uses. `trackRanges` folds in the ghost
  // extent (above), so the ghost never clips and shares the bezier's scale: with the
  // Modify chain neutral the ghost overlays the curve; under active Modify (hue rotate,
  // chroma, contrast, posterize…) it diverges to show what the dials did. Hue is already
  // unwrapped upstream to share the h track's continuous space.
  //
  // NOTE: this canvas is OVERLAID (not a true z-behind child) — GraphCanvas's back layer
  // paints an opaque background (THEME.backgroundColor), so a child behind it would be
  // hidden; a faint, pointer-events-none overlay reads as a ghost without forking the
  // read-only GraphCanvas.
  useEffect(() => {
    const cv = ghostRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!showGhost || !ghost) return;
    const N = 256;
    for (const ch of CHANNELS) {
      if (visible[ch.key] === false) continue;
      const vals = ghost[ch.key];
      if (!vals || vals.length === 0) continue;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = frameToCanvasPixel((i / (N - 1)) * CURVE_FRAMES);
        const y = v2p(vals[i], ch.key);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const active = ch.key === activeChannel;
      ctx.strokeStyle = ch.color;
      ctx.globalAlpha = active ? 0.5 : 0.28;
      ctx.lineWidth = active ? 2 : 1.25;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Ghost POINTS — the control-point frames a re-fit would place at the current
    // detail/smooth, drawn ON the ghost line (Y read straight off the ghost sample at
    // each frame, so the dots always sit on the dashed curve). This makes the two fit
    // sliders self-explanatory: detail changes the dot COUNT, smooth shifts WHERE they
    // land. Faint hollow dots, the active channel a touch bolder.
    if (ghostPoints) {
      for (const ch of CHANNELS) {
        if (visible[ch.key] === false) continue;
        const frames = ghostPoints[ch.key];
        const vals = ghost[ch.key];
        if (!frames || !vals || vals.length === 0) continue;
        const active = ch.key === activeChannel;
        // hollow dots: filled with the canvas GROUND, not a literal near-black — on a
        // light interface the ground is near-white and a black fill read as solid dots.
        ctx.fillStyle = THEME.backgroundColor;
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = active ? 1.5 : 1;
        ctx.globalAlpha = active ? 0.7 : 0.4;
        const radius = active ? 2.6 : 2;
        for (const f of frames) {
          const idx = Math.max(0, Math.min(vals.length - 1, Math.round(f)));
          const x = frameToCanvasPixel(f);
          const y = v2p(vals[idx], ch.key);
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }, [ghost, ghostPoints, showGhost, visible, v2p, frameToCanvasPixel, activeChannel, canvasWidth, canvasHeight]);

  const highlightedTracks = useMemo(() => new Set([activeChannel]), [activeChannel]);

  // Undo bracketing for DRAGS: a pointerdown in the editor opens a param transaction,
  // the window pointerup closes it — so a handle/key/tool drag is ONE undo entry (the
  // net tracks change). endParamTransaction no-ops when nothing changed, so clicks that
  // self-bracket via genEdit (inspector actions, add/remove key) just see an empty outer
  // transaction. The graph's own mutations (updateKeyframes during drag) are unbracketed
  // so they fall inside this window rather than spamming one entry per pointermove.
  // Gated on `interactive`: a read-only scope never opens a bracket, and since the editor
  // is now always-mounted this avoids firing endParamTransaction on every app-wide
  // pointerup while the Generator panel is just showing the scope.
  useEffect(() => {
    // Suppressed while the wave is armed: that tool holds ONE bracket across its whole
    // session, and a per-drag pointerup close inside it would push an undo entry per handle
    // drag instead of one per wave.
    if (!interactive || waveArmed) return;
    const end = () => genEditEnd();
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [interactive, waveArmed]);

  /* Graph tools: fit all, fit selection, normalize, pencil, simplify, bake, smooth, ghost.
     In read-only scope mode only the view tools (fit-all, normalize) + the ghost toggle are
     shown — the editing tools need editable curves. (Bias + move are handles in the selection
     box now.) Rendered into a floating COLUMN over the plot on a desk, which wraps into
     evenly-split columns when it is taller than the plot, and into a horizontal STRIP above
     the plot on a phone (owner, 2026-09-12) — where a column over the curve costs the left of
     every gesture aimed at it. */
  const toolButtons = (
    <>
      <ToolButton onClick={fitAll} icon={<FitIcon />} tooltip="Fit all" />
      {interactive && <ToolButton onClick={fitSelection} icon={<FitSelectionIcon />} tooltip="Fit selection" />}
      {normalizeToggle && <ToolButton onClick={toggleNormalize} active={normalized} icon={<NormIcon active={normalized} />} tooltip="Normalize (0–1)" />}
      {interactive && (
        <ToolButton
          onClick={() => { setPencilMode((p) => !p); setBrushMode(false); }}
          active={pencilMode}
          icon={<PencilIcon active={pencilMode} />}
          tooltip="Pencil — draw the active channel's curve (click-drag across the plot)"
        />
      )}
      {interactive && (
        <ToolButton
          onClick={() => { setBrushMode((b) => !b); setPencilMode(false); }}
          active={brushMode}
          icon={<BrushIcon active={brushMode} />}
          tooltip="Smoothing brush — drag over a stretch to bake, smooth and simplify the active channel there"
          tag="smooth-brush"
        />
      )}
      {interactive && <ToolButton onPointerDown={tools.handleSimplifyDown} active={tools.isSimplifying} icon={<MagicIcon active={tools.isSimplifying} />} tooltip="Simplify (drag L/R)" />}
      {interactive && <ToolButton onPointerDown={tools.handleBakeDown} active={tools.isBaking} icon={<BakeIcon active={tools.isBaking} />} tooltip="Bake / resample (drag)" />}
      {interactive && <ToolButton onPointerDown={tools.handleSmoothDown} active={tools.isSmoothing} icon={<WaveIcon active={tools.isSmoothing} />} tooltip="Smooth (right) / bounce (left) — bakes the selected keys and their neighbours first" tag="smooth" />}
      {/* The FUNCTION TOOL. Its icon is the Sine glyph the tool itself traces (SHAPE_PATHS),
          not a hand-drawn one — so it cannot say something the tool does not do. */}
      {interactive && (
        <ToolButton
          onClick={armWave}
          active={waveOn}
          icon={
            <svg width="18" height="15" viewBox="0 0 22 18" aria-hidden="true">
              <path d={SHAPE_PATHS.Sine} fill="none" stroke="currentColor" strokeWidth={1.6} />
            </svg>
          }
          tooltip="Function — add a sine / saw / pulse / noise wave to this channel, then bake it"
          tag="wave"
        />
      )}
    </>
  );

  const waveHead = (
    <WaveToolHead
      shape={waveParams.shape}
      mode={waveParams.mode}
      onShape={(shape) => setWaveParams((w) => ({ ...w, shape }))}
      onMode={(mode) => setWaveParams((w) => ({ ...w, mode }))}
      onReseed={() => setWaveParams((w) => ({ ...w, seed: (w.seed + 1 + Math.floor(Math.random() * 97)) | 0 }))}
      onPreset={applyPreset}
      presetColor={presetColor}
      strength={waveParams.strength}
      onStrength={(v) => setWaveParams((w) => ({ ...w, strength: v }))}
      onPill={setWavePill}
      onCommit={commitWave}
      onCancel={closeWave}
      channelColor={CHANNELS.find((c) => c.key === activeChannel)?.color ?? '#22d3ee'}
      channelLabel={CHANNELS.find((c) => c.key === activeChannel)?.label ?? activeChannel}
    />
  );

  const trackList = (
    <ChannelTrackSidebar
      horizontal={phone}
      spaceChooser={spaceChooser}
      channels={CHANNELS}
      visible={visible}
      activeChannel={activeChannel}
      onToggleVisible={(k) => setVisible((v) => ({ ...v, [k]: v[k] === false }))}
      onSelectChannel={setActiveChannel}
      onSelectKeys={(k) => {
        const tr = tracks[k];
        if (tr) setSelectedKeyframeIds(tr.keyframes.map((kf) => `${k}::${kf.id}`));
      }}
      layers={ghost ? [{ key: 'ghost', label: 'Fit ghost', color: '#9ca3af', dashed: true, visible: showGhost, onToggle: () => setGhostVisible((g) => !g) }] : []}
      onSelectAll={() => {
        const all: string[] = [];
        displayTrackIds.forEach((t) => tracks[t as ChannelKey]?.keyframes.forEach((kf) => all.push(`${t}::${kf.id}`)));
        setSelectedKeyframeIds(all);
      }}
      onDeselectAll={() => setSelectedKeyframeIds([])}
    />
  );

  return (
    <div
      ref={focusRef}
      tabIndex={0}
      onPointerDownCapture={interactive && !waveArmed ? () => genEditStart() : undefined}
      className={`w-full outline-none select-none ${phone ? 'flex flex-col' : 'flex'}`}
      style={phone ? undefined : { height }}
    >
      {/* PHONE: the track list and the tools are two strips ABOVE the plot, so the plot keeps
          the whole width. Both scroll sideways rather than wrapping — a second line of either
          would come out of the curve, which is the thing being looked at. */}
      {phone && trackList}
      {/* PHONE: arming the wave SWAPS this strip for the tool's head (owner, 2026-09-12:
          "on mobile it can replace the graph's upper head type section") — same row, same
          height, so the plot never moves under the finger that armed it. */}
      {phone && (waveArmed ? waveHead : (
        <div className="w-full flex items-center gap-1 px-2 py-1 overflow-x-auto gx-rail-scroll border-b border-line/10 bg-surface-dock/60">
          {toolButtons}
        </div>
      ))}
      <div className="contents">
      {!phone && trackList}

      <div className="flex-1 min-w-0 flex flex-col">
        <div ref={interactionRef} className="relative" style={{ width: canvasWidth, height: canvasHeight, cursor: pencilMode || brushMode ? PENCIL_CURSOR : undefined }}>
          {/* DESK: the wave's head takes the floating tool column's place — a bar across the
              plot's top edge while the tool is armed. It FLOATS rather than sitting in the
              flex column because that column's canvas has an explicit height: an in-flow row
              there is crushed to 9 px (measured, 2026-09-12), and giving it real height would
              shrink the canvas and re-run the fit effect, throwing away the user's zoom every
              time the tool is armed. The tool column is suppressed while armed, so the two
              never overlap. */}
          {!phone && waveArmed && (
            <div className="absolute top-0 left-0 right-0 z-30">{waveHead}</div>
          )}
          {/* Graph tools — DESKTOP position: a column floating over the plot's top-left.
              On a phone the same buttons are a strip above the plot (see the root). */}
          {!phone && !waveArmed && (
            <div
              className="absolute top-1 left-1 flex flex-col flex-wrap content-start gap-1 z-20"
              style={{ maxHeight: balancedToolColumnMaxHeight(interactive ? 8 : 3, canvasHeight - 4 - 8) }}
            >
              {toolButtons}
            </div>
          )}
          <GraphCanvas
            width={canvasWidth}
            height={canvasHeight}
            view={view}
            sequence={sequence}
            trackIds={displayTrackIds}
            currentFrame={HIDDEN_FRAME}
            durationFrames={CURVE_FRAMES}
            selectedKeyframeIds={selectedKeyframeIds}
            selectionBox={selectionBox}
            normalized={normalized}
            trackRanges={trackRanges}
            softSelectionEnabled={softEnabled}
            softSelectionRadius={softRadius}
            softSelectionType={softType}
            softInteraction={softInteraction}
            highlightedTracks={highlightedTracks}
            onMouseDown={handleMouseDownWrapped}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            cursor={pencilMode || brushMode ? PENCIL_CURSOR : undefined}
            hideKeyframes={waveArmed}
            leftGutter={gutter}
          />
          {/* Source ghost — overlays the graph, faint + pointer-events-none (see effect). */}
          <canvas
            ref={ghostRef}
            width={canvasWidth}
            height={canvasHeight}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: canvasWidth, height: canvasHeight }}
          />
          {/* Pencil stroke preview — drawn imperatively while sketching, cleared on commit.
              No z-index: paints above the graph (later sibling) but below the tool panel
              (z-20) and selection box (z-30). */}
          <canvas
            ref={pencilRef}
            width={canvasWidth}
            height={canvasHeight}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: canvasWidth, height: canvasHeight }}
          />
          {/* The selection box is one of the "other canvas handles" the wave suppresses. */}
          {!waveArmed && (
            <GraphSelectionBBox
              sequence={sequence}
              selectedKeyframeIds={selectedKeyframeIds}
              view={view}
              normalized={normalized}
              frameToCanvasPixel={frameToCanvasPixel}
              v2p={v2p}
              dataSource={dataSource}
              p2v={p2v}
            />
          )}
          {waveArmed && (
            <WaveOverlay
              params={waveParams}
              onChange={setWaveParams}
              onPill={setWavePill}
              width={canvasWidth}
              height={canvasHeight}
              maxFrame={CURVE_FRAMES}
              frameToCanvasPixel={frameToCanvasPixel}
              valueToPixelY={(v) => v2p(v, activeChannel)}
              sampleBase={sampleWaveBase}
              range={waveRange}
              color={CHANNELS.find((c) => c.key === activeChannel)?.color ?? '#22d3ee'}
            />
          )}
          {(tools.isSmoothing || tools.isBaking || tools.isSimplifying) && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-surface/80 text-accent-300 px-2 py-0.5 rounded-full border border-accent-500/40 text-[10px] z-30 pointer-events-none">
              {tools.isSmoothing
                ? tools.smoothingRadius >= 0
                  ? `Smooth ${tools.smoothingRadius.toFixed(1)}`
                  : `Bounce ${Math.abs(tools.smoothingRadius).toFixed(1)}`
                : tools.isBaking
                  ? `Bake every ${tools.bakeStep}`
                  : `Simplify ${(tools.simplifyStrength * 100) | 0}%`}
            </div>
          )}
          {pencilMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-surface/80 text-accent-300 px-2 py-0.5 rounded-full border border-accent-500/40 text-[10px] z-30 pointer-events-none">
              Pencil — drag to draw {CHANNELS.find((c) => c.key === activeChannel)?.label}
            </div>
          )}
          {/* The wave's ONLY text, and only while a drag is live — the same pill the drag
              tools above already use, so the function tool adds no chrome of its own. It
              sits BELOW the head rather than at the usual top-2: on a desk the head floats
              over the plot's top edge, and the pill landed on top of the mode buttons. */}
          {waveArmed && wavePill && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-surface/80 text-accent-300 px-2 py-0.5 rounded-full border border-accent-500/40 text-[10px] z-30 pointer-events-none tabular-nums">
              {wavePill}
            </div>
          )}
        </div>
        <canvas ref={stripRef} width={canvasWidth} height={STRIP_H} className="block" style={{ width: canvasWidth, height: STRIP_H }} />
      </div>
      </div>

      {/* PHONE: the inspector sits under the plot rather than beside it; desktop keeps it
          beside. Either way it starts MINIMIZED and the user opens it (owner, 2026-09-12) —
          on the phone that is a full-width bar, on the desk the side rail. */}
      <KeyframeInspector dataSource={dataSource} collapsed={inspectorCollapsed} onCollapsedChange={setInspectorCollapsed} wide={phone} />
    </div>
  );
};

export default ChannelGraphEditor;
