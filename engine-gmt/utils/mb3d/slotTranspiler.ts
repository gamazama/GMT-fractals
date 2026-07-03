/**
 * MB3D slot → GLSL transpiler.
 *
 * Emits one `void <fnName>(inout vec4 z, inout float dr, inout float trap, inout vec4 c)`
 * per formula slot, from MB3D's ACTUAL iteration math (decoded from the Pascal /
 * x87 asm in CustomFormulas.pas + formulas.pas — see plans/mb3d/formula-discrepancies.md).
 * `c` is `inout`: MB3D seeds the per-voxel constant once per pixel, and "c-mixer"
 * slots (e.g. `_updateC2`) EVOLVE it across iterations — that mutation must carry
 * forward or a Mandelbrot-mode hybrid collapses to a plain self-similar fractal.
 *
 * Two modes:
 *  - LITERAL (multi-slot hybrids): each slot's option constants are baked as GLSL
 *    literals — needed because a fused def has ONE shared set of uParam* uniforms,
 *    so 6 slots can't each own paramA.
 *  - PARAMETRIC (single-slot scenes): the body reads uParamA/B/C… and the slot
 *    reports a `params` schema + `coreMath` defaults, so the imported Scale / Min R
 *    / Fold etc. show up as editable sliders.
 *
 * @invariant We transpile MB3D's real math, NOT GMT's same-named formula — the
 *   audit proved most GMT formulas DIFFER from MB3D's. Intern formulas #0..#4
 *   have a FIXED option order.
 */
import type { MB3DFormulaSlot } from './parseMB3D';
import { DECOMPILED_FORMULAS, DECOMPILED_OPTIONS, DECOMPILED_SCRATCH, DECOMPILED_DEFAULTS, DECOMPILED_DE_META } from './decompiled-formulas';
import { packConstBuffer, bindOptions, PALIGNED16 } from './constPacker';
import { LaneAllocator, ScalarParamPacker } from '../uniformSlots';
import type { PackedParam } from '../uniformSlots';

export type SlotTier = 'intern' | 'decompiled' | 'code-sub' | 'unsupported';

export interface SlotFlag {
  slotIndex: number;
  formulaIndex: number;
  name: string;
  tier: SlotTier;
  note: string;
}

/** A GMT formula parameter (slider). Matches FractalParameter's scalar shape. */
export interface InternParam {
  label: string;
  id: 'paramA' | 'paramB' | 'paramC' | 'paramD' | 'paramE' | 'paramF';
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface TranspiledSlot {
  /** Full `void <fnName>(...) {...}` GLSL, or '' when unsupported. */
  glsl: string;
  fnName: string;
  tier: SlotTier;
  flag: SlotFlag;
  /** PARAMETRIC mode only: sliders to expose + their coreMath defaults. Scalar params
   *  land on paramA..F; surplus scalars pack into vec lanes as combined vec controls. */
  params?: PackedParam[];
  coreMath?: Record<string, any>;
  /** Per-iteration scratch vars this slot reads/writes (TIteration3D fields);
   *  emitFusedHybrid declares them in loopInit + threads them as inout params. */
  scratchVars?: string[];
  /** Multi-slot parametric (alloc mode): false if this slot couldn't be exposed
   *  parametrically (unmapped option type / 4D quaternion) → caller bakes all. */
  paramOk?: boolean;
  /** This slot's parametric body calls mb3dRot(). The helper DEFINITION is emitted
   *  ONCE by emitFusedHybrid (not per-slot) — two rotation slots would otherwise
   *  redefine mb3dRot() and fail to compile. */
  needsRotHelper?: boolean;
  /** True if this slot's [CODE] actually UPDATES the DE derivative (writes `w`, or
   *  `mb3dDr1` for a 4D-DE formula) — i.e. supplies a usable analytic `dr`. A
   *  position-only [CODE] (PseudoXDB, IdesFormula, Riemann2) never touches `w`, so the
   *  standard `dr = w` exit leaves `dr` at its init and the analytic r/dr estimator
   *  degenerates to raw `r` (blank). emitFusedHybrid uses this to auto-route a weave
   *  where NO slot writes a derivative to the numerical estimator (7). Intern formulas
   *  all write `dr` → true. @see docs/adr/0085. */
  writesDeriv?: boolean;
}

/**
 * Resolve a scene slot's formula name to its canonical DECOMPILED_* key,
 * case-insensitively. MB3D formula names live on a case-INSENSITIVE Windows
 * filesystem, so a `.m3p` slot can store a name (e.g. lowercase `sphereIFS`) that
 * differs only in case from the library key (the `.m3f` filename's case,
 * `SphereIFS`) yet is the SAME formula. An exact hit short-circuits; otherwise fall
 * back to the lowercase index. Two library formulas can't differ only by case (they
 * collide on the source FS), so the match is unambiguous. (U4 — recovers
 * `material colors`; the dIFS-shrub scenes also need HeightMapIFS, an indirect-call
 * wall, so they stay blocked.)
 */
const DECOMPILED_KEY_BY_LC = new Map(Object.keys(DECOMPILED_FORMULAS).map((k) => [k.toLowerCase(), k]));
function resolveDecompiledName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  if (DECOMPILED_FORMULAS[name]) return name;
  return DECOMPILED_KEY_BY_LC.get(name.toLowerCase());
}

/** Remap an intern formula's fixed-id params (paramA.., uParamA..) onto the shared
 *  cross-slot {@link LaneAllocator} for multi-slot parametric allocation. Interns are
 *  scalar-only; #2 Quaternion is excluded by the caller (reserves paramA/B for the 4D
 *  seeds). Each param takes the next dense scalar lane — once paramA..F is full, surplus
 *  scalars pack into idle vec lanes (the {@link ScalarParamPacker} groups them into one
 *  combined vec slider). Returns the dynamic uniformVars (the per-logical accessor) +
 *  relabelled params/coreMath, or null if the scalar pool overflows. */
function internMultiParam(def: InternFormula, o: number[], alloc: LaneAllocator):
  { vars: Vars; params: PackedParam[]; coreMath: Record<string, any> } | null {
  if (!def.uniformVars || !def.params || !def.coreMath) return null;
  const keys = Object.keys(def.uniformVars);            // logical names, in param order
  const oldParams = def.params(o);
  const packer = new ScalarParamPacker(alloc);
  const vars: Vars = {};
  for (let k = 0; k < keys.length; k++) {
    const op = oldParams[k];
    const acc = packer.scalar(op.label, op.default, op.min, op.max, op.step);
    if (acc === null) return null;
    vars[keys[k]] = acc;
  }
  return { vars, params: packer.params, coreMath: packer.coreMath };
}

/** Format a JS number as a GLSL float literal. */
function f(v: number): string {
  if (!isFinite(v)) return '0.0';
  if (Number.isInteger(v)) return v.toFixed(1);
  const s = String(v);
  return /[.eE]/.test(s) ? s : s + '.0';
}

/** GLSL expressions for each logical constant — literals or uniform names. */
type Vars = Record<string, string>;

interface InternFormula {
  name: string;
  /** Build the body given the fn name + the GLSL expression for each constant. */
  body: (fn: string, v: Vars) => string;
  /** Literal-mode constant expressions (baked from option values). */
  literalVars: (o: number[]) => Vars;
  /** Parametric-mode constant expressions (uParam* reads). Absent ⇒ literal-only. */
  uniformVars?: Vars;
  /** Slider schema with imported values as defaults (parametric mode). */
  params?: (o: number[]) => InternParam[];
  /** coreMath overrides so the uParam* read the imported values (parametric mode). */
  coreMath?: (o: number[]) => Record<string, number>;
}

/** Latitude-convention spherical bulb at arbitrary power — MB3D's iteration for
 *  both #0 Integer Power (integer power 2..8) and #1 Real Power (float power).
 *  The audit confirmed they are the same latitude triplex; the power is read from
 *  the option, NOT hardcoded (spineJulia is power 8, not 2). */
const latitudeBulb = (fn: string, v: Vars): string => `
void ${fn}(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
  vec3 p = z.xyz;
  float r = length(p);
  float fpow = ${v.power};
  dr = pow(r, fpow - 1.0) * fpow * dr + 1.0;
  float th = atan(p.y, p.x) * fpow;
  float ph = atan(p.z, length(p.xy)) * fpow;
  float rp = pow(r, fpow);
  float cph = cos(ph);
  p.x = rp * cph * cos(th) + c.x;
  p.y = rp * cph * sin(th) + c.y;
  p.z = ${v.zmul} * rp * sin(ph) + c.z;
  z.xyz = p;
  trap = min(trap, length(p));
}`;

const bulbParams = (o: number[]): InternParam[] => [
  { label: 'Power', id: 'paramA', min: 2, max: 16, step: 0.001, default: o[0] ?? 8 },
  { label: 'Z Multiplier', id: 'paramB', min: -2, max: 2, step: 0.001, default: o[1] ?? 1 },
];

/** Intern #6 Folding Int Pow — MB3D `HybridFolding` (formulas.pas:5153). A per-axis
 *  abs-fold `q = abs(q+fold) - abs(q-fold) - q` (fold = option[2], type-8 .FOLDING),
 *  then `call [edi-52]` runs the intern-#0 integer-power latitude bulb on the folded
 *  point (power = round(option[0]), Zmul = option[1]). The fold leaves dr untouched
 *  (only the bulb updates it) — matching the asm, which folds x/y/z then calls the bulb. */
const foldIntPow = (fn: string, v: Vars): string => `
void ${fn}(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
  vec3 p = z.xyz;
  float fold = ${v.fold};
  // MB3D HybridFolding (formulas.pas:5160-5170): x' = |x-fold| + x - |x+fold| (per axis).
  // The earlier port was the exact NEGATION (|x+fold|-|x-fold|-x), which mirrored the
  // geometry through the origin → stray foreground surface (Dainbramage "extra triangles").
  p.x = abs(p.x - fold) + p.x - abs(p.x + fold);
  p.y = abs(p.y - fold) + p.y - abs(p.y + fold);
  p.z = abs(p.z - fold) + p.z - abs(p.z + fold);
  float r = length(p);
  float fpow = ${v.power};
  dr = pow(r, fpow - 1.0) * fpow * dr + 1.0;
  float th = atan(p.y, p.x) * fpow;
  float ph = atan(p.z, length(p.xy)) * fpow;
  float rp = pow(r, fpow);
  float cph = cos(ph);
  p.x = rp * cph * cos(th) + c.x;
  p.y = rp * cph * sin(th) + c.y;
  p.z = ${v.zmul} * rp * sin(ph) + c.z;
  z.xyz = p;
  trap = min(trap, length(p));
}`;

const INTERN: Record<number, InternFormula> = {
  // #0 Integer Power — same latitude bulb as #1, with the INTEGER power from o[0].
  0: {
    name: 'Integer Power',
    body: latitudeBulb,
    literalVars: (o) => ({ power: f(Math.round(o[0] ?? 8)), zmul: f(o[1] ?? 1) }),
    uniformVars: { power: 'uParamA', zmul: 'uParamB' },
    params: (o) => bulbParams([Math.round(o[0] ?? 8), o[1] ?? 1]),
    coreMath: (o) => ({ paramA: Math.round(o[0] ?? 8), paramB: o[1] ?? 1 }),
  },

  // #1 Real Power (arbitrary float power, latitude convention). o[0]=power, o[1]=Zmul.
  1: {
    name: 'Real Power',
    body: latitudeBulb,
    literalVars: (o) => ({ power: f(o[0] ?? 8), zmul: f(o[1] ?? 1) }),
    uniformVars: { power: 'uParamA', zmul: 'uParamB' },
    params: (o) => bulbParams(o),
    coreMath: (o) => ({ paramA: o[0] ?? 8, paramB: o[1] ?? 1 }),
  },

  // #2 Quaternion (4D). o[0]=YWmul, o[1]=Wadd. paramA/B are reserved by the kernel
  // for the 4th-dim seeds (see emitFusedHybrid has4D), so the two options are
  // exposed on paramC/paramD instead.
  2: {
    name: 'Quaternion',
    body: (fn, v) => `
void ${fn}(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
  vec4 p = z;
  float nx = p.x * p.x - p.y * p.y - p.z * p.z - p.w * p.w + c.x;
  float ny = 2.0 * (p.y * p.x + p.z * p.w) + c.y;
  float nz = 2.0 * (p.z * p.x + ${v.ywmul} * p.y * p.w) + c.z;
  float nw = 2.0 * (p.w * p.x + p.y * p.z) + ${v.wadd} + c.w;
  float r = length(p);
  dr = 2.0 * r * dr + 1.0;
  z = vec4(nx, ny, nz, nw);
  trap = min(trap, length(z.xyz));
}`,
    literalVars: (o) => ({ ywmul: f(o[0] ?? 1), wadd: f(o[1] ?? 0) }),
    uniformVars: { ywmul: 'uParamC', wadd: 'uParamD' },
    params: (o) => [
      { label: 'YW Multiplier', id: 'paramC', min: -2, max: 2, step: 0.001, default: o[0] ?? 1 },
      { label: 'W Add', id: 'paramD', min: -2, max: 2, step: 0.001, default: o[1] ?? 0 },
    ],
    coreMath: (o) => ({ paramC: o[0] ?? 1, paramD: o[1] ?? 0 }),
  },

  // #3 Tricorn (triplex Mandelbar). o[0]=Zmul(default 1), o[1]=CZmul.
  3: {
    name: 'Tricorn',
    body: (fn, v) => `
void ${fn}(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
  vec3 p = z.xyz;
  float nx = p.x * p.x - p.y * p.y - p.z * p.z + c.x;
  float ny = 2.0 * p.x * p.y + c.y;
  float nz = ${v.zmul} * p.x * p.z + ${v.czmul} * c.z;
  float r = length(p);
  dr = 2.0 * r * dr + 1.0;
  z.xyz = vec3(nx, ny, nz);
  trap = min(trap, length(z.xyz));
}`,
    literalVars: (o) => ({ zmul: f(o[0] ?? 1), czmul: f(o[1] ?? 1) }),
    uniformVars: { zmul: 'uParamA', czmul: 'uParamB' },
    params: (o) => [
      { label: 'Z Multiplier', id: 'paramA', min: -2, max: 2, step: 0.001, default: o[0] ?? 1 },
      { label: 'CZ Multiplier', id: 'paramB', min: -2, max: 2, step: 0.001, default: o[1] ?? 1 },
    ],
    coreMath: (o) => ({ paramA: o[0] ?? 1, paramB: o[1] ?? 1 }),
  },

  // #4 Amazing Box (Tglad/Mandelbox). o[0]=Scale, o[1]=MinR, o[2]=Fold. FixedRadius=1.
  4: {
    name: 'Amazing Box',
    body: (fn, v) => `
void ${fn}(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
  vec3 p = z.xyz;
  p = clamp(p, -${v.fold}, ${v.fold}) * 2.0 - p;
  float rr = dot(p, p);
  float minR2 = max(${v.minR} * ${v.minR}, 1e-9);
  float m;
  if (rr < minR2) m = ${v.scale} / minR2;
  else if (rr < 1.0) m = ${v.scale} / max(rr, 1e-9);
  else m = ${v.scale};
  p = p * m + c.xyz;
  dr = dr * abs(m) + 1.0;
  z.xyz = p;
  trap = min(trap, length(p));
}`,
    literalVars: (o) => ({ scale: f(o[0] ?? 2), minR: f(o[1] ?? 0.5), fold: f(o[2] ?? 1) }),
    uniformVars: { scale: 'uParamA', minR: 'uParamB', fold: 'uParamC' },
    params: (o) => [
      { label: 'Scale', id: 'paramA', min: -4, max: 4, step: 0.001, default: o[0] ?? 2 },
      { label: 'Min Radius', id: 'paramB', min: 0, max: 1.5, step: 0.001, default: o[1] ?? 0.5 },
      { label: 'Folding Limit', id: 'paramC', min: 0.1, max: 2, step: 0.001, default: o[2] ?? 1 },
    ],
    coreMath: (o) => ({ paramA: o[0] ?? 2, paramB: o[1] ?? 0.5, paramC: o[2] ?? 1 }),
  },

  // #6 Folding Int Pow (HybridFolding). o[0]=Integer power (2..8), o[1]=Z multiplier,
  // o[2]='R fold'. Per-axis abs-fold, then the #0 integer-power bulb on the folded point.
  6: {
    name: 'Folding Int Pow',
    body: foldIntPow,
    literalVars: (o) => ({ power: f(Math.round(o[0] ?? 2)), zmul: f(o[1] ?? 1), fold: f(o[2] ?? 1) }),
    uniformVars: { power: 'uParamA', zmul: 'uParamB', fold: 'uParamC' },
    params: (o) => [
      { label: 'Power', id: 'paramA', min: 2, max: 8, step: 1, default: Math.round(o[0] ?? 2) },
      { label: 'Z Multiplier', id: 'paramB', min: -2, max: 2, step: 0.001, default: o[1] ?? 1 },
      { label: 'R Fold', id: 'paramC', min: -4, max: 4, step: 0.001, default: o[2] ?? 1 },
    ],
    coreMath: (o) => ({ paramA: Math.round(o[0] ?? 2), paramB: o[1] ?? 1, paramC: o[2] ?? 1 }),
  },
};

const INTERN_NAMES: Record<number, string> = {
  0: 'Integer Power', 1: 'Real Power', 2: 'Quaternion', 3: 'Tricorn',
  4: 'Amazing Box', 5: 'Bulbox', 6: 'Folding Int Pow',
};

/**
 * Transpile one slot. In `parametric` mode (single-slot scenes) the body reads
 * uParam* and the result carries a `params` slider schema + `coreMath` defaults.
 */
export function transpileSlot(
  slot: MB3DFormulaSlot,
  slotIndex: number,
  fnName: string,
  opts?: { parametric?: boolean; alloc?: LaneAllocator },
): TranspiledSlot {
  const fi = slot.formulaIndex;
  const alloc = opts?.alloc; // multi-slot parametric: shared cross-slot lane allocator
  const def = INTERN[fi];
  // #0..#4 + #6 (Folding Int Pow) are transpiled; #5 Bulbox is still stubbed.
  if (def && ((fi >= 0 && fi <= 4) || fi === 6)) {
    const flag = { slotIndex, formulaIndex: fi, name: INTERN_NAMES[fi] ?? `#${fi}`, tier: 'intern' as const, note: 'transpiled from MB3D source math' };
    // Multi-slot parametric: allocate this intern's scalars from the shared cursor.
    // #2 Quaternion is excluded (the kernel reserves paramA/B for its 4D seeds).
    if (alloc) {
      const mp = fi !== 2 ? internMultiParam(def, slot.optionValues, alloc) : null;
      if (!mp) return { glsl: '', fnName, tier: 'intern', flag, paramOk: false };
      return { glsl: def.body(fnName, mp.vars), fnName, tier: 'intern', flag, params: mp.params, coreMath: mp.coreMath, paramOk: true, writesDeriv: true };
    }
    const useUniform = !!opts?.parametric && !!def.uniformVars;
    const vars = useUniform ? def.uniformVars! : def.literalVars(slot.optionValues);
    // Intern formulas (latitude bulbs / box / IntPow / folds) all thread a real
    // derivative through `dr` (`dr = pow(r,p-1)·p·dr + 1`, `dr = dr·|m| + 1`, …).
    const out: TranspiledSlot = { glsl: def.body(fnName, vars), fnName, tier: 'intern', flag, writesDeriv: true };
    if (useUniform && def.params && def.coreMath) {
      out.params = def.params(slot.optionValues);
      out.coreMath = def.coreMath(slot.optionValues);
    }
    return out;
  }

  // External [CODE] formula we've decompiled offline (x87 → GLSL). Resolve its
  // const-buffer refs (Cm<offset>) from this scene slot's option values. The library
  // key may differ from the scene's slot name only in case (Windows FS) — resolve it.
  const canonName = resolveDecompiledName(slot.name);
  const decompiled = canonName ? DECOMPILED_FORMULAS[canonName] : undefined;
  if (decompiled) {
    // Does this [CODE] update the DE derivative? MB3D carries it in `w` (deOption 2/11)
    // or `mb3dDr1` (deOption 5/6); the wrap always emits `dr = w` on exit, so a
    // position-only body (never writes `w`/`mb3dDr1`) yields dr≡init → analytic r/dr = raw r
    // = blank. This flag lets emitFusedHybrid route a no-derivative weave to est7. @see docs/adr/0085.
    const writesDeriv = /\bw\s*=(?!=)/.test(decompiled) || /\bmb3dDr1\s*=(?!=)/.test(decompiled);
    // dIFS option-count pad (U2). MB3D `.m3p` slots store only the EDITED prefix of the
    // option list (a truncated `optionCount`); MB3D itself renders with the formula's FULL
    // option list — IniCFs overwrites all 16 types + sets the full count (CustomFormulas.pas:222),
    // and the const-buffer walk uses that full count (:411). The packer/binder walk
    // `min(16, optionCount)` and stop early, leaving high offsets (Cm88..112, the dIFS family)
    // unwritten. The decompiled body + cross-check already assume the full list, so feed the
    // packer the option list MB3D would have used: the DEF types throughout (file trailing
    // types are stale/zeroed) and DEF values past the loaded prefix. App-side only → not
    // cross-check-gated; the GLSL bodies are unchanged.
    const defaults = canonName ? DECOMPILED_DEFAULTS[canonName] : undefined;
    if (defaults && slot.optionCount < defaults.optionCount) {
      const values = slot.optionValues.slice();
      for (let k = slot.optionCount; k < defaults.optionCount; k++) values[k] = defaults.optionValues[k];
      slot = { ...slot, optionTypes: defaults.optionTypes.slice(), optionValues: values, optionCount: defaults.optionCount };
    }
    const scratchVars = DECOMPILED_SCRATCH[canonName!] ?? [];
    const scratchParams = scratchVars.map((s) => `, inout float ${s}`).join('');
    // 4D-with-DE formulas (DEoption 5/6) treat `w` as the 4th SPATIAL coordinate, not the
    // DE derivative: MB3D's DE is `Rst/|Deriv1|` (Calc.pas:664) so the running derivative
    // lives in Deriv1 (→ scratch mb3dDr1), while `w` is iterated as a coordinate (the body's
    // first op is `f0 = w` and it writes the folded 4th coord back). deOption 2/11 are the
    // opposite — `Rst/|w|` (Calc.pas:665), so there `w` IS the derivative and the standard
    // w↔dr path is correct. Detect the 4D-coord case by deOption ∈ {5,6} + an mb3dDr1 deriv;
    // seed `w` from the persistent z.w, write the folded coord back to z.w, and route the
    // real derivative mb3dDr1 → dr at exit. (Melting spot bloxx: Sierpinski4ex/MixPinski4.)
    const deOption = canonName ? DECOMPILED_DE_META[canonName]?.deOption ?? -1 : -1;
    const wIsCoord = (deOption === 5 || deOption === 6) && scratchVars.includes('mb3dDr1');
    const wInit = wIsCoord ? 'z.w' : 'dr';
    const wExit = wIsCoord ? 'z = vec4(x, y, zz, w);\n  dr = mb3dDr1;' : 'z.xyz = vec3(x, y, zz);\n  dr = w;';
    // Use the canonical (case-resolved) name so downstream consumers keyed by flag.name
    // — notably emitFusedHybrid's DECOMPILED_DE_META lookup — resolve a case-mismatched
    // slot (lowercase `sphereIFS` → `SphereIFS`) to its real DE meta, not a miss.
    const dflag = (tier: SlotTier, note: string): SlotFlag => ({ slotIndex, formulaIndex: fi, name: canonName ?? slot.name!, tier, note });
    const wrap = (body: string, helper = '', decls: string[] = []) => `${helper}
void ${fnName}(inout vec4 z, inout float dr, inout float trap, inout vec4 c${scratchParams}) {
${decls.map((d) => '  ' + d).join('\n')}${decls.length ? '\n' : ''}  float x = z.x, y = z.y, zz = z.z, w = ${wInit};
${body}
  ${wExit}
  trap = min(trap, length(z.xyz));
}`;
    try {
      // PARAMETRIC: bind options to uniforms + sliders instead of baking. Single-slot
      // gets a fresh allocator (starts at paramA); multi-slot threads the shared
      // cross-slot allocator so each slot's params land on distinct uniforms.
      if (opts?.parametric || alloc) {
        const bound = bindOptions(slot.optionValues, slot.optionTypes, slot.optionCount, DECOMPILED_OPTIONS[canonName!] ?? [], alloc ?? new LaneAllocator());
        if (bound) {
          const missing: string[] = [];
          const body = decompiled
            .replace(/\bCm(\d+)\b/g, (_m, n) => {
              const e = bound.bindings.get(+n);
              if (e === undefined) { missing.push('Cm' + n); return '0.0'; }
              return e;
            })
            .replace(/\bCp(\d+)\b/g, (_m, n) => {
              // PAligned16 fixed-table const (DivUtils.pas:1616 — same for every formula).
              const val = PALIGNED16[+n];
              if (val === undefined) { missing.push('Cp' + n); return '0.0'; }
              return f(val);
            });
          // Any Cm token still present (a const the packer didn't produce) would be an
          // undefined identifier → compile fail. Cp tokens are resolved above (PAligned16)
          // or pushed to `missing`, so a resolved Cp no longer rejects the slot.
          if (missing.length === 0 && !/\bCm\d+\b/.test(body)) {
            // The shared allocator was advanced in place by bindOptions' packer — no
            // post-hoc cursor bump needed (multi-slot threading is automatic).
            return {
              // mb3dRot() DEFINITION is emitted once by emitFusedHybrid (needsRotHelper),
              // not inlined here — two rotation slots would redefine it → compile error.
              glsl: wrap(body, '', bound.matrixDecls),
              fnName, tier: 'decompiled', flag: dflag('decompiled', 'decompiled from MB3D [CODE] (x87) — params exposed'),
              params: bound.params as any, coreMath: bound.coreMath, scratchVars,
              paramOk: true,
              needsRotHelper: bound.needsRotHelper,
              writesDeriv,
            };
          }
        }
        // In multi-slot mode any failure aborts the whole parametric attempt (caller
        // bakes all). Single-slot just falls through to baking this slot.
        if (alloc) return { glsl: '', fnName, tier: 'decompiled', flag: dflag('decompiled', 'multi-slot param bind failed'), paramOk: false };
      }
      // BAKED (multi-slot, or parametric fallback): bake the const values as literals.
      const consts = packConstBuffer(slot.optionValues, slot.optionTypes, slot.optionCount);
      const missing: string[] = [];
      const baked = decompiled
        .replace(/\bCm(\d+)\b/g, (_m, n) => {
          const val = consts.get(+n);
          if (val === undefined) { missing.push('Cm' + n); return '0.0'; }
          return f(val);
        })
        .replace(/\bCp(\d+)\b/g, (_m, n) => {
          // PAligned16 fixed-table const (DivUtils.pas:1616 — same for every formula).
          const val = PALIGNED16[+n];
          if (val === undefined) { missing.push('Cp' + n); return '0.0'; }
          return f(val);
        });
      // Leftover Cm<n> (a const the packer didn't produce) would compile to an
      // undefined identifier; treat as unsupported so the formula is filtered out
      // rather than rendering black. Cp tokens are resolved (PAligned16) or in `missing`.
      const leftover = [...new Set(baked.match(/\bCm\d+\b/g) ?? [])];
      if (missing.length === 0 && leftover.length === 0) {
        return { glsl: wrap(baked), fnName, tier: 'decompiled', flag: dflag('decompiled', 'decompiled from MB3D compiled [CODE] (x87)'), scratchVars, writesDeriv };
      }
      return { glsl: '', fnName, tier: 'unsupported', flag: dflag('unsupported', `decompiled "${slot.name}" but const-pack missing ${[...missing, ...leftover].join(', ')}`) };
    } catch (e: any) {
      return { glsl: '', fnName, tier: 'unsupported', flag: dflag('unsupported', `decompiled "${slot.name}" failed: ${e?.message ?? e}`) };
    }
  }

  let note: string;
  if (fi === 5) {
    note = `intern "${INTERN_NAMES[fi]}" not yet transpiled (radius-gated box/bulb blend)`;
  } else if (fi >= 20 || slot.name) {
    note = `external formula "${slot.name || '#' + fi}" — MB3D ships it as compiled [CODE]; not transpilable`;
  } else {
    note = `formula #${fi} not supported`;
  }
  return {
    glsl: '',
    fnName,
    tier: 'unsupported',
    flag: { slotIndex, formulaIndex: fi, name: slot.name || INTERN_NAMES[fi] || `#${fi}`, tier: 'unsupported', note },
  };
}
