/**
 * Load a Mandelbulb3D text block into the live GMT scene via the fused-hybrid
 * weave path. parse → emitFusedHybrid → register → loadScene.
 *
 * Supersedes the older mapScene path for any scene whose slots are all intern
 * formulas: emitFusedHybrid transpiles MB3D's REAL math (the audit proved GMT's
 * same-named formulas mostly DIFFER — e.g. GMT Mandelbulb is NOT MB3D Integer
 * Power), so this is the faithful route. Unsupported scenes (external `[CODE]`
 * slots, weave modes 1-3) return ok:false with reasons for the UI to surface.
 *
 * @see plans/mb3d/formula-discrepancies.md
 */
import { parseMB3D, parseMB3DBinary } from './parseMB3D';
import type { MB3DScene, MB3DAddon, MB3DFormulaSlot, MB3DHeader } from './parseMB3D';
import { emitFusedHybrid } from './emitFusedHybrid';
import type { WeaveLedger } from './emitFusedHybrid';
import { weaveSpecFromMB3D } from './weaveSequencer';
import type { FractalDefinition } from '../../types/fractal';
import { DECOMPILED_FORMULAS, DECOMPILED_DEFAULTS } from './decompiled-formulas';
import type { Preset } from '../../types/fractal';
import { registry } from '../../engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { useEngineStore } from '../../../store/engineStore';

export interface LoadMB3DResult {
  ok: boolean;
  reason?: string;
  ledger: WeaveLedger;
  /** One-line summary of the woven formulas, for a success toast. */
  summary?: string;
}

function loadFromScene(scene: MB3DScene): LoadMB3DResult {
  const { def, ledger, substitute } = emitFusedHybrid(scene);

  // Best-effort: load an already-registered GMT formula (no re-register — that
  // would mutate the user's native formula). Flagged loudly via the ledger note.
  if (substitute) {
    useEngineStore.getState().loadScene({ preset: substitute.preset as Preset });
    return { ok: true, ledger, summary: ledger.slotFlags[0]?.note ?? substitute.formulaId };
  }

  if (!def) {
    return { ok: false, reason: ledger.reasons.join(' '), ledger };
  }
  // Imported scenes carry a Weave-Editor-openable source (re-weave any import);
  // synthetic standalone loads (iterCount 0) don't.
  const ws = weaveSourceFromScene(scene);
  if (ws) def.weaveSource = ws;
  registry.register(def);
  FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
  // defaultPreset is built complete (cloned from Amazing Box) though typed Partial.
  useEngineStore.getState().loadScene({ preset: def.defaultPreset as Preset });
  const names = ledger.slotFlags.map((s) => s.name).join(' → ');
  return { ok: true, ledger, summary: names };
}

/** Load from a pasted `Mandelbulb3Dv18{...}` text block. */
export function loadMB3DScene(text: string): LoadMB3DResult {
  return loadFromScene(parseMB3D(text));
}

/** Load from a raw binary `.m3p` file's bytes. */
export function loadMB3DSceneBytes(bytes: Uint8Array, title?: string): LoadMB3DResult {
  return loadFromScene(parseMB3DBinary(bytes, title));
}

// ── Standalone single-formula loading (no MB3D scene file) ──────────────────
// A faithful formula can be loaded on its own with its authored default options,
// by synthesizing a one-slot scene and running it through the same fuse → load
// path. iterCount 0 makes buildWeaveSequence return order [0] (the single-slot
// case); parametric mode then exposes the formula's options as sliders.

const DEFAULT_ITER = 32;

function defaultHeader(): MB3DHeader {
  return {
    mandId: 0, width: 640, height: 480, iterations: DEFAULT_ITER, iOptions: 0, bNewOptions: 0,
    zoom: 1, fovY: 0, dZstart: 0, dZend: 0, midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0,
    hVGrads: [], // no nav matrix → mapMB3DCamera falls back to the centered default
    isJulia: false, jx: 0, jy: 0, jz: 0, jw: 0, m3dVersion: 18, tilingOptions: 0,
    // 0 → the scene-DE override in emitFusedHybrid is skipped; a standalone formula
    // keeps its own DE defaults (mapDEMeta) since there's no authored scene.
    rStop: 0, deStop: 0, zStepDiv: 0, stepsAfterDEStop: 0,
    // No authored lighting → empty lights makes mapMB3DLighting return nothing, so the
    // preset inherits DEFAULT_LIGHTS (mirrors hVGrads:[] → centered-camera fallback).
    lights: [], roughnessFactor: 0, tbpos: [], tbOptions: 0,
    ambCol: '', ambCol2: '', depthCol: '', depthCol2: '', dynFog: '', colStops: [],
  };
}

function synthScene(slot: MB3DFormulaSlot, title: string): MB3DScene {
  const addon: MB3DAddon = {
    version: 0, options1: 0, options2: 0, options3: 0,
    formulaCount: 1, hybOpt1: 0, hybOpt2: 0, slots: [slot],
  };
  return { version: 18, header: defaultHeader(), addon, title, raw: new Uint8Array(0) };
}

/** Load one x87-decompiled `[CODE]` formula standalone, at its authored defaults. */
export function loadDecompiledFormula(name: string): LoadMB3DResult {
  if (!DECOMPILED_FORMULAS[name]) {
    const ledger: WeaveLedger = { mode: 0, supported: false, reasons: [`Unknown formula "${name}".`], slotFlags: [] };
    return { ok: false, reason: ledger.reasons[0], ledger };
  }
  const d = DECOMPILED_DEFAULTS[name] ?? { optionTypes: [], optionValues: [], optionCount: 0 };
  const slot: MB3DFormulaSlot = {
    iterCount: 0, formulaIndex: 20, name,
    optionCount: d.optionCount, optionTypes: d.optionTypes.slice(), optionValues: d.optionValues.slice(),
  };
  return loadFromScene(synthScene(slot, name));
}

/** Load one intern formula (#0..#4) standalone, with the given option values. */
export function loadInternFormula(formulaIndex: number, name: string, optionValues: number[]): LoadMB3DResult {
  const slot: MB3DFormulaSlot = {
    iterCount: 0, formulaIndex, name,
    optionCount: optionValues.length, optionTypes: optionValues.map(() => 0), optionValues: optionValues.slice(),
  };
  return loadFromScene(synthScene(slot, name));
}

// ── User-authored weaves (the Weave Editor) ─────────────────────────────────

/** Build a Weave-Editor-openable source from a real (parsed) MB3D scene, so any
 *  imported scene can be cracked open and re-woven. Skipped for the synthetic
 *  single-slot standalone loads (their slots carry iterCount 0). Slots up to the
 *  clamped endTo are included verbatim (zero-count gaps keep indices aligned
 *  with the schedule's repeatFrom). */
function weaveSourceFromScene(scene: MB3DScene): FractalDefinition['weaveSource'] | undefined {
  const addon = scene.addon;
  if (!addon || !addon.slots.some((s) => (s?.iterCount ?? 0) !== 0)) return undefined;
  const { spec } = weaveSpecFromMB3D(addon);
  const sched = spec.schedule as { kind: 'counts'; endTo: number; repeatFrom: number };
  const slots = addon.slots.slice(0, sched.endTo + 1).filter((s): s is MB3DFormulaSlot => !!s);
  return {
    version: 1,
    title: scene.title || 'MB3D Weave',
    slots: slots.map((slot) => ({
      label: slot.name || (slot.formulaIndex >= 20 ? 'CODE formula' : `Intern #${slot.formulaIndex}`),
      kind: slot.formulaIndex < 0 ? 'native' : slot.formulaIndex >= 20 ? 'decompiled' : 'intern',
      ref: slot.formulaIndex >= 0 && slot.formulaIndex < 20 ? slot.formulaIndex : slot.name,
      slot: { ...slot, optionTypes: [...slot.optionTypes], optionValues: [...slot.optionValues] },
    })),
    schedule: { kind: 'counts', repeatFrom: sched.repeatFrom },
  };
}

/** Synthesize a multi-slot mode-0 weave scene from weaver-picked slots. endTo
 *  rides the mode-0 clamp in weaveSpecFromMB3D (last active slot); `repeatFrom`
 *  is MB3D's "repeat from here" nibble — earlier slots run once as an intro. */
export function buildWeaveScene(slots: MB3DFormulaSlot[], title: string, iterations?: number, repeatFrom = 0): MB3DScene {
  const header = defaultHeader();
  if (iterations && iterations > 0) header.iterations = iterations;
  const addon: MB3DAddon = {
    version: 0, options1: 0, options2: 0, options3: 0,
    formulaCount: slots.length, hybOpt1: (repeatFrom & 0xF) << 4, hybOpt2: 0, slots,
  };
  return { version: 18, header, addon, title, raw: new Uint8Array(0) };
}

/**
 * Build + register + load a user-authored weave (the Weave Editor's Build button).
 *
 * Unlike scene imports, rebuilds happen INSIDE an editing session — so the current
 * camera / lights / atmosphere / materials / coloring are preserved (the Formula
 * Workshop preview pattern) and only the formula-bearing features (coreMath,
 * geometry, quality — the emit's DE routing) come from the new preset. The
 * WeaveSpec-shaped `weaveSource` is attached to the def so the weave can be
 * reopened and re-edited (importSource pattern, ADR-0058/0089).
 */
export function loadUserWeave(
  slots: MB3DFormulaSlot[],
  title: string,
  weaveSource?: import('../../types/fractal').FractalDefinition['weaveSource'],
  repeatFrom = 0,
): LoadMB3DResult {
  // Rhythm (layered modulo) schedule rides in on the weaveSource; the emit swaps the
  // baked counts LUT for the layered runtime-uniform phase fn (uWeave*<k> uniforms).
  const rhythm = weaveSource?.schedule.kind === 'modulo' ? weaveSource.schedule : undefined;
  // Per-option expose/bake directives ride weaveSource.slots (row order = addon
  // slot order, buildWeaveScene keeps them aligned).
  const slotBake = weaveSource?.slots.map((s) => s.bake);
  const { def, ledger } = emitFusedHybrid(
    buildWeaveScene(slots, title, undefined, repeatFrom),
    { ...(rhythm ? { schedule: { kind: 'modulo' as const } } : {}), slotBake },
  );
  if (!def) {
    return { ok: false, reason: ledger.reasons.join(' '), ledger };
  }
  if (weaveSource) def.weaveSource = weaveSource;
  // Stamp the built rhythm into the def's preset so re-picking this formula later
  // (which loads defaultPreset) renders the authored schedule — the uniforms are
  // driven by the DDFS `weave` feature state, not by the def.
  if (rhythm) {
    const weaveState: Record<string, number> = {};
    // Tolerate the pre-layered single-pair shape from early P3b builds.
    const layers = rhythm.layers ?? [{ interval: (rhythm as any).interval ?? 2, startIter: (rhythm as any).startIter ?? 0 }];
    layers.forEach((L, j) => {
      weaveState[`weaveInterval${j + 1}`] = L.interval;
      weaveState[`weaveStartIter${j + 1}`] = L.startIter;
      weaveState[`weaveBeats${j + 1}`] = L.beats ?? 0;
    });
    // Merge (not overwrite): emitFusedHybrid may have stamped native BANK defaults
    // (ADR-0090) into features.weave; the rhythm keys join them.
    const feats = (def.defaultPreset.features ??= {});
    feats.weave = { ...(feats.weave ?? {}), ...weaveState };
  }
  registry.register(def);
  FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });

  const preset: any = def.defaultPreset;
  const store = useEngineStore.getState() as any;
  const current = store.getPreset();
  store.loadPreset({
    ...preset,
    cameraPos: current.cameraPos, cameraRot: current.cameraRot,
    sceneOffset: current.sceneOffset, targetDistance: current.targetDistance,
    cameraMode: current.cameraMode, lights: current.lights,
    features: {
      ...(preset.features || {}),
      atmosphere: current.features?.atmosphere,
      lighting: current.features?.lighting,
      optics: current.features?.optics,
      materials: current.features?.materials,
      coloring: current.features?.coloring,
      coreMath: preset.features?.coreMath,
      geometry: preset.features?.geometry,
      quality: preset.features?.quality,
      // Adopt the freshly-built native BANK defaults (ADR-0090; ws<k>* keys) from
      // the new preset — like coreMath, a formula-structure rebuild reseeds the
      // slot params (a full per-slot transfer is P4.6). But PRESERVE the live
      // RHYTHM params (weave*<k>): the editor writes them to the store directly and
      // a rebuild must not reset the schedule to feature defaults.
      weave: {
        ...(preset.features?.weave ?? {}),
        ...Object.fromEntries(
          Object.entries(current.features?.weave ?? {}).filter(([k]) => k.startsWith('weave')),
        ),
      },
    },
  });
  const names = ledger.slotFlags.map((s) => s.name).join(' → ');
  return { ok: true, ledger, summary: names };
}
