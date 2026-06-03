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
import { AnimationMath } from '../../engine/math/AnimationMath';
import { calculateViewBounds } from '../../utils/keyframeViewBounds';
import { calculateTangentModeUpdates, calculateGlobalInterpolationUpdates } from '../../utils/timelineUtils';
import { FitIcon, FitSelectionIcon, NormIcon, WaveIcon, BakeIcon, MagicIcon } from '../../components/Icons';
import type { Track, Keyframe, AnimationSequence, SoftSelectionType } from '../../types';
import type { RGB } from '../core/oklab';
import { CURVE_FRAMES } from '../core/channelCurve';
import { useGraphInteraction } from '../../hooks/useGraphInteraction';
import { useGraphTools } from '../../hooks/useGraphTools';
import { GraphSelectionBBox } from '../../components/graph/GraphSelectionBBox';
import type { GraphDataSource } from '../../utils/GraphDataSource';
import { KeyframeInspector } from '../../components/timeline/KeyframeInspector';
import { ChannelTrackSidebar, type ChannelInfo } from './ChannelTrackSidebar';

export type ChannelKey = 'L' | 'C' | 'h';
export type ChannelTracks = Record<ChannelKey, Track>;

// Colours match GraphRenderer.TRACK_COLORS by index (L cyan, C purple, h green).
const CHANNELS: ChannelInfo[] = [
  { key: 'L', label: 'L', color: '#22d3ee' },
  { key: 'C', label: 'C', color: '#a855f7' },
  { key: 'h', label: 'hue', color: '#22c55e' },
];

const SIDEBAR_W = 112;
// Shared KeyframeInspector widths: full (w-64) vs collapsed rail (w-7).
const INSPECTOR_W = 256;
const INSPECTOR_W_COLLAPSED = 28;
const STRIP_H = 12;

// Keep the playhead arrow off-screen — a gradient curve has no time-playhead.
const HIDDEN_FRAME = -1e6;

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
}

export const ChannelGraphEditor: React.FC<ChannelGraphEditorProps> = ({
  tracks,
  onTracksChange,
  width,
  height,
  previewRamp,
}) => {
  const interactionRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);

  const [activeChannel, setActiveChannel] = useState<ChannelKey>('L');
  const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<string[]>([]);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [normalized, setNormalized] = useState(true);
  const [visible, setVisible] = useState<Record<string, boolean>>({ L: true, C: true, h: true });
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

  // Per-channel value range (min/max of keyframes), padded — same shape as
  // GraphEditor's trackRanges. Normalized rendering maps each to [0,1].
  const trackRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number; span: number }> = {};
    trackIds.forEach((tid) => {
      const track = tracks[tid as ChannelKey];
      if (!track || track.keyframes.length === 0) {
        ranges[tid] = { min: 0, max: 1, span: 1 };
        return;
      }
      let min = Infinity;
      let max = -Infinity;
      track.keyframes.forEach((k) => {
        if (k.value < min) min = k.value;
        if (k.value > max) max = k.value;
      });
      if (max - min < 0.00001) {
        min -= 0.5;
        max += 0.5;
      }
      ranges[tid] = { min, max, span: max - min };
    });
    return ranges;
  }, [tracks, trackIds]);

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
    onTracksChange(next);
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
    setTangents: (mode) => updateKeyframes(calculateTangentModeUpdates(sequence, selectedKeyframeIds, mode)),
    setGlobalInterpolation: (type, tm) => replaceKeyframes(calculateGlobalInterpolationUpdates(sequence, type, tm)),
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
      const withTangents = merged.map((k, n) => {
        if (n < idx - 1 || n > idx + 1) return k;
        if (k.interpolation !== 'Bezier' || k.autoTangent === false) return k;
        const prev = n > 0 ? merged[n - 1] : undefined;
        const next = n < merged.length - 1 ? merged[n + 1] : undefined;
        const { l, r: rt } = AnimationMath.calculateTangents(k, prev, next, 'Auto');
        return { ...k, leftTangent: l, rightTangent: rt, tangentMode: 'Aligned' as const, autoTangent: true };
      });
      onTracksChange({ ...tracks, [activeChannel]: { ...tr, keyframes: withTangents } });
      setSelectedKeyframeIds([`${activeChannel}::${id}`]);
    },
    [activeChannel, tracks, trackRanges, canvasPixelToFrame, view, onTracksChange, normalized],
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return;
    addKeyAtMouse(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (shouldSuppressContextMenu()) return;
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const hit = getHit(e.clientX - rect.left, e.clientY - rect.top);
    if (hit && hit.type === 'key') {
      // Right-click a key removes it (down to the two endpoints).
      const tr = tracks[hit.trackId as ChannelKey];
      if (tr && tr.keyframes.length > 2) {
        onTracksChange({
          ...tracks,
          [hit.trackId]: { ...tr, keyframes: tr.keyframes.filter((k) => k.id !== hit.keyId) },
        });
        setSelectedKeyframeIds((prev) => prev.filter((id) => id !== `${hit.trackId}::${hit.keyId}`));
      }
    }
  };

  const handleMouseDownWrapped = (e: React.MouseEvent) => {
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
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [deleteSelected]);

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

  const highlightedTracks = useMemo(() => new Set([activeChannel]), [activeChannel]);

  return (
    <div ref={focusRef} tabIndex={0} className="flex w-full outline-none select-none" style={{ height }}>
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
        <div ref={interactionRef} className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
          {/* Graph tools: fit all, fit selection, normalize, simplify, bake, smooth */}
          <div className="absolute top-7 left-1 flex flex-col gap-1 z-20">
            <ToolButton onClick={fitAll} icon={<FitIcon />} tooltip="Fit all" />
            <ToolButton onClick={fitSelection} icon={<FitSelectionIcon />} tooltip="Fit selection" />
            <ToolButton onClick={toggleNormalize} active={normalized} icon={<NormIcon active={normalized} />} tooltip="Normalize (0–1)" />
            <ToolButton onPointerDown={tools.handleSimplifyDown} active={tools.isSimplifying} icon={<MagicIcon active={tools.isSimplifying} />} tooltip="Simplify (drag L/R)" />
            <ToolButton onPointerDown={tools.handleBakeDown} active={tools.isBaking} icon={<BakeIcon active={tools.isBaking} />} tooltip="Bake / resample (drag)" />
            <ToolButton onPointerDown={tools.handleSmoothDown} active={tools.isSmoothing} icon={<WaveIcon active={tools.isSmoothing} />} tooltip="Smooth (right) / bounce (left)" />
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
          <GraphSelectionBBox
            sequence={sequence}
            selectedKeyframeIds={selectedKeyframeIds}
            view={view}
            normalized={normalized}
            frameToCanvasPixel={frameToCanvasPixel}
            v2p={v2p}
            dataSource={dataSource}
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
        </div>
        <canvas ref={stripRef} width={canvasWidth} height={STRIP_H} className="block" style={{ width: canvasWidth, height: STRIP_H }} />
      </div>

      <KeyframeInspector dataSource={dataSource} onCollapsedChange={setInspectorCollapsed} />
    </div>
  );
};

export default ChannelGraphEditor;
