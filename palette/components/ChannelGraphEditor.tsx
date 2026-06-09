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
 * local `GraphDataSource` built below — no scrub/playhead, no track selection,
 * no undo snapshot, no engine side-effect. See utils/GraphDataSource.ts.
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
} from '../../utils/GraphUtils';
import { GRAPH_LEFT_GUTTER_WIDTH, GRAPH_RULER_HEIGHT } from '../../data/constants';
import { calculateViewBounds } from '../../utils/keyframeViewBounds';
import { calculateTangentModeUpdates, calculateGlobalInterpolationUpdates } from '../../utils/timelineUtils';
import { FitIcon, FitSelectionIcon, NormIcon, WaveIcon, BakeIcon, MagicIcon, EyeIcon, PencilIcon, BiasIcon } from '../../components/Icons';
import type { Track, Keyframe, AnimationSequence, SoftSelectionType } from '../../types';
import type { RGB } from '../core/oklab';
import type { Channels } from '../core/generatorPipeline';
import { CURVE_FRAMES, rampToBezierTrack, reTangentBezier } from '../core/channelCurve';
import { useGraphInteraction } from '../../hooks/useGraphInteraction';
import { useGraphTools } from '../../hooks/useGraphTools';
import { GraphSelectionBBox } from '../../components/graph/GraphSelectionBBox';
import type { GraphDataSource } from '../../utils/GraphDataSource';
import { KeyframeInspector } from '../../components/timeline/KeyframeInspector';
import { ChannelTrackSidebar, type ChannelInfo } from './ChannelTrackSidebar';
import { genEdit, genEditStart, genEditEnd } from '../store/generatorStore';

export type ChannelKey = 'L' | 'C' | 'h';
export type ChannelTracks = Record<ChannelKey, Track>;

// Colours match GraphRenderer.TRACK_COLORS by index (L cyan, C purple, h green).
const CHANNELS: ChannelInfo[] = [
  { key: 'L', label: 'Lightness', color: '#22d3ee' },
  { key: 'C', label: 'Chroma', color: '#a855f7' },
  { key: 'h', label: 'Hue', color: '#22c55e' },
];

const SIDEBAR_W = 112;
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
}> = ({ onClick, onPointerDown, icon, tooltip, active }) => (
  <button
    onClick={onClick}
    onPointerDown={onPointerDown}
    title={tooltip}
    className={`group/btn relative w-6 h-6 flex items-center justify-center rounded border transition-all ${
      active ? 'bg-cyan-900/80 text-cyan-300 border-cyan-500/50' : 'bg-black/60 text-gray-400 border-white/10 hover:text-white'
    }`}
  >
    {icon}
  </button>
);

interface ChannelGraphEditorProps {
  tracks: ChannelTracks;
  onTracksChange: (tracks: ChannelTracks) => void;
  width: number;
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
  ghost?: Channels | null;
  /**
   * Per-channel prospective-fit keyframe FRAMES at the host's current detail/smooth —
   * drawn as faint "ghost points" ON the ghost curve so those two sliders are legible:
   * detail = how many points; smooth = where they land. Frames are 0..CURVE_FRAMES (==
   * the ghost sample index). (generatorStore.prospectiveFitFrames.)
   */
  ghostPoints?: Record<ChannelKey, number[]> | null;
  /**
   * When false the editor is a read-only SCOPE: no keyframe edits, the editing tools are
   * hidden, but the axes + ghost still render. Used before any curves are fit so the
   * channel scope (and the Modify chain's effect) is always visible. Default true.
   */
  interactive?: boolean;
}

export const ChannelGraphEditor: React.FC<ChannelGraphEditorProps> = ({
  tracks,
  onTracksChange,
  width,
  height,
  previewRamp,
  ghost,
  ghostPoints,
  interactive = true,
}) => {
  const interactionRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const pencilRef = useRef<HTMLCanvasElement>(null);

  const [activeChannel, setActiveChannel] = useState<ChannelKey>('L');
  const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<string[]>([]);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  // The sidebar (112) + inspector (256) + a usable canvas don't fit on a narrow
  // (phone) editor, so the inspector overflows over the graph. Auto-collapse it to
  // its rail when the area is narrow; only fires on a width change, so the user can
  // still expand it manually at that size.
  useEffect(() => {
    if (width > 0 && width < 560) setInspectorCollapsed(true);
  }, [width]);
  const [normalized, setNormalized] = useState(true);
  const [visible, setVisible] = useState<Record<string, boolean>>({ L: true, C: true, h: true });
  // Source-ghost visibility — a transient local UI flag (like `normalized` / `visible`),
  // NOT a DDFS param. Default on so the prospective fit is visible the moment curves exist.
  const [ghostVisible, setGhostVisible] = useState(true);
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
  const inspectorW = inspectorCollapsed ? INSPECTOR_W_COLLAPSED : INSPECTOR_W;
  const canvasWidth = Math.max(120, width - SIDEBAR_W - inspectorW);
  const canvasHeight = Math.max(80, height - STRIP_H);

  // Fit the t-axis (0..CURVE_FRAMES) across the canvas and the normalized
  // vertical [0,1] into the plot area whenever the size changes.
  useEffect(() => {
    const available = canvasWidth - GRAPH_LEFT_GUTTER_WIDTH;
    if (available <= 0) return;
    setFrameWidth(available / CURVE_FRAMES);
    setScrollLeft(0);
    setViewY({ pan: 0.5, scale: Math.max(20, canvasHeight - GRAPH_RULER_HEIGHT - 30) });
  }, [canvasWidth, canvasHeight]);

  const sequence: AnimationSequence = useMemo(
    () => ({ durationFrames: CURVE_FRAMES, tracks: { ...tracks } }),
    [tracks],
  );

  const trackIds = useMemo(() => CHANNELS.map((c) => c.key), []);
  // Only visible channels are drawn / hit-tested / fit / tooled.
  const displayTrackIds = useMemo(() => trackIds.filter((t) => visible[t] !== false), [trackIds, visible]);

  const view: GraphViewTransform = useMemo(() => {
    const panX = scrollLeft / frameWidth;
    return { panX, panY: viewY.pan, scaleX: frameWidth, scaleY: viewY.scale, width: canvasWidth, height: canvasHeight };
  }, [scrollLeft, frameWidth, viewY, canvasWidth, canvasHeight]);

  // Per-channel value range (min/max of keyframes), padded — same shape as GraphEditor's
  // trackRanges. Normalized rendering maps each to [0,1]. The GHOST extent is folded in so
  // the result ghost (which can swing outside the keyframe band under the Modify chain, or
  // be the only data when there are no keyframes yet) always stays in view AND shares the
  // editable curve's scale — they overlay where equal and diverge to show what Modify did.
  // Gated on `ghostVisible`: hiding the ghost must also drop its range contribution, else
  // the editable bezier would stay compressed with no visible cause.
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
      const g = ghostVisible ? ghost?.[tid as ChannelKey] : undefined;
      if (g) for (let i = 0; i < g.length; i++) {
        if (g[i] < min) min = g[i];
        if (g[i] > max) max = g[i];
      }
      if (!isFinite(min) || !isFinite(max)) {
        min = 0;
        max = 1;
      } else if (max - min < 0.00001) {
        min -= 0.5;
        max += 0.5;
      }
      ranges[tid] = { min, max, span: max - min };
    });
    return ranges;
  }, [tracks, trackIds, ghost, ghostVisible]);

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
  const frameToCanvasPixel = useCallback((f: number) => frameToPixel(f, view) + GRAPH_LEFT_GUTTER_WIDTH, [view]);
  const canvasPixelToFrame = useCallback((px: number) => pixelToFrame(px - GRAPH_LEFT_GUTTER_WIDTH, view), [view]);

  // --- view fitting (ported from GraphEditor) ---
  const applyFit = useCallback(
    (bounds: { minV: number; maxV: number; minF: number; maxF: number } | null, norm: boolean) => {
      const availW = Math.max(10, canvasWidth - GRAPH_LEFT_GUTTER_WIDTH);
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
  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  });
  const updateKeyframes = useCallback(
    (updates: { trackId: string; keyId: string; patch: Partial<Keyframe> }[]) => {
      const next: ChannelTracks = { ...tracksRef.current };
      for (const { trackId, keyId, patch } of updates) {
        const tr = next[trackId as ChannelKey];
        if (!tr) continue;
        next[trackId as ChannelKey] = {
          ...tr,
          keyframes: tr.keyframes.map((k) => (k.id === keyId ? { ...k, ...patch } : k)),
        };
      }
      onTracksChange(next);
    },
    [onTracksChange],
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
      onTracksChange(next);
    },
    [onTracksChange],
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
    GRAPH_LEFT_GUTTER_WIDTH,
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
    if (!interactive || pencilMode) return;
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return;
    addKeyAtMouse(e.clientX - rect.left, e.clientY - rect.top);
  };

  // --- BIAS tool (a 2D redistribution drag) -------------------------------------
  // Drag horizontally to bias the selected points' TIME distribution (bunch toward
  // one end), vertically to bias their VALUE distribution — both as a power curve
  // anchored at the selection's bounding span, so the end points stay put and the
  // interior redistributes. Shift constrains to the dominant axis; Alt = fine
  // (quarter-speed). Operates on the selection (≥2 pts on a track), else the whole
  // visible track. The drag is bracketed by the editor's pointerdown/up undo window.
  const [isBiasing, setIsBiasing] = useState(false);
  const [biasReadout, setBiasReadout] = useState<{ gx: number; gy: number } | null>(null);
  const biasRef = useRef<{
    startX: number;
    startY: number;
    perTrack: { tid: string; orig: Keyframe[]; targetIds: Set<string>; minF: number; spanF: number; minV: number; spanV: number }[];
  } | null>(null);
  const BIAS_OCTAVE = 150; // px of drag per power-of-two of bias

  const applyBias = (dxRaw: number, dyRaw: number, shift: boolean, alt: boolean) => {
    const st = biasRef.current;
    if (!st) return;
    let dx = dxRaw;
    let dy = dyRaw;
    if (alt) { dx *= 0.25; dy *= 0.25; }
    if (shift) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
    const gx = Math.pow(2, -dx / BIAS_OCTAVE); // drag right → gx<1 → bunch toward later frames
    const gy = Math.pow(2, dy / BIAS_OCTAVE); //  drag up (dy<0) → gy<1 → bunch toward higher values
    const bias = (u: number, g: number) => (u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(u, g));
    const next: ChannelTracks = { ...tracksRef.current };
    for (const pt of st.perTrack) {
      const tr = next[pt.tid as ChannelKey];
      if (!tr) continue;
      const rebuilt = pt.orig
        .map((k) => {
          if (!pt.targetIds.has(k.id)) return k;
          let frame = k.frame;
          let value = k.value;
          if (pt.spanF > 0) frame = pt.minF + pt.spanF * bias((k.frame - pt.minF) / pt.spanF, gx);
          if (pt.spanV > 0) value = pt.minV + pt.spanV * bias((k.value - pt.minV) / pt.spanV, gy);
          return { ...k, frame: Math.max(0, Math.round(frame)), value };
        })
        .sort((a, b) => a.frame - b.frame);
      // Re-auto-tangent the biased Bezier keys so the curve stays smooth after the
      // spacing change (hand-broken tangents are preserved by reTangentBezier).
      next[pt.tid as ChannelKey] = { ...tr, keyframes: reTangentBezier(rebuilt, (k) => pt.targetIds.has(k.id)) };
    }
    onTracksChange(next);
    setBiasReadout({ gx, gy });
  };

  const handleBiasMove = (e: PointerEvent) => {
    const st = biasRef.current;
    if (!st) return;
    applyBias(e.clientX - st.startX, e.clientY - st.startY, e.shiftKey, e.altKey);
  };
  const handleBiasUp = () => {
    setIsBiasing(false);
    setBiasReadout(null);
    biasRef.current = null;
    window.removeEventListener('pointermove', handleBiasMove);
    window.removeEventListener('pointerup', handleBiasUp);
  };
  const handleBiasDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const cloneKeys = (ks: Keyframe[]) =>
      ks.map((k) => ({ ...k, leftTangent: k.leftTangent ? { ...k.leftTangent } : undefined, rightTangent: k.rightTangent ? { ...k.rightTangent } : undefined }));
    const perTrack: NonNullable<typeof biasRef.current>['perTrack'] = [];
    const addTrack = (tid: string, ids: Set<string> | null) => {
      const tr = tracks[tid as ChannelKey];
      if (!tr) return;
      const targets = ids ? tr.keyframes.filter((k) => ids.has(k.id)) : tr.keyframes;
      if (targets.length < 2) return;
      let minF = Infinity, maxF = -Infinity, minV = Infinity, maxV = -Infinity;
      targets.forEach((k) => {
        if (k.frame < minF) minF = k.frame;
        if (k.frame > maxF) maxF = k.frame;
        if (k.value < minV) minV = k.value;
        if (k.value > maxV) maxV = k.value;
      });
      perTrack.push({ tid, orig: cloneKeys(tr.keyframes), targetIds: new Set(targets.map((k) => k.id)), minF, spanF: maxF - minF, minV, spanV: maxV - minV });
    };
    // Selection drives it when ≥2 keys are selected on some track; else the whole visible track.
    const byTrack = new Map<string, Set<string>>();
    selectedKeyframeIds.forEach((cid) => {
      const [t, k] = cid.split('::');
      if (!byTrack.has(t)) byTrack.set(t, new Set());
      byTrack.get(t)!.add(k);
    });
    if (Array.from(byTrack.values()).some((s) => s.size >= 2)) byTrack.forEach((ids, tid) => addTrack(tid, ids));
    else displayTrackIds.forEach((tid) => addTrack(tid, null));
    if (perTrack.length === 0) return;
    biasRef.current = { startX: e.clientX, startY: e.clientY, perTrack };
    setIsBiasing(true);
    setBiasReadout({ gx: 1, gy: 1 });
    window.addEventListener('pointermove', handleBiasMove);
    window.addEventListener('pointerup', handleBiasUp);
  };

  // --- PENCIL tool (draw keyframes onto the active channel) ---------------------
  // Toggle on, then click-drag across the plot to sketch the active channel's curve.
  // The pixel→value mapping is CAPTURED at pen-down ("normalize on start") so the
  // stroke maps cleanly into the track's value range and can't warp mid-draw; on
  // release the freehand stroke is fit to a clean Bezier track (one undo entry).
  const [pencilMode, setPencilMode] = useState(false);
  const pencilRefData = useRef<{
    basisView: GraphViewTransform;
    basisRange?: { min: number; max: number; span: number };
    basisNormalized: boolean;
    channel: ChannelKey;
    color?: string;
    points: { frame: number; py: number }[];
  } | null>(null);

  const drawPencilStroke = () => {
    const st = pencilRefData.current;
    const cv = pencilRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!st || st.points.length < 1) return;
    ctx.beginPath();
    st.points.forEach((p, i) => {
      const x = frameToCanvasPixel(p.frame);
      if (i === 0) ctx.moveTo(x, p.py);
      else ctx.lineTo(x, p.py);
    });
    ctx.strokeStyle = st.color ?? '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const pencilMove = (e: MouseEvent) => {
    const st = pencilRefData.current;
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!st || !rect) return;
    st.points.push({ frame: canvasPixelToFrame(e.clientX - rect.left), py: e.clientY - rect.top });
    drawPencilStroke();
  };
  const pencilUp = () => {
    const st = pencilRefData.current;
    pencilRefData.current = null;
    window.removeEventListener('mousemove', pencilMove);
    window.removeEventListener('mouseup', pencilUp);
    const cv = pencilRef.current;
    cv?.getContext('2d')?.clearRect(0, 0, cv.width, cv.height);
    if (!st || st.points.length < 2) return;
    // Map screen-Y → channel value through the basis captured at pen-down.
    const p2vStart = (py: number) => pixelToChannelValue(py, st.basisView, st.basisRange, st.basisNormalized);
    const pts = st.points
      .map((p) => ({ f: Math.max(0, Math.min(CURVE_FRAMES, p.frame)), v: p2vStart(p.py) }))
      .sort((a, b) => a.f - b.f);
    // Rasterize the stroke to 256 samples: linear within the drawn span, holding the
    // nearest end value outside it (so an un-drawn region just extends flat).
    const N = 256;
    const vals = new Array<number>(N);
    const minF = pts[0].f;
    const maxF = pts[pts.length - 1].f;
    let j = 0;
    for (let i = 0; i < N; i++) {
      const f = (i / (N - 1)) * CURVE_FRAMES;
      if (f <= minF) { vals[i] = pts[0].v; continue; }
      if (f >= maxF) { vals[i] = pts[pts.length - 1].v; continue; }
      while (j < pts.length - 1 && pts[j + 1].f < f) j++;
      const a = pts[j];
      const b = pts[Math.min(pts.length - 1, j + 1)];
      const t = b.f > a.f ? (f - a.f) / (b.f - a.f) : 0;
      vals[i] = a.v + (b.v - a.v) * t;
    }
    const info = CHANNELS.find((c) => c.key === st.channel)!;
    const fitted = rampToBezierTrack(vals, st.channel, info.label, { eps: st.channel === 'h' ? 0.06 : 0.01, color: st.color });
    genEdit(() => {
      const tr = tracksRef.current[st.channel];
      if (tr) onTracksChange({ ...tracksRef.current, [st.channel]: { ...tr, keyframes: fitted.keyframes } });
    });
    setSelectedKeyframeIds(fitted.keyframes.map((k) => `${st.channel}::${k.id}`));
  };
  const beginPencil = (e: React.MouseEvent) => {
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const info = CHANNELS.find((c) => c.key === activeChannel);
    pencilRefData.current = {
      basisView: view,
      basisRange: trackRanges[activeChannel],
      basisNormalized: normalized,
      channel: activeChannel,
      color: info?.color,
      points: [{ frame: canvasPixelToFrame(e.clientX - rect.left), py: e.clientY - rect.top }],
    };
    window.addEventListener('mousemove', pencilMove);
    window.addEventListener('mouseup', pencilUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!interactive || shouldSuppressContextMenu()) return;
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
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [deleteSelected, interactive]);

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
    ctx.drawImage(tmp, 0, 0, 256, 1, GRAPH_LEFT_GUTTER_WIDTH, 0, cv.width - GRAPH_LEFT_GUTTER_WIDTH, cv.height);
  }, [previewRamp, canvasWidth]);

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
    if (!ghostVisible || !ghost) return;
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
        ctx.fillStyle = '#0a0a0a';
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
  }, [ghost, ghostPoints, ghostVisible, visible, v2p, frameToCanvasPixel, activeChannel, canvasWidth, canvasHeight]);

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
    if (!interactive) return;
    const end = () => genEditEnd();
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [interactive]);

  return (
    <div
      ref={focusRef}
      tabIndex={0}
      onPointerDownCapture={interactive ? () => genEditStart() : undefined}
      className="flex w-full outline-none select-none"
      style={{ height }}
    >
      <ChannelTrackSidebar
        channels={CHANNELS}
        visible={visible}
        activeChannel={activeChannel}
        onToggleVisible={(k) => setVisible((v) => ({ ...v, [k]: v[k] === false }))}
        onSelectChannel={setActiveChannel}
        onSelectKeys={(k) => {
          const tr = tracks[k];
          if (tr) setSelectedKeyframeIds(tr.keyframes.map((kf) => `${k}::${kf.id}`));
        }}
        onSelectAll={() => {
          const all: string[] = [];
          displayTrackIds.forEach((t) => tracks[t as ChannelKey]?.keyframes.forEach((kf) => all.push(`${t}::${kf.id}`)));
          setSelectedKeyframeIds(all);
        }}
        onDeselectAll={() => setSelectedKeyframeIds([])}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <div ref={interactionRef} className={`relative ${pencilMode ? 'cursor-crosshair' : ''}`} style={{ width: canvasWidth, height: canvasHeight }}>
          {/* Graph tools: fit all, fit selection, normalize, pencil, simplify, bake,
              smooth, bias, ghost. In read-only scope mode only the view tools (fit-all,
              normalize) + the ghost toggle are shown — the editing tools need editable
              curves. The column WRAPS into a second column (content-start) when it's
              taller than the plot, so the buttons never run off the bottom. */}
          <div
            className="absolute top-7 left-1 flex flex-col flex-wrap content-start gap-1 z-20"
            style={{ maxHeight: Math.max(60, canvasHeight - 28 - 8) }}
          >
            <ToolButton onClick={fitAll} icon={<FitIcon />} tooltip="Fit all" />
            {interactive && <ToolButton onClick={fitSelection} icon={<FitSelectionIcon />} tooltip="Fit selection" />}
            <ToolButton onClick={toggleNormalize} active={normalized} icon={<NormIcon active={normalized} />} tooltip="Normalize (0–1)" />
            {interactive && (
              <ToolButton
                onClick={() => setPencilMode((p) => !p)}
                active={pencilMode}
                icon={<PencilIcon active={pencilMode} />}
                tooltip="Pencil — draw the active channel's curve (click-drag across the plot)"
              />
            )}
            {interactive && <ToolButton onPointerDown={tools.handleSimplifyDown} active={tools.isSimplifying} icon={<MagicIcon active={tools.isSimplifying} />} tooltip="Simplify (drag L/R)" />}
            {interactive && <ToolButton onPointerDown={tools.handleBakeDown} active={tools.isBaking} icon={<BakeIcon active={tools.isBaking} />} tooltip="Bake / resample (drag)" />}
            {interactive && <ToolButton onPointerDown={tools.handleSmoothDown} active={tools.isSmoothing} icon={<WaveIcon active={tools.isSmoothing} />} tooltip="Smooth (right) / bounce (left)" />}
            {interactive && (
              <ToolButton
                onPointerDown={handleBiasDown}
                active={isBiasing}
                icon={<BiasIcon active={isBiasing} />}
                tooltip="Bias — drag to redistribute the selected points (↔ time · ↕ value · Shift axis · Alt fine)"
              />
            )}
            <ToolButton
              onClick={() => setGhostVisible((g) => !g)}
              active={ghostVisible}
              icon={<EyeIcon active={ghostVisible} />}
              tooltip="Result ghost — faint dashed = the gradient's actual channels + the dots a re-fit would place (detail/smooth)"
            />
          </div>
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
          <GraphSelectionBBox
            sequence={sequence}
            selectedKeyframeIds={selectedKeyframeIds}
            view={view}
            normalized={normalized}
            frameToCanvasPixel={frameToCanvasPixel}
            v2p={v2p}
            dataSource={dataSource}
            enableMoveHandle
            p2v={p2v}
          />
          {(tools.isSmoothing || tools.isBaking || tools.isSimplifying) && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40 text-[10px] z-30 pointer-events-none">
              {tools.isSmoothing
                ? tools.smoothingRadius >= 0
                  ? `Smooth ${tools.smoothingRadius.toFixed(1)}`
                  : `Bounce ${Math.abs(tools.smoothingRadius).toFixed(1)}`
                : tools.isBaking
                  ? `Bake every ${tools.bakeStep}`
                  : `Simplify ${(tools.simplifyStrength * 100) | 0}%`}
            </div>
          )}
          {isBiasing && biasReadout && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40 text-[10px] z-30 pointer-events-none">
              Bias ↔ {biasReadout.gx.toFixed(2)} · ↕ {biasReadout.gy.toFixed(2)}
            </div>
          )}
          {pencilMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40 text-[10px] z-30 pointer-events-none">
              Pencil — drag to draw {CHANNELS.find((c) => c.key === activeChannel)?.label}
            </div>
          )}
        </div>
        <canvas ref={stripRef} width={canvasWidth} height={STRIP_H} className="block" style={{ width: canvasWidth, height: STRIP_H }} />
      </div>

      <KeyframeInspector dataSource={dataSource} onCollapsedChange={setInspectorCollapsed} />
    </div>
  );
};

export default ChannelGraphEditor;
