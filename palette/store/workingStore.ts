/**
 * workingStore — the Gradient Explorer v2 "Working" gradient: the ONE gradient the hero
 * shows and edits. It owns the pipeline INPUT slot; the pipeline itself is pure
 * (palette/core/workingPipeline.ts) and the dials stay where they are:
 *
 *   • Adjust = the `paletteGenerator` DDFS slice's global chain (hue / chroma / contrast /
 *     posterize / repeats / phase / mirror / reverse / noise) — free undo + presets.
 *   • Shape  = generatorStore's curve Track[] + curvesOn (+ detail / smooth as the fit recipe).
 *   • Stops  = paletteEditorStore's config, once the user edits a stop.
 *
 * Input kinds (plans/ge-v2-design.md §2, §3):
 *   build    — LIVE: follows the Build recipe (A×B mix or ColorBox) as its base.
 *   extract  — LIVE: follows the Extract result ramp.
 *   gradient — a fixed gradient handed in by Use (Browse pick, a recent item, a share link).
 *   stops    — the editable stops document, after `beginEdit` baked the pipeline into it.
 *
 * Bake (`beginEdit`): the first stop edit on a live/gradient input FOLDS the current output
 * into stops — output ramp → `fitRampToStops` (verbatim when the pipeline is the identity)
 * → paletteEditorStore — then resets Adjust to defaults and turns the curves off, so the
 * pipeline stays live over the new `stops` input without double-applying. `bakedFrom`
 * remembers what was folded so `returnToSource` can undo the fold structurally; Ctrl+Z
 * covers it too (one `paramEdit` bracket per action).
 *
 * Recent = ONE BIN ENTRY PER WORKING SESSION (owner, 2026-09-03 S3 review: the bin "should
 * be updating the gradient whenever the user modifies it, and know when to create a new
 * gradient"). The store does NOT import the favourites store; a host registers a
 * `RecentCollector` + `RecentUpdater` (palette/installWorking.ts). `syncRecent` — called by
 * the shell, debounced, whenever the derived output or the name changes — refreshes the
 * session's entry (`sessionId`) in place, or opens one when there is none. A new session
 * (sessionId → null) starts on `use`, `setInput` and `returnToSource`; `beginEdit` keeps
 * it (an edit is the same gradient, changed). A session picked up FROM the bin
 * (`use(..., { fromRecent: true })`) is pinned: its first change opens a new entry rather
 * than rewriting the one it came from.
 *
 * Undo + Save/Load: `captureWorkingHistory` / `serializeWorkingDocument` (registered by
 * installWorking) snapshot `{ input, name, bakedFrom }`; the palette-row prefs (positions /
 * last layout rule / follow) are per-viewer preferences in localStorage and ride neither.
 *
 * The palette row (owner review 2026-09-03) is an ARRAY OF POSITIONS the user drags along
 * the ramp: a swatch is a `t`, its colour is whatever the ramp shows there. The rules
 * (Even / Perceptual / Stops) are layouts applied on demand; `+` inserts at the largest
 * gap; `×` removes. See palette/core/paletteSample.ts "Positions as STATE".
 *
 * @see docs/adr/0111-working-pipeline-input-slot.md
 *
 * @assumption A `gradient` input's `config` is never mutated after `use()` (the store clones
 *   it on the way in; consumers read it through `useWorkingDerived`). Nothing enforces this.
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import { useEngineStore } from '../../store/engineStore';
import {
  useGeneratorStore,
  useBuildBase,
  useAdjustParams,
  useSampledCurves,
  buildBaseNow,
  readAdjustParamsNow,
  readSampledCurvesNow,
  readGeneratorSlice,
  setGeneratorSlice,
  MAIN_DEFAULTS,
  slotSnapshot,
  generatorModeOf,
  type GeneratorSlice,
} from './generatorStore';
import { usePaletteEditorStore } from './paletteEditorStore';
import { useImageDerived, imageDerivedNow } from './imageStore';
import { paramEdit } from './paramUndoBracket';
import { coerceGradientConfig } from '../core/editorConfig';
import {
  runWorkingPipeline,
  channelsOfConfig,
  channelsOfRamp,
  type WorkingInput,
  type WorkingDerivedCore,
} from '../core/workingPipeline';
import { layoutPositions, swatchesAt, insertAtLargestGap, movePosition, clampCount, PALETTE_MIN, PALETTE_MAX, type PaletteRule, type PaletteSwatch } from '../core/paletteSample';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';
import type { ChannelTracks } from '../components/ChannelGraphEditor';
import type { GradientConfig, JsonValue } from '../../types';
import type { Channels } from '../core/generatorPipeline';
import type { RGB } from '../core/oklab';

export type { WorkingInput } from '../core/workingPipeline';

/** What `beginEdit` folded, so `returnToSource` can unfold it. */
export interface BakedFrom {
  input: WorkingInput;
  name: string | null;
  /** The Adjust dials at fold time (the MAIN_DEFAULTS keys only). */
  adjust: Partial<GeneratorSlice>;
  tracks: ChannelTracks | null;
  curvesOn: boolean;
}

export type RecentCollector = (config: GradientConfig, name: string, source: string) => string | null;
export type RecentUpdater = (id: string, config: GradientConfig, name: string) => boolean;

export interface WorkingState {
  input: WorkingInput;
  /** User-typed name; null = derive it from the input. */
  name: string | null;
  bakedFrom: BakedFrom | null;
  /** The My Gradients (Recent) entry this working session writes to; null = none yet. */
  sessionId: string | null;
  /** The session started from a bin pick: its first change opens a NEW entry. */
  sessionPinned: boolean;
  /** Palette-row prefs (per viewer, not undoable): the swatch positions along the ramp and
   *  the last layout rule applied (UI highlight only — positions are the truth). */
  positions: number[];
  rule: PaletteRule;
  /** Browse follow mode: Working tracks the Browse candidate live (off by default). */
  follow: boolean;

  /** Replace the input. One undo entry. Clears any fold memory. */
  setInput: (input: WorkingInput) => void;
  /** "Use": a fixed gradient becomes the input (cloned). One undo entry; a new session. */
  use: (config: GradientConfig, name: string, source: string, opts?: { fromRecent?: boolean }) => void;
  setName: (name: string | null) => void;
  /** Fold the live pipeline into editable stops (no-op when already editing an untouched
   *  stops input). Collects the folded gradient into Recent. */
  beginEdit: () => void;
  /** Undo the fold structurally: restore the pre-bake input, dials and curves. */
  returnToSource: () => void;
  /** Write the current output to the session's Recent entry, opening one if needed. The
   *  shell calls this (debounced) on every derived change; star / export / wallpaper call
   *  it directly so the bin is current before they read it. */
  syncRecent: () => void;
  /** @deprecated alias of syncRecent, kept for the S4 call sites. */
  collectCurrent: () => void;
  /** Re-lay by a rule (Even / Perceptual / Stops); Even / Perceptual after Stops use HAND_COUNT. */
  layoutPalette: (rule: PaletteRule) => void;
  /** Re-lay with N swatches under the last rule. */
  setCount: (n: number) => void;
  /** "+": one more swatch at the midpoint of the largest gap. */
  addSwatch: () => void;
  /** "×" on a swatch. Keeps at least PALETTE_MIN. */
  removeSwatch: (index: number) => void;
  /** Drag: move one swatch to `t`; returns its index after re-sorting. */
  moveSwatch: (index: number, t: number) => number;
  setFollow: (on: boolean) => void;
}

// --- Recent seam ------------------------------------------------------------------
let _collect: RecentCollector | null = null;
let _update: RecentUpdater | null = null;
export const setRecentCollector = (fn: RecentCollector | null): void => {
  _collect = fn;
};
export const setRecentUpdater = (fn: RecentUpdater | null): void => {
  _update = fn;
};
const collect = (config: GradientConfig, name: string, source: string): string | null => {
  try {
    return _collect?.(config, name, source) ?? null;
  } catch {
    return null; /* a collector failure must never break an edit */
  }
};
const update = (id: string, config: GradientConfig, name: string): boolean => {
  try {
    return _update?.(id, config, name) ?? false;
  } catch {
    return false;
  }
};
/** Structural identity of a config (the store must not import favientSig). */
const configKey = (c: GradientConfig): string => JSON.stringify([c.stops, c.colorSpace ?? '', c.blendSpace ?? '']);

// --- helpers ----------------------------------------------------------------------
const cloneConfig = (c: GradientConfig): GradientConfig => JSON.parse(JSON.stringify(c)) as GradientConfig;
const ADJUST_KEYS = Object.keys(MAIN_DEFAULTS) as (keyof GeneratorSlice)[];
const pickAdjust = (s: GeneratorSlice): Partial<GeneratorSlice> => {
  const out: Partial<GeneratorSlice> = {};
  for (const k of ADJUST_KEYS) (out as Record<string, unknown>)[k] = s[k];
  return out;
};
const sourceOf = (input: WorkingInput): string =>
  input.kind === 'gradient' ? input.source : input.kind === 'build' ? 'Build' : input.kind === 'extract' ? 'Extract' : input.kind === 'stops' ? 'Edited' : '';

/** The display name when the user has not typed one. */
export const autoWorkingName = (input: WorkingInput, bakedFrom: BakedFrom | null): string => {
  switch (input.kind) {
    case 'empty':
      return 'Gradient';
    case 'gradient':
      return input.name;
    case 'build': {
      if (generatorModeOf(readGeneratorSlice()) === 'colorbox') return 'ColorBox sweep';
      const g = useGeneratorStore.getState();
      return `${slotSnapshot(g.slotA).name} × ${slotSnapshot(g.slotB).name}`;
    }
    case 'extract':
      return 'From image';
    case 'stops':
      return bakedFrom ? bakedFrom.name ?? autoWorkingName(bakedFrom.input, null) : 'Edited gradient';
  }
};

const resolveBaseNow = (input: WorkingInput): { base: Channels | null; verbatim: GradientConfig | null } => {
  switch (input.kind) {
    case 'empty':
      return { base: null, verbatim: null };
    case 'build':
      return { base: buildBaseNow(), verbatim: null };
    case 'extract': {
      const r = imageDerivedNow();
      return { base: r ? channelsOfRamp(r.ramp) : null, verbatim: null };
    }
    case 'gradient':
      return { base: channelsOfConfig(input.config), verbatim: input.config };
    case 'stops': {
      const c = usePaletteEditorStore.getState().config;
      return { base: channelsOfConfig(c), verbatim: c };
    }
  }
};

/** Imperative derive (outside React): what the hero shows right now, or null when the
 *  input has nothing yet (Extract without an image). */
export const deriveWorkingNow = (): WorkingDerivedCore | null => {
  const { input } = useWorkingStore.getState();
  const { base, verbatim } = resolveBaseNow(input);
  if (!base) return null;
  const g = useGeneratorStore.getState();
  return runWorkingPipeline(base, readAdjustParamsNow(), readSampledCurvesNow(), g.noiseSeed, g.detail, verbatim, input.kind === 'build' ? input.seeds : undefined);
};

// --- prefs ------------------------------------------------------------------------
const PREFS_KEY = 'gmt.ge.working.prefs';
const RULES: PaletteRule[] = ['stops', 'even', 'perceptual'];
const DEFAULT_POSITIONS = [0, 0.2, 0.4, 0.6, 0.8, 1];
/** The swatch count Even / Perceptual fall back to after a Stops layout. */
const HAND_COUNT = DEFAULT_POSITIONS.length;
const validPositions = (v: unknown): number[] | null => {
  if (!Array.isArray(v) || v.length < PALETTE_MIN || v.length > PALETTE_MAX) return null;
  if (!v.every((x) => typeof x === 'number' && Number.isFinite(x))) return null;
  return (v as number[]).map((x) => Math.max(0, Math.min(1, x))).sort((a, b) => a - b);
};
const loadPrefs = (): { positions: number[]; rule: PaletteRule; follow: boolean } => {
  const d = { positions: DEFAULT_POSITIONS.slice(), rule: 'even' as PaletteRule, follow: false };
  try {
    const raw = safeLocalGet(PREFS_KEY);
    if (!raw) return d;
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      positions: validPositions(o.positions) ?? d.positions,
      rule: RULES.includes(o.rule as PaletteRule) ? (o.rule as PaletteRule) : d.rule,
      follow: o.follow === true,
    };
  } catch {
    return d;
  }
};
const savePrefs = (s: Pick<WorkingState, 'positions' | 'rule' | 'follow'>): void => {
  safeLocalSet(PREFS_KEY, JSON.stringify({ positions: s.positions, rule: s.rule, follow: s.follow }));
};
/** The ramp + config the layouts sample from right now (empty when nothing is in hand). */
const layoutSourceNow = (): { ramp: RGB[]; config: GradientConfig | null } => {
  const d = deriveWorkingNow();
  return d ? { ramp: d.ramp, config: d.config } : { ramp: [], config: null };
};

// --- store ------------------------------------------------------------------------
export const useWorkingStore = create<WorkingState>((set, get) => ({
  input: { kind: 'empty' },
  name: null,
  bakedFrom: null,
  sessionId: null,
  sessionPinned: false,
  ...loadPrefs(),

  setInput: (input) => paramEdit(() => set({ input, bakedFrom: null, sessionId: null, sessionPinned: false })),

  use: (config, name, source, opts) => {
    const c = cloneConfig(config);
    paramEdit(() =>
      set({ input: { kind: 'gradient', config: c, name, source }, name: null, bakedFrom: null, sessionId: null, sessionPinned: !!opts?.fromRecent }),
    );
  },

  setName: (name) => paramEdit(() => set({ name: name && name.trim() ? name : null })),

  beginEdit: () => {
    const s = get();
    const d = deriveWorkingNow();
    if (!d) return;
    // Already editing and nothing applied on top: the handles already edit the document.
    if (s.input.kind === 'stops' && d.passthrough) return;
    const name = s.name ?? autoWorkingName(s.input, s.bakedFrom);
    const config = d.passthrough ? cloneConfig(d.config) : d.config;
    const gen = useGeneratorStore.getState();
    // Re-folding an already-baked input keeps the ORIGINAL fold memory (return goes all
    // the way back), so only a first fold records bakedFrom.
    const baked: BakedFrom =
      s.input.kind === 'stops' && s.bakedFrom
        ? s.bakedFrom
        : { input: s.input, name: s.name, adjust: pickAdjust(readGeneratorSlice()), tracks: gen.tracks, curvesOn: gen.curvesOn };
    paramEdit(() => {
      usePaletteEditorStore.getState().setConfig(config);
      setGeneratorSlice({ ...MAIN_DEFAULTS });
      useGeneratorStore.setState({ tracks: null, curvesOn: false });
      set({ input: { kind: 'stops' }, bakedFrom: baked, name });
    });
  },

  returnToSource: () => {
    const s = get();
    const b = s.bakedFrom;
    if (s.input.kind !== 'stops' || !b) return;
    paramEdit(() => {
      setGeneratorSlice(b.adjust);
      useGeneratorStore.setState({ tracks: b.tracks, curvesOn: b.curvesOn });
      set({ input: b.input, name: b.name, bakedFrom: null, sessionId: null, sessionPinned: false });
    });
  },

  syncRecent: () => {
    const s = get();
    const d = deriveWorkingNow();
    if (!d) return;
    const name = s.name ?? autoWorkingName(s.input, s.bakedFrom);
    let id = s.sessionId;
    // A session picked up from the bin rewrites nothing: the moment its output differs
    // from what was picked, it becomes a new entry (the one it came from stays as it was).
    if (id && s.sessionPinned && s.input.kind === 'gradient' && configKey(d.config) !== configKey(s.input.config)) id = null;
    if (id && s.sessionPinned && s.input.kind !== 'gradient') id = null;
    if (id && update(id, d.config, name)) return;
    const next = collect(d.config, name, sourceOf(s.input));
    // Transient bookkeeping, outside any undo bracket (the next bracket snapshots it).
    set({ sessionId: next, sessionPinned: next ? s.sessionPinned && next === s.sessionId : false });
  },
  collectCurrent: () => get().syncRecent(),

  layoutPalette: (rule) => {
    const { ramp, config } = layoutSourceNow();
    const prev = get();
    // Even / Perceptual coming off Stops go back to a hand-sized palette (owner review
    // 2026-09-03): a stops layout can carry dozens of knots, and re-spacing that many was
    // never what the click meant. Even ↔ Perceptual keep whatever count the user built.
    const n = rule !== 'stops' && prev.rule === 'stops' ? HAND_COUNT : prev.positions.length;
    set({ rule, positions: layoutPositions(rule, n, ramp, config) });
    savePrefs(get());
  },
  setCount: (n) => {
    const { ramp, config } = layoutSourceNow();
    set({ positions: layoutPositions(get().rule, clampCount(n), ramp, config) });
    savePrefs(get());
  },
  addSwatch: () => {
    if (get().positions.length >= PALETTE_MAX) return;
    set({ positions: insertAtLargestGap(get().positions) });
    savePrefs(get());
  },
  removeSwatch: (index) => {
    const p = get().positions;
    if (p.length <= PALETTE_MIN || index < 0 || index >= p.length) return;
    set({ positions: p.filter((_, i) => i !== index) });
    savePrefs(get());
  },
  moveSwatch: (index, t) => {
    const r = movePosition(get().positions, index, t);
    set({ positions: r.positions });
    savePrefs(get());
    return r.index;
  },
  setFollow: (follow) => {
    set({ follow });
    savePrefs(get());
  },
}));

// --- providers (undo + Save/Load) — registered by palette/installWorking.ts ----------
type WorkingSnapshot = Pick<WorkingState, 'input' | 'name' | 'bakedFrom' | 'sessionId' | 'sessionPinned'>;

const coerceInput = (v: unknown): WorkingInput | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const kind = o.kind;
  if (kind === 'empty' || kind === 'build' || kind === 'extract' || kind === 'stops') return { kind };
  if (kind === 'gradient') {
    const config = coerceGradientConfig(o.config);
    if (!config) return null;
    return {
      kind,
      config,
      name: typeof o.name === 'string' ? o.name : 'Gradient',
      source: typeof o.source === 'string' ? o.source : '',
    };
  }
  return null;
};
const coerceAdjust = (v: unknown): Partial<GeneratorSlice> => {
  const out: Partial<GeneratorSlice> = {};
  if (!v || typeof v !== 'object') return out;
  const o = v as Record<string, unknown>;
  for (const k of ADJUST_KEYS) {
    const want = typeof (MAIN_DEFAULTS as Record<string, unknown>)[k];
    if (typeof o[k] === want) (out as Record<string, unknown>)[k] = o[k];
  }
  return out;
};
const coerceTracks = (v: unknown): ChannelTracks | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return o.L && o.C && o.h && typeof o.L === 'object' && typeof o.C === 'object' && typeof o.h === 'object'
    ? (v as ChannelTracks)
    : null;
};
const coerceBaked = (v: unknown): BakedFrom | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const input = coerceInput(o.input);
  if (!input) return null;
  return {
    input,
    name: typeof o.name === 'string' ? o.name : null,
    adjust: coerceAdjust(o.adjust),
    tracks: coerceTracks(o.tracks),
    curvesOn: o.curvesOn === true,
  };
};
/** Validate an untrusted snapshot (undo history or a scene file). Never throws; null on garbage. */
export const coerceWorkingSnapshot = (snap: unknown): WorkingSnapshot | null => {
  if (!snap || typeof snap !== 'object') return null;
  const o = snap as Record<string, unknown>;
  const input = coerceInput(o.input);
  if (!input) return null;
  return {
    input,
    name: typeof o.name === 'string' ? o.name : null,
    bakedFrom: coerceBaked(o.bakedFrom),
    sessionId: typeof o.sessionId === 'string' ? o.sessionId : null,
    sessionPinned: o.sessionPinned === true,
  };
};

export const captureWorkingHistory = (): JsonValue => {
  const s = useWorkingStore.getState();
  return JSON.parse(JSON.stringify({ input: s.input, name: s.name, bakedFrom: s.bakedFrom, sessionId: s.sessionId, sessionPinned: s.sessionPinned })) as JsonValue;
};
export const restoreWorkingHistory = (snap: unknown): void => {
  const v = coerceWorkingSnapshot(snap);
  if (v) useWorkingStore.setState(v);
};
export const serializeWorkingDocument = captureWorkingHistory;
export const restoreWorkingDocument = restoreWorkingHistory;

// --- the React derive ---------------------------------------------------------------
export interface WorkingDerived {
  input: WorkingInput;
  name: string;
  /** Nothing to show (e.g. Extract input with no image yet). */
  empty: boolean;
  /** Input follows a source live (build / extract). */
  live: boolean;
  /** Input is the editable stops document. */
  edited: boolean;
  passthrough: boolean;
  base: Channels | null;
  ramp: RGB[] | null;
  final: Channels | null;
  config: GradientConfig | null;
  palette: PaletteSwatch[];
}

export const useWorkingDerived = (): WorkingDerived => {
  const input = useWorkingStore((s) => s.input);
  const nameState = useWorkingStore((s) => s.name);
  const bakedFrom = useWorkingStore((s) => s.bakedFrom);
  const positions = useWorkingStore((s) => s.positions);
  const buildBase = useBuildBase();
  const extracted = useImageDerived();
  const stopsConfig = usePaletteEditorStore((s) => s.config);
  const params = useAdjustParams();
  const curves = useSampledCurves();
  const noiseSeed = useGeneratorStore((s) => s.noiseSeed);
  const detail = useGeneratorStore((s) => s.detail);
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
  const genMode = useEngineStore((s) => (s as any).paletteGenerator?.generatorMode) as number | undefined;

  const resolved = useMemo((): { base: Channels | null; verbatim: GradientConfig | null } => {
    switch (input.kind) {
      case 'empty':
        return { base: null, verbatim: null };
      case 'build':
        return { base: buildBase, verbatim: null };
      case 'extract':
        return { base: extracted ? channelsOfRamp(extracted.ramp) : null, verbatim: null };
      case 'gradient':
        return { base: channelsOfConfig(input.config), verbatim: input.config };
      case 'stops':
        return { base: channelsOfConfig(stopsConfig), verbatim: stopsConfig };
    }
  }, [input, buildBase, extracted, stopsConfig]);

  const core = useMemo(
    () => (resolved.base ? runWorkingPipeline(resolved.base, params, curves, noiseSeed, detail, resolved.verbatim, input.kind === 'build' ? input.seeds : undefined) : null),
    [resolved, params, curves, noiseSeed, detail, input],
  );
  const palette = useMemo(() => (core ? swatchesAt(core.ramp, positions) : []), [core, positions]);
  const name = useMemo(
    () => nameState ?? autoWorkingName(input, bakedFrom),
    // slotA / slotB / genMode only feed the `build` auto-name; listed so it stays fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nameState, input, bakedFrom, slotA, slotB, genMode],
  );

  return {
    input,
    name,
    empty: !core,
    live: input.kind === 'build' || input.kind === 'extract',
    edited: input.kind === 'stops',
    passthrough: core?.passthrough ?? false,
    base: core?.base ?? null,
    ramp: core?.ramp ?? null,
    final: core?.final ?? null,
    config: core?.config ?? null,
    palette,
  };
};
