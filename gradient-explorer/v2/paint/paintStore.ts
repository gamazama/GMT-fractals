/**
 * paintStore — the Paint face's state: the BRUSH, and the PAINTING in progress.
 *
 * The face is two surfaces that share one painting — the hero's bar, which the brush paints on
 * (`PaintSurface`, laid over the Stops editor's bar through its `stripTakeover` seam), and the
 * tray, which holds the brush lane, the brushes and the picker (`PaintFace`). Neither owns the
 * other, so the state is here. The maths is `palette/core/paintRamp.ts`; this file adds only
 * what the shell needs: where the painting comes from, and the two ways it ends.
 *
 * THE PAINTING IS LOCAL UNTIL IT IS APPLIED (owner principle, 2026-09-13: GX's faces are
 * destructive with undo — "every application bakes a new state"). Strokes live in the session
 * and step back one at a time with Ctrl+Z while the face has any; nothing reaches the working
 * gradient until:
 *   • `commitPaint` — Apply, and every way of LEAVING the face (a tab, the fold, a ♥, Export,
 *     Share, Wallpaper): the painted ramp becomes the working gradient as a RAMP (`stops: []`,
 *     ADR-0122) — owner, 2026-09-24: "paint straight onto the hero instead of there being
 *     stops" — in ONE undo entry (a `paramGroup`, so a tab switch that commits is still one
 *     click, one entry). The face stays open on a fresh session over the result;
 *   • `discardPaint` — Cancel and Esc: the session goes back to the gradient it opened on, and
 *     nothing is written, so there is no entry.
 *
 * WHERE A SESSION COMES FROM. `syncPaintBase` is handed the working ramp whenever it changes
 * while the face is open, and starts a new session when it differs from the one being painted
 * on. So a pick, New Gradient, a session load or a global undo that changes the gradient
 * under the face starts the painting over on the new one — the same rule a pick applies to
 * Adjust's dials (`use` throws pending dials away). Painted strokes are never merged into a
 * gradient they were not painted on.
 *
 * The brush persists (`gmt.ge.paint-brush`); the painting does not — it is a face's working
 * state, and the autosaved session carries the working gradient, which is what Apply writes.
 *
 * @see docs/adr/0129-the-paint-face-paints-a-ramp.md
 */

import { create } from 'zustand';
import { PaintSession, DEFAULT_BRUSH, PAINT_TOOLS, PAINT_BLEND_MODES, type PaintBrush } from '../../../palette/core/paintRamp';
import type { RGB } from '../../../palette/core/oklab';
import { makeRampGradient } from '../../../utils/gradientRamp';
import { BLEND_SPACE_ORDER } from '../../../utils/colorUtils';
import { paramGroup } from '../../../palette/store/paramUndoBracket';
import { useWorkingStore, deriveWorkingNow } from '../../../palette/store/workingStore';
import { usePaletteEditorStore } from '../../../palette/store/paletteEditorStore';
import { safeLocalGet, safeLocalSet } from '../../../store/safeLocalStorage';

const BRUSH_KEY = 'gmt.ge.paint-brush';

interface PaintState {
  brush: PaintBrush;
  /** The painting in progress, or null while the face is closed. */
  session: PaintSession | null;
  /** Bumped whenever the session's texels, its strokes or its clone source change — the
   *  canvases redraw on this number rather than diffing texels. */
  rev: number;
  /** The pointer over the gradient, in texels, with its pressure — null off it. */
  hover: { c: number; p: number } | null;
  /** Where the lane draws the brush: under the pointer while it is on the gradient, and where
   *  it was last otherwise. */
  laneC: number;
  /** The thin "before" line is held: the bar shows the gradient as the face opened it. */
  peeking: boolean;
  /** How high on the bar the pointer is sets the strength (a mouse has no pressure). A pen's
   *  own pressure always applies. */
  heightPressure: boolean;
  /** The bar's left edge and width in client px, reported by the surface — the lane draws at
   *  the bar's scale and position, so the brush in it sits under the brush on the gradient. */
  bar: { left: number; width: number } | null;
}

const clamp = (v: number, lo: number, hi: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

/** A stored brush, trusted field by field: anything missing or malformed takes the default. */
const coerceBrush = (raw: unknown): PaintBrush => {
  const b = { ...DEFAULT_BRUSH };
  if (!raw || typeof raw !== 'object') return b;
  const r = raw as Record<string, unknown>;
  const num = (k: keyof PaintBrush, lo: number, hi: number): void => {
    if (typeof r[k] === 'number') (b as unknown as Record<string, number>)[k] = clamp(r[k] as number, lo, hi);
  };
  num('size', 0.5, 100); num('hardness', 0, 1); num('spacing', 0.02, 10); num('opacity', 0, 1); num('flow', 0.02, 1);
  num('jitter', 0, 1); num('smudge', 0, 1); num('soften', 0, 1); num('sharpen', 0, 1); num('toneAmount', 0, 1);
  if (PAINT_TOOLS.includes(r.tool as PaintBrush['tool'])) b.tool = r.tool as PaintBrush['tool'];
  if (PAINT_BLEND_MODES.some((m) => m.mode === r.blend)) b.blend = r.blend as PaintBrush['blend'];
  if (BLEND_SPACE_ORDER.includes(r.mix as PaintBrush['mix'])) b.mix = r.mix as PaintBrush['mix'];
  if (r.toneTarget === 'L' || r.toneTarget === 'C' || r.toneTarget === 'H') b.toneTarget = r.toneTarget;
  if (r.toneDir === 1 || r.toneDir === -1) b.toneDir = r.toneDir;
  for (const k of ['aligned', 'mirror', 'wrap'] as const) if (typeof r[k] === 'boolean') b[k] = r[k] as boolean;
  const c = r.colour as Partial<RGB> | undefined;
  if (c && [c.r, c.g, c.b].every((v) => typeof v === 'number' && Number.isFinite(v))) b.colour = { r: clamp(c.r!, 0, 255), g: clamp(c.g!, 0, 255), b: clamp(c.b!, 0, 255) };
  return b;
};

const loadBrush = (): PaintBrush => {
  try {
    const raw = safeLocalGet(BRUSH_KEY);
    return coerceBrush(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_BRUSH };
  }
};

export const usePaintStore = create<PaintState>(() => ({
  brush: loadBrush(),
  session: null,
  rev: 0,
  hover: null,
  laneC: 128,
  peeking: false,
  heightPressure: false,
  bar: null,
}));

// The brush is written back when a change settles — a size drag writes once, not per frame.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
usePaintStore.subscribe((s, prev) => {
  if (s.brush === prev.brush) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => safeLocalSet(BRUSH_KEY, JSON.stringify(s.brush)), 300);
});

export const setBrush = (patch: Partial<PaintBrush>): void => usePaintStore.setState((s) => ({ brush: { ...s.brush, ...patch } }));

/** Tell the store the session changed (texels, strokes, clone source). */
export const bumpPaint = (): void => usePaintStore.setState((s) => ({ rev: s.rev + 1 }));

const sameRamp = (a: Float32Array, b: ArrayLike<RGB>): boolean => {
  if (b.length !== a.length / 3) return false;
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (Math.abs(a[i * 3] - c.r) > 0.5 || Math.abs(a[i * 3 + 1] - c.g) > 0.5 || Math.abs(a[i * 3 + 2] - c.b) > 0.5) return false;
  }
  return true;
};

/** The working ramp while the face is open: a new session whenever it is not the one being painted on. */
export const syncPaintBase = (ramp: ArrayLike<RGB> | null | undefined): void => {
  if (!ramp || ramp.length === 0) return;
  const { session } = usePaintStore.getState();
  if (session && !session.painting && sameRamp(session.original, ramp)) return;
  if (session?.painting) return; // a stroke in flight finishes on the gradient it started on
  usePaintStore.setState((s) => ({ session: new PaintSession(ramp), rev: s.rev + 1, peeking: false }));
};

/** The face closed: the session goes (after `commitPaint` or `discardPaint` has had its say). */
export const endPaintSession = (): void => usePaintStore.setState((s) => ({ session: null, hover: null, peeking: false, rev: s.rev + 1 }));

/** Is there painting that Apply would write? */
export const hasPainting = (): boolean => !!usePaintStore.getState().session?.changed;

/**
 * APPLY: the painted ramp becomes the working gradient, as a ramp, in one undo entry. Called by
 * the face's Apply and by every way of leaving the face (see the header). False when there is
 * nothing to write. Safe inside the shell's own `paramGroup` — a group inside a group adds no
 * entry of its own.
 *
 * @invariant Every Apply is exactly ONE undo entry that holds the painted ramp — the second one in
 *   a face too, where the document is already stops and only this group brackets the write —
 *   proven by: npm run smoke:ge-paint ("[4b] a second Apply made … entries, not one"). Falsified
 *   2026-09-24 by calling the body without `paramGroup`: [4] and [5] stayed green, [4b] went red.
 */
export const commitPaint = (): boolean => {
  const s = usePaintStore.getState().session;
  if (!s || !s.changed) return false;
  if (s.painting) s.endStroke();
  const ramp = s.toRamp();
  paramGroup(() => {
    const w = useWorkingStore.getState();
    const d = deriveWorkingNow();
    // the same fold a stop edit makes first (the hero's `ensureEditing`), so the chip then offers
    // "return to source" and Ctrl+Z walks back through it in the same entry
    if (w.input.kind !== 'stops' || (d && !d.passthrough)) w.beginEdit();
    const doc = usePaletteEditorStore.getState().config;
    usePaletteEditorStore.getState().setConfig(makeRampGradient(ramp, doc.colorSpace, doc.blendSpace));
  });
  usePaintStore.setState((st) => ({ session: new PaintSession(ramp), rev: st.rev + 1, peeking: false }));
  return true;
};

/** CANCEL / Esc: back to the gradient the face opened on. Writes nothing, so it is no undo entry. */
export const discardPaint = (): void => {
  const s = usePaintStore.getState().session;
  if (!s) return;
  usePaintStore.setState((st) => ({ session: new PaintSession(s.toRamp(s.original)), rev: st.rev + 1, peeking: false }));
};

export const paintUndo = (): boolean => {
  const s = usePaintStore.getState().session;
  if (!s?.undo()) return false;
  bumpPaint();
  return true;
};

export const paintRedo = (): boolean => {
  const s = usePaintStore.getState().session;
  if (!s?.redo()) return false;
  bumpPaint();
  return true;
};
