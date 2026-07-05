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
import type { MB3DScene, MB3DFormulaSlot } from './parseMB3D';
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
// Scene synthesis itself is store-free and lives in sceneSynth.ts (shared with
// the P4.4 legacy-save migration + render harness); re-exported here for the
// existing callers.
import { synthScene, buildWeaveScene } from './sceneSynth';
export { buildWeaveScene };

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

/** Merge freshly-built weave feature state with the LIVE one on an editor Rebuild.
 *  Fresh supplies the schema + native BANK defaults (ADR-0090); from live we keep:
 *   - RHYTHM params (`weave*`) — the editor writes these to the store directly;
 *   - per-slot BANK values (`ws<k>*`), FOLLOWING each slot across a reorder: a new
 *     bank inherits the live values of the first not-yet-claimed OLD bank with the
 *     same slot identity (kind:ref), re-indexed onto the new bank. So a Build that
 *     only reorders/tweaks slots keeps every slot's params; a genuinely NEW slot
 *     takes the fresh defaults. Duplicates of one formula claim old banks in order;
 *   - for a FIRST build off a single formula, that formula's live coreMath params
 *     carry onto bank 0 (same continuity).
 *  @see docs/adr/0090-weave-slot-banks.md */
function mergeWeaveBanks(
  fresh: Record<string, any>,
  live: Record<string, any>,
  newSlots: Array<{ kind: string; ref: string | number }>,
  oldFormula: string,
  oldCoreMath: Record<string, any>,
): Record<string, any> {
  const merged: Record<string, any> = { ...fresh };
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // Live rhythm params always win (the schedule the user set live).
  for (const [k, v] of Object.entries(live)) if (k.startsWith('weave')) merged[k] = v;

  const ident = (s?: { kind: string; ref: string | number }) => (s ? `${s.kind}:${s.ref}` : '');
  const oldSlots = (registry.get(oldFormula as any) as FractalDefinition | undefined)?.weaveSource?.slots ?? [];
  const claimed = new Set<number>();

  newSlots.forEach((s, k) => {
    const id = ident(s);
    // First not-yet-claimed OLD bank with the same slot identity, so a slot's live
    // params FOLLOW it across a reorder (not pinned to the bank index). Duplicates
    // of one formula claim old banks left-to-right.
    let oldIdx = -1;
    if (id) for (let j = 0; j < oldSlots.length; j++) {
      if (!claimed.has(j) && ident(oldSlots[j]) === id) { oldIdx = j; break; }
    }
    if (oldIdx >= 0) {
      claimed.add(oldIdx);
      // Re-index bank oldIdx's live values (ws<oldIdx>*) onto new bank k (ws<k>*).
      const re = new RegExp(`^ws${oldIdx}([A-Z].*)$`);
      for (const [key, v] of Object.entries(live)) {
        const m = key.match(re);
        if (m) merged[`ws${k}${m[1]}`] = v;
      }
    } else if (k === 0 && oldSlots.length === 0 && id === `native:${oldFormula}`) {
      // First build off a single formula → carry its coreMath onto bank 0.
      for (const [key, v] of Object.entries(oldCoreMath)) {
        const bk = `ws0${cap(key)}`;
        if (bk in merged) merged[bk] = v;
      }
    }
    // else: genuinely new slot → keep the fresh defaults already in `merged`.
  });
  return merged;
}

/**
 * Build + register + load a user-authored weave (the Weave Editor's Build button).
 *
 * Unlike scene imports, rebuilds happen INSIDE an editing session — so the whole
 * scene LOOK is preserved: camera, lights, atmosphere, materials, coloring, the
 * geometry modifiers (Julia/offset · burning · rotation), coreMath, and every
 * quality knob. The ONLY thing that refreshes to the rebuilt formula is the DE
 * ESTIMATOR TYPE (structural — a different weave needs a different estimator);
 * surviving slot banks + live rhythm carry over via mergeWeaveBanks. The
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
  // Loop dividers (P4.7): the counts schedule's `breaks` partition the rows into
  // repeated blocks + a looping tail. Fall back to repeatFrom as a single divider
  // (repeat 1 = MB3D's "repeat from here").
  const counts = weaveSource?.schedule.kind === 'counts' ? weaveSource.schedule : undefined;
  const rf = counts?.repeatFrom ?? repeatFrom;
  const dividers = counts?.breaks?.length
    ? counts.breaks
    : rf > 0 ? [{ afterRow: rf - 1, repeat: 1 }] : undefined;
  // Per-option expose/bake directives ride weaveSource.slots (row order = addon
  // slot order, buildWeaveScene keeps them aligned).
  const slotBake = weaveSource?.slots.map((s) => s.bake);
  // Editor builds always opt into the whole-weave master gate (weaveEnabled,
  // ADR-0089 P4.4): the phase fn reads uWeaveEnabled — live mute-all-layers.
  // Plain MB3D scene imports (loadFromScene) deliberately do NOT.
  const { def, ledger } = emitFusedHybrid(
    buildWeaveScene(slots, title, undefined, repeatFrom),
    { ...(rhythm ? { schedule: { kind: 'modulo' as const, ...(rhythm.baseRow !== undefined ? { baseRow: rhythm.baseRow } : {}) } } : dividers ? { dividers } : {}), slotBake, enableGate: true },
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
      // Rebuild preserves the scene's LOOK — only the DE ESTIMATOR TYPE refreshes
      // to the rebuilt formula (owner call 2026-07-05). geometry (Julia/offset,
      // burning, rotation), coreMath, and every other quality knob (detail, fudge,
      // escape radius, metric, AA) are the user's, carried over; `iterations` only
      // floors UP to the weave's minimum cover so a larger weave still renders.
      coreMath: {
        ...(current.features?.coreMath ?? {}),
        iterations: Math.max(
          current.features?.coreMath?.iterations ?? 0,
          preset.features?.coreMath?.iterations ?? 0,
        ),
      },
      geometry: current.features?.geometry,
      quality: {
        ...(current.features?.quality ?? {}),
        ...(preset.features?.quality?.estimator !== undefined
          ? { estimator: preset.features.quality.estimator }
          : {}),
      },
      // Preserve the live RHYTHM params (weave*) AND the per-slot BANK values
      // (ws<k>*) of slots that survive the rebuild — a Build must not reset slot
      // params to formula defaults (ADR-0090). See mergeWeaveBanks.
      weave: mergeWeaveBanks(
        preset.features?.weave ?? {},
        current.features?.weave ?? {},
        weaveSource?.slots ?? [],
        current.formula,
        current.features?.coreMath ?? {},
      ),
    },
  });
  const names = ledger.slotFlags.map((s) => s.name).join(' → ');
  return { ok: true, ledger, summary: names };
}
