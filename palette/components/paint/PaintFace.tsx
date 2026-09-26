/**
 * PaintFace — the tray while the Paint face is open (the brush paints on the hero's bar —
 * `PaintSurface`). Designed with the owner in a sketch, 2026-09-24
 * (https://claude.ai/artifact/PRceFwcJuy6653UMjpHCKH, version 4 + the calls after it):
 *
 *   • THE BRUSH LANE (`BrushLane`), full width at the top: the brush's shape at the BAR's scale and
 *     position, directly under where it is on the gradient, and every setting the brushes share is
 *     a HANDLE on that shape — its feet are the size, its shoulders the hardness, the bar above it
 *     the strength, the diamond inside it the flow (Paint, Clone, Restore), the triangle under the
 *     floor where the next dab lands (spacing, up to 1000 %). Clone's source is a ring you drag.
 *     A number shows only while a handle is under the pointer. The owner: "perhaps the
 *     size/hardness setting can be on screen relating to it so it is intuitive", then "it would be
 *     cool if the brush control surface could take flow and spacing as controls as well, then we
 *     would only have the tool specific settings".
 *   • A ROW under it: the brushes, then that brush's own few settings beside them (owner: "a
 *     small tool section next to the tool icons before moving them down" — the row wraps only
 *     when it runs out), then Mirror · Wrap · Height at its end.
 *   • The full colour picker, for Paint only — the one brush that lays down a colour of its own
 *     (owner: "icons without color shouldn't show the picker").
 *   • Cancel · Apply, as Adjust has them: Apply bakes and keeps the face open; Cancel (and Esc,
 *     through the shell) throws the painting away. Leaving the face applies — @see ./paintStore.
 *
 * Ctrl+Z / Ctrl+Y step the painting a stroke at a time while it has strokes; past the first,
 * the key falls through to the app's undo.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PAINT_TOOLS, PAINT_BLEND_MODES, PAINT_TEXELS, brushRadius, dabStep, isWashTool, strengthKey, usesColour,
  type PaintTool, type PaintBlendMode,
} from '../../core/paintRamp';
import { BLEND_SPACE_ORDER, BLEND_SPACE_LABEL, rgbToHex, hexToRgb } from '../../../utils/colorUtils';
import type { BlendColorSpace } from '../../../types/graphics';
import EmbeddedColorPicker from '../../../components/EmbeddedColorPicker';
import { ContextMenu } from '../../../components/gradient/GradientContextMenu';
import { COARSE_POINTER } from '../../../components/gradient/BlendSpacePicker';
import Slider from '../../../components/Slider';
import { useShortcut, useShortcutScope } from '../../../engine/plugins/Shortcuts';
import { Act } from '../../../components/ui/Act';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { usePaintStore, setBrush, bumpPaint, commitPaint, discardPaint, paintUndo, paintRedo } from '../../store/paintStore';
import { filledShape, shapePath, sourceMark, token } from './brushDraw';

const TOOL_META: Record<PaintTool, { icon: IconName; name: string }> = {
  paint: { icon: 'paintBrush', name: 'Paint' },
  smudge: { icon: 'smudge', name: 'Smudge' },
  soften: { icon: 'soften', name: 'Soften' },
  sharpen: { icon: 'sharpen', name: 'Sharpen' },
  tone: { icon: 'tone', name: 'Tone' },
  clone: { icon: 'clone', name: 'Clone — Alt-click the gradient, or drag the ring, to set the source' },
  restore: { icon: 'restore', name: 'Restore — paints back the gradient as it was' },
};

const STRENGTH_NAME: Record<ReturnType<typeof strengthKey>, string> = {
  opacity: 'Opacity', smudge: 'Strength', soften: 'Amount', sharpen: 'Amount', toneAmount: 'Amount',
};

// ── shortcuts: module-level handlers, so the registry never re-registers on a render ─────────
// The stroke undo lives in a SCOPE that is pushed only while there is a stroke to undo (and redo in
// one pushed only while there is one to redo), the way the timeline's undo does — not behind a
// `when`: the registry resolves a key to its highest match and STOPS there if that match's `when`
// says no, so a `when`-gated Mod+Z at a higher priority swallowed the app's own undo once the
// strokes were gone (measured 2026-09-24: Apply, then Ctrl+Z did nothing). Grep `resolve` in
// engine/plugins/Shortcuts.ts.
// @invariant With no strokes in the face, Ctrl+Z is the app's undo — proven by: npm run
//   smoke:ge-paint ("[5] Ctrl+Z with no strokes did not reach the app's undo"). Falsified
//   2026-09-24 by putting the `when`-gated priority-20 binding back: [5] red.
const onUndo = (): void => { paintUndo(); };
const onRedo = (): void => { paintRedo(); };
const sizeBy = (f: number) => (): void => setBrush({ size: Math.min(100, Math.max(0.5, usePaintStore.getState().brush.size * f)) });
const smaller = sizeBy(1 / 1.18);
const bigger = sizeBy(1.18);

export const PaintFace: React.FC<{ phone?: boolean; palette: string[] }> = ({ phone = false, palette }) => {
  const canUndoStroke = usePaintStore((s) => !!s.session && s.rev >= 0 && s.session.strokes > 0);
  const canRedoStroke = usePaintStore((s) => !!s.session && s.rev >= 0 && s.session.canRedo);
  useShortcutScope('gx-paint-undo', canUndoStroke);
  useShortcutScope('gx-paint-redo', canRedoStroke);
  useShortcut({ id: 'gx.paint.undo', key: 'Mod+Z', scope: 'gx-paint-undo', handler: onUndo, description: 'Undo a stroke', category: 'Paint' });
  useShortcut({ id: 'gx.paint.redo', key: 'Mod+Y', scope: 'gx-paint-redo', handler: onRedo, description: 'Redo a stroke', category: 'Paint' });
  useShortcut({ id: 'gx.paint.redo.shift', key: 'Mod+Shift+Z', scope: 'gx-paint-redo', handler: onRedo, category: 'Paint' });
  useShortcut({ id: 'gx.paint.smaller', key: '[', handler: smaller, description: 'Smaller brush', category: 'Paint' });
  useShortcut({ id: 'gx.paint.bigger', key: ']', handler: bigger, description: 'Bigger brush', category: 'Paint' });
  const tool = usePaintStore((s) => s.brush.tool);
  return (
    <div className="flex flex-col" data-gx-paint-face="">
      <BrushLane phone={phone} />
      <ToolRow />
      {usesColour(tool) && (
        <div className={phone ? 'px-0 pb-3' : 'px-4 pb-3'} data-gx-paint-picker="">
          <PaintPicker palette={palette} />
        </div>
      )}
      <PaintFooter />
    </div>
  );
};

// ── the lane ──────────────────────────────────────────────────────────────────

type Handle = 'size' | 'hard' | 'top' | 'flow' | 'spac' | 'src';

interface LaneGeom {
  d: number; ppt: number; x0: number; r: number; c: number; cx: number; halfW: number;
  baseY: number; maxH: number; h: number; step: number; dir: number;
  handles: Partial<Record<'footL' | 'footR' | 'shL' | 'shR' | 'top' | 'flow' | 'spac' | 'src', [number, number]>>;
}

const LANE_H = 108;

const BrushLane: React.FC<{ phone: boolean }> = ({ phone }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const geom = useRef<LaneGeom | null>(null);
  const [hot, setHot] = useState<Handle | null>(null);
  const drag = useRef<Handle | null>(null);
  const hotRef = useRef<Handle | null>(null);
  hotRef.current = hot;

  const layout = useCallback((): LaneGeom | null => {
    const cv = cvRef.current;
    const wrap = wrapRef.current;
    const { brush, session, laneC, bar } = usePaintStore.getState();
    if (!cv || !wrap || !session) return null;
    const d = window.devicePixelRatio || 1;
    const lr = wrap.getBoundingClientRect();
    // the BAR's scale and position, so the shape here stands under the brush on the gradient
    const barLeft = bar ? bar.left - lr.left : 0;
    const barW = bar && bar.width > 0 ? bar.width : lr.width;
    const ppt = (barW / PAINT_TEXELS) * d;
    const x0 = barLeft * d;
    const r = brushRadius(brush.size);
    const span = r + 0.5;
    // keep both feet on the lane where the size allows it
    const c = 2 * span <= PAINT_TEXELS ? Math.min(PAINT_TEXELS - span, Math.max(span, laneC)) : PAINT_TEXELS / 2;
    const H = cv.height;
    const baseY = H - 24 * d, maxH = baseY - 16 * d;
    const strength = brush[strengthKey(brush.tool)];
    const h = maxH * (0.12 + 0.88 * strength);
    const cx = x0 + c * ppt, halfW = span * ppt;
    const step = dabStep(brush);
    const dir = PAINT_TEXELS - c >= c ? 1 : -1;
    const W = cv.width;
    const handles: LaneGeom['handles'] = {
      footL: [cx - halfW, baseY], footR: [cx + halfW, baseY],
      shL: [cx - brush.hardness * halfW, baseY - h], shR: [cx + brush.hardness * halfW, baseY - h],
      top: [cx, baseY - h - 10 * d],
    };
    if (isWashTool(brush.tool)) handles.flow = [cx, baseY - h * brush.flow];
    if (brush.tool !== 'smudge') handles.spac = [Math.min(W - 7 * d, Math.max(7 * d, cx + dir * step * ppt)), baseY + 13 * d];
    if (brush.tool === 'clone') handles.src = [x0 + (c + session.cloneOffsetFor(c)) * ppt, 14 * d];
    return { d, ppt, x0, r, c, cx, halfW, baseY, maxH, h, step, dir, handles };
  }, []);

  const draw = useCallback(() => {
    const cv = cvRef.current;
    const ctx = cv?.getContext('2d');
    const { brush, session } = usePaintStore.getState();
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const g = layout();
    geom.current = g;
    if (!g || !session) return;
    const { d, ppt, x0, baseY } = g;
    // the gradient as a scale line along the floor, and quiet ticks every 32 texels
    const barW = ppt * PAINT_TEXELS;
    for (let i = 0; i < PAINT_TEXELS; i++) {
      const t = session.texel(i);
      ctx.fillStyle = `rgb(${Math.round(t.r)},${Math.round(t.g)},${Math.round(t.b)})`;
      ctx.fillRect(x0 + i * ppt, baseY + 2 * d, ppt + 0.5, 3 * d);
    }
    ctx.fillStyle = token('--fg', 0.05);
    for (let t = 32; t < PAINT_TEXELS; t += 32) ctx.fillRect(Math.round(x0 + t * ppt), 10 * d, d, baseY - 10 * d);
    ctx.fillStyle = token('--fg', 0.12);
    ctx.fillRect(x0, baseY, barW, d);
    // the next two dabs, where spacing puts them
    if (brush.tool !== 'smudge') {
      for (const [k, a] of [[2, 0.18], [1, 0.4]] as const) {
        shapePath(ctx, g.cx + g.dir * k * g.step * ppt, ppt, baseY, g.h, g.r, brush.hardness);
        ctx.lineWidth = 1.2 * d;
        ctx.strokeStyle = token('--fg', a);
        ctx.stroke();
      }
    }
    const centres = brush.mirror ? [g.c, PAINT_TEXELS - g.c] : [g.c];
    centres.forEach((c, k) => {
      if (k > 0) ctx.globalAlpha = 0.45;
      filledShape(ctx, session, brush, x0 + c * ppt, c, ppt, baseY, g.h, g.r, d);
      ctx.globalAlpha = 1;
    });
    // the handles
    const isHot = (h: Handle): boolean => hotRef.current === h || drag.current === h;
    const ink = (h: Handle): string => (isHot(h) ? token('--accent-400') : token('--fg', 0.95));
    const ring = 'rgba(0,0,0,.65)';
    const dot = (p: [number, number] | undefined, h: Handle): void => {
      if (!p) return;
      ctx.beginPath(); ctx.arc(p[0], p[1], (isHot(h) ? 6.5 : 5) * d, 0, Math.PI * 2);
      ctx.fillStyle = ink(h); ctx.fill(); ctx.lineWidth = 2 * d; ctx.strokeStyle = ring; ctx.stroke();
    };
    const poly = (pts: [number, number][], h: Handle): void => {
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = ink(h); ctx.fill(); ctx.lineWidth = 2 * d; ctx.strokeStyle = ring; ctx.stroke();
    };
    const H_ = g.handles;
    if (H_.top) {
      const tw = (isHot('top') ? 22 : 18) * d, th = 5 * d;
      ctx.beginPath(); ctx.roundRect?.(H_.top[0] - tw / 2, H_.top[1] - th / 2, tw, th, th / 2);
      if (!ctx.roundRect) ctx.rect(H_.top[0] - tw / 2, H_.top[1] - th / 2, tw, th);
      ctx.lineWidth = 2 * d; ctx.strokeStyle = ring; ctx.stroke(); ctx.fillStyle = ink('top'); ctx.fill();
    }
    dot(H_.footL, 'size'); dot(H_.footR, 'size');
    dot(H_.shL, 'hard'); dot(H_.shR, 'hard');
    if (H_.flow) { const [x, y] = H_.flow, q = (isHot('flow') ? 7 : 5.5) * d; poly([[x, y - q], [x + q, y], [x, y + q], [x - q, y]], 'flow'); }
    if (H_.spac) { const [x, y] = H_.spac, q = (isHot('spac') ? 7 : 5.5) * d; poly([[x, y - q * 0.8], [x + q, y + q * 0.7], [x - q, y + q * 0.7]], 'spac'); }
    if (H_.src) sourceMark(ctx, H_.src[0], H_.src[1], baseY, d);
  }, [layout]);

  useEffect(() => {
    const cv = cvRef.current;
    const wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const size = (): void => {
      const d = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(wrap.clientWidth * d));
      cv.height = Math.max(1, Math.round(wrap.clientHeight * d));
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);
    const unsub = usePaintStore.subscribe((s, p) => {
      if (s.brush !== p.brush || s.laneC !== p.laneC || s.rev !== p.rev || s.bar !== p.bar || s.session !== p.session) draw();
    });
    return () => { ro.disconnect(); unsub(); };
  }, [draw]);
  useEffect(() => { draw(); }, [hot, draw]);

  const hit = (x: number, y: number): Handle | null => {
    const g = geom.current;
    if (!g) return null;
    const px = x * g.d, py = y * g.d;
    const found: [number, Handle][] = [];
    const near = (p: [number, number] | undefined, h: Handle, rad: number): void => {
      if (!p) return;
      const dist = Math.hypot(px - p[0], py - p[1]);
      if (dist < rad * g.d) found.push([dist, h]);
    };
    const H_ = g.handles;
    near(H_.top, 'top', 14); near(H_.shL, 'hard', 10); near(H_.shR, 'hard', 10); near(H_.footL, 'size', 11); near(H_.footR, 'size', 11);
    near(H_.flow, 'flow', 10); near(H_.spac, 'spac', 11); near(H_.src, 'src', 11);
    if (found.length) return found.sort((a, b) => a[0] - b[0])[0][1]; // nearest wins where handles meet
    if (H_.src && Math.abs(px - H_.src[0]) < 5 * g.d && py < g.baseY) return 'src';
    return null;
  };

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = wrapRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onDown = (e: React.PointerEvent): void => {
    const [x, y] = pos(e);
    const h = hit(x, y);
    if (!h) return;
    e.preventDefault();
    drag.current = h;
    // hold the shape where it is while a handle moves it (a clamped centre would slide under the pointer)
    if (geom.current) usePaintStore.setState({ laneC: geom.current.c });
    e.currentTarget.setPointerCapture(e.pointerId);
    setHot(h);
  };
  const onMove = (e: React.PointerEvent): void => {
    const [x, y] = pos(e);
    const g = geom.current;
    const h = drag.current;
    if (h && g) {
      const px = x * g.d, py = y * g.d;
      const { brush, session } = usePaintStore.getState();
      if (h === 'size') setBrush({ size: Math.min(100, Math.max(0.5, ((Math.abs(px - g.cx) / g.ppt - 0.5) * 2 / PAINT_TEXELS) * 100)) });
      else if (h === 'hard') setBrush({ hardness: Math.min(1, Math.max(0, Math.abs(px - g.cx) / g.halfW)) });
      else if (h === 'top') setBrush({ [strengthKey(brush.tool)]: Math.min(1, Math.max(0, ((g.baseY - py - 10 * g.d) / g.maxH - 0.12) / 0.88)) });
      else if (h === 'flow') setBrush({ flow: Math.min(1, Math.max(0.02, (g.baseY - py) / g.h)) });
      else if (h === 'spac') setBrush({ spacing: Math.min(10, Math.max(0.02, (g.dir * (px - g.cx)) / g.ppt / (2 * g.r))) });
      else if (h === 'src' && session) { session.setCloneSource((px - g.x0) / g.ppt); bumpPaint(); }
      return;
    }
    const over = hit(x, y);
    if (over !== hot) setHot(over);
  };
  const onUp = (): void => { drag.current = null; draw(); };

  // the readout — words only while a handle is under the pointer
  const brush = usePaintStore((s) => s.brush);
  const cloneSource = usePaintStore((s) => s.session?.cloneSource ?? 0);
  const readout = hot === 'size' ? `Size ${brush.size < 10 ? brush.size.toFixed(1) : Math.round(brush.size)}%`
    : hot === 'hard' ? `Hardness ${brush.hardness.toFixed(2)}`
    : hot === 'top' ? `${STRENGTH_NAME[strengthKey(brush.tool)]} ${Math.round(brush[strengthKey(brush.tool)] * 100)}%`
    : hot === 'flow' ? `Flow ${Math.round(brush.flow * 100)}%`
    : hot === 'spac' ? `Spacing ${Math.round(brush.spacing * 100)}%`
    : hot === 'src' ? `Source ${Math.round(Math.min(PAINT_TEXELS - 1, cloneSource))}`
    : null;

  return (
    <div
      ref={wrapRef}
      className="relative shrink-0 border-b border-line/10 touch-none"
      style={{ height: phone ? LANE_H - 12 : LANE_H, cursor: hot === 'top' || hot === 'flow' ? 'ns-resize' : hot ? 'ew-resize' : 'default' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => { if (!drag.current) setHot(null); }}
      data-gx-paint-lane=""
    >
      <canvas ref={cvRef} className="absolute inset-0 w-full h-full" />
      {readout && (
        <span className="absolute top-2 right-3 px-2 py-0.5 rounded-full bg-surface-raised border border-line/15 text-[11px] font-mono tabular-nums text-fg pointer-events-none" data-gx-paint-readout="">
          {readout}
        </span>
      )}
    </div>
  );
};

// ── the row: brushes · that brush's settings · the stroke toggles ─────────────

const ToolRow: React.FC = () => {
  const brush = usePaintStore((s) => s.brush);
  const heightPressure = usePaintStore((s) => s.heightPressure);
  const t = brush.tool;
  const settings: React.ReactNode[] = [];
  if (t === 'paint') {
    settings.push(
      <Chooser key="blend" noun="Blend" value={brush.blend} options={PAINT_BLEND_MODES.map((m) => ({ value: m.mode, label: m.label }))} onPick={(v) => setBrush({ blend: v as PaintBlendMode })} previewKey="blend" />,
      <Chooser key="mix" noun="Mix" value={brush.mix} options={BLEND_SPACE_ORDER.map((sp) => ({ value: sp, label: BLEND_SPACE_LABEL[sp] }))} onPick={(v) => setBrush({ mix: v as BlendColorSpace })} previewKey="mix" />,
      <div key="jitter" className="w-[190px]"><Slider dense label="Jitter" value={brush.jitter} min={0} max={1} step={0.01} defaultValue={0} onChange={(v) => setBrush({ jitter: v })} /></div>,
    );
  } else if (t === 'tone') {
    settings.push(
      <div key="target" className="flex items-center gap-1">
        {(['L', 'C', 'H'] as const).map((k) => (
          <Act key={k} active={brush.toneTarget === k} onClick={() => setBrush({ toneTarget: k })}>{k === 'L' ? 'Light' : k === 'C' ? 'Chroma' : 'Hue'}</Act>
        ))}
      </div>,
      <div key="dir" className="flex items-center gap-1">
        <Act active={brush.toneDir === -1} onClick={() => setBrush({ toneDir: -1 })} title="Less">−</Act>
        <Act active={brush.toneDir === 1} onClick={() => setBrush({ toneDir: 1 })} title="More">+</Act>
      </div>,
    );
  } else if (t === 'clone') {
    settings.push(
      <Act key="aligned" active={brush.aligned} onClick={() => setBrush({ aligned: !brush.aligned })} title="Keep the distance to the source from one stroke to the next">Aligned</Act>,
    );
  }
  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-2 px-4 py-2.5" data-gx-paint-row="">
      <div className="flex items-center gap-1" role="toolbar" aria-label="Brushes">
        {PAINT_TOOLS.map((k) => (
          <Act key={k} icon active={t === k} onClick={() => setBrush({ tool: k })} title={TOOL_META[k].name} data-gx-paint-tool={k}>
            <Icon name={TOOL_META[k].icon} />
          </Act>
        ))}
      </div>
      {settings.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 pl-3 ml-1 border-l border-line/15 min-h-8" data-gx-paint-settings="">
          {settings}
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Act icon active={brush.mirror} onClick={() => setBrush({ mirror: !brush.mirror })} title="Mirror — paint both halves"><Icon name="mirror" /></Act>
        <Act icon active={brush.wrap} onClick={() => setBrush({ wrap: !brush.wrap })} title="Wrap — the brush runs off one end and onto the other"><Icon name="wrap" /></Act>
        <Act icon active={heightPressure} onClick={() => usePaintStore.setState({ heightPressure: !heightPressure })} title="Height — the higher on the gradient, the stronger the brush (a pen's own pressure always counts)"><Icon name="height" /></Act>
      </div>
    </div>
  );
};

/**
 * A blend mode or mix space chooser: a chip that opens its list on click — names only — and
 * HOVERING a name shows your last Paint stroke in it, so a mode is chosen by looking at your own
 * painting (the BlendSpacePicker rule; owner, 2026-09-10). The list drops BELOW the chip, into
 * space nothing else uses, so opening it moves nothing under the pointer. Choosing leaves the
 * last stroke in the chosen mode.
 */
const Chooser: React.FC<{
  noun: string;
  value: string;
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
  previewKey: 'blend' | 'mix';
}> = ({ noun, value, options, onPick, previewKey }) => {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const show = (v: string | null): void => {
    const { session, brush } = usePaintStore.getState();
    if (!session) return;
    const blend = previewKey === 'blend' && v ? (v as PaintBlendMode) : brush.blend;
    const mix = previewKey === 'mix' && v ? (v as BlendColorSpace) : brush.mix;
    if (session.recompositeLast(blend, mix)) bumpPaint();
  };
  const label = options.find((o) => o.value === value)?.label ?? value;
  return (
    <>
      <Act
        active={!!at}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          if (at) { setAt(null); show(null); } else setAt({ x: r.left, y: r.bottom + 5 });
        }}
        title={`${noun} — hover a choice to see your last stroke in it`}
        data-gx-paint-chooser={previewKey}
      >
        <span className="text-fg-dim mr-1">{noun}</span>{label}
        <Icon name="chevronDown" className="ml-1 opacity-60" size={12} />
      </Act>
      {at && (
        <ContextMenu
          x={at.x}
          y={at.y}
          onClose={() => { setAt(null); show(null); }}
          onPreview={COARSE_POINTER ? undefined : (i) => show(i === null ? null : options[i].value)}
          options={options.map((o) => ({ label: o.label, checked: o.value === value, action: () => { onPick(o.value); show(o.value); } }))}
        />
      )}
    </>
  );
};

// ── the picker (Paint's colour) ───────────────────────────────────────────────

const PaintPicker: React.FC<{ palette: string[] }> = ({ palette }) => {
  const colour = usePaintStore((s) => s.brush.colour);
  const hex = rgbToHex(colour);
  const onColorChange = useCallback((h: string) => { const c = hexToRgb(h); if (c) setBrush({ colour: c }); }, []);
  return <EmbeddedColorPicker color={hex} onColorChange={onColorChange} palette={palette} roomy />;
};

// ── Cancel · Apply ────────────────────────────────────────────────────────────

const PaintFooter: React.FC = () => {
  usePaintStore((s) => s.rev); // the counts below are read from the session on each change
  const session = usePaintStore((s) => s.session);
  const strokes = session?.strokes ?? 0;
  const changed = !!session?.changed;
  return (
    <div className="flex items-center gap-2 px-4 pb-3" data-gx-paint-footer="">
      <span className="text-[12px] text-fg-dim tabular-nums" data-gx-paint-count="">
        {strokes ? `${strokes} ${strokes === 1 ? 'stroke' : 'strokes'}` : ''}
      </span>
      <div className="flex-1" />
      <Act onClick={discardPaint} disabled={!changed} title="Throw the painting away — the gradient stays as it was (Esc)" data-gx-paint-cancel="">
        Cancel
      </Act>
      <Act primary onClick={() => commitPaint()} disabled={!changed} title="Make this the gradient and keep painting (undo brings it back)" data-gx-paint-apply="">
        Apply
      </Act>
    </div>
  );
};

export default PaintFace;
