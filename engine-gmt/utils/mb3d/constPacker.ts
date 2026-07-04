/**
 * MB3D const-buffer packer — TS port of `FillCustomVBufWithVars`
 * (CustomFormulas.pas:393) + `BuildRotMatrix` (Math3D.pas:2478).
 *
 * The x87-decompiled formula GLSL references constants by their byte offset into
 * MB3D's per-formula constant buffer (`Cm<offset>`). MB3D fills that buffer from
 * the slot's option values, applying type-specific transforms (angles → rotation
 * matrices, etc.). This reproduces that exactly so we can bake the right literal
 * at each `Cm<offset>` for a given scene's slot.
 *
 * @invariant Offsets must match the decompiler's `Cm<n>` tokens: the buffer is
 *   walked downward from the base, `Cm8 = 0.5` (a fixed prelude), then each
 *   option writes 8 bytes (.DOUBLE) or 4 (.SINGLE / matrix element).
 */

import type { DecompiledOption, DecompiledDEMeta } from './decompiled-formulas';
import { LaneAllocator, ScalarParamPacker } from '../uniformSlots';
import type { PackedParam } from '../uniformSlots';

const PID180 = Math.PI / 180;

/**
 * DivUtils.pas:1616-1644 PAligned16 fixed table — positive byte offsets, FastMove'd
 * into every formula's const buffer (CustomFormulas.pas:334, 216 bytes). These are
 * compile-time literal doubles, NOT a per-scene option dump, so a decompiled body's
 * `Cp<offset>` token resolves to the same constant for every formula. The decompiler
 * cross-check seeds these exact values (xcheck.mjs `PALIGNED16` / `seedConsts`); this
 * is the app-side twin that bakes them into the slot GLSL.
 *
 * @invariant Offsets 0/8 (abs AND-mask 0x7FFF…) and 80/88 (sign XOR-mask 0x8000…) are
 *   bit-patterns, NOT in this table — the decompiler turns `fmul`/`andpd`/`xorpd`
 *   against them into abs()/negate (U6), so they never reach the body as a `Cp` token.
 *   An offset not in this table → the slot is treated as missing (none occur in corpus).
 * @see docs/adr/0083-* (corrects the "ambiguous / needs runtime dump" framing).
 */
export const PALIGNED16: Record<number, number> = {
  16: -2, 24: 1e-100, 32: 1, 40: 1, 48: -1, 56: -1, 64: 2, 72: 2,
  96: -1, 104: 2, 112: 0.5, 120: 3, 128: 4, 136: 5, 144: 6, 152: 7,
  160: 8, 168: 10, 176: 15, 184: 21, 192: 28, 200: 35, 208: 70,
};

/** Euler XYZ → row-major 3×3 (M[0,0]..M[2,2]). Mirrors BuildRotMatrix. */
function buildRotMatrix(xa: number, ya: number, za: number): number[] {
  const sinX = Math.sin(xa), cosX = Math.cos(xa);
  const sinY = Math.sin(ya), cosY = Math.cos(ya);
  const sinZ = Math.sin(za), cosZ = Math.cos(za);
  return [
    cosY * cosZ, -cosY * sinZ, sinY,
    sinX * sinY * cosZ + cosX * sinZ, cosX * cosZ - sinX * sinY * sinZ, -sinX * cosY,
    sinX * sinZ - cosX * sinY * cosZ, cosX * sinY * sinZ + sinX * cosZ, cosX * cosY,
  ];
}

/** 6 plane-rotation angles (radians) → a flat row-major 4×4 matrix (16 elements,
 *  memory order MS4[0,0]..MS4[3,3]). Verbatim port of BuildRotMatrix4d
 *  (Math3D.pas:2548): six plane rotations LEFT-multiplied onto an identity start.
 *  Plane index tables i1=(1,0,0,0,1,2) i2=(2,2,1,3,3,3); each step composes
 *  `ms4 ← SM4_i · ms4` (Multiply2SMatrix4 writes the product into SM4, then
 *  `ms4 := SM4` retains it — the product is kept, NOT discarded). Returned in the
 *  same memory order the const buffer reads the matrix (descending Cm offsets). */
function buildRotMatrix4d(angles: number[]): number[] {
  const i1 = [1, 0, 0, 0, 1, 2];
  const i2 = [2, 2, 1, 3, 3, 3];
  // ms4 = identity, flat row-major (idx = row*4 + col).
  let ms4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let i = 0; i < 6; i++) {
    const s = Math.sin(angles[i]), c = Math.cos(angles[i]);
    const a = i1[i], b = i2[i];
    // SM4 = identity with the (a,b)-plane rotation written in.
    const sm = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    sm[a * 4 + a] = c; sm[b * 4 + b] = c; sm[a * 4 + b] = -s; sm[b * 4 + a] = s;
    // ms4 ← SM4 · ms4  (row-major: out[r,col] = Σ_k sm[r,k]·ms4[k,col]).
    const out = new Array(16).fill(0);
    for (let r = 0; r < 4; r++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += sm[r * 4 + k] * ms4[k * 4 + col];
        out[r * 4 + col] = sum;
      }
    }
    ms4 = out;
  }
  return ms4;
}

const sqr = (v: number) => v * v;

/** Pack a slot's options into a `Map<byteOffset, value>` matching the GLSL refs.
 *  @throws on an option type not yet ported (so coverage gaps are loud). */
export function packConstBuffer(optionValues: number[], optionTypes: number[], optionCount: number): Map<number, number> {
  const map = new Map<number, number>();
  const v = (i: number) => optionValues[i] ?? 0;
  let off = 8;
  map.set(off, 0.5); // fixed prelude (Dec(p,2); PDouble := 0.5)

  let i = 0;
  while (i < Math.min(16, optionCount)) {
    const t = optionTypes[i] ?? 0;
    switch (t) {
      case 0: off += 8; map.set(off, v(i)); break;                                   // .DOUBLE
      case 1: off += 4; map.set(off, v(i)); break;                                   // .SINGLE
      case 2: off += 4; map.set(off, Math.round(v(i))); break;                       // .INTEGER
      case 3: off += 8; map.set(off, Math.sin(v(i) * PID180)); off += 8; map.set(off, Math.cos(v(i) * PID180)); break; // .DOUBLEANGLE
      case 4: off += 4; map.set(off, Math.sin(v(i) * PID180)); off += 4; map.set(off, Math.cos(v(i) * PID180)); break; // .SINGLEANGLE
      case 6: { // .3SINGLEANGLES → 3×3 matrix (9 singles)
        const M = buildRotMatrix(v(i) * PID180, v(i + 1) * PID180, v(i + 2) * PID180);
        for (let j = 0; j < 9; j++) { off += 4; map.set(off, M[j]); }
        i += 2;
        break;
      }
      case 7: { // .BOXSCALE — Scale/Sqr(MinR), Sqr(MinR). MB3D clamps the MinR to ≥1e-40
        // BEFORE squaring (`Sqr(Max(1e-40, MinR))`, CustomFormulas.pas:462), so a NEGATIVE
        // MinR collapses to ~0 and DISABLES the inner sphere-fold (the `R² < MinR²` branch
        // never fires). Squaring first (Max(1e-40, MinR²)) keeps the full positive radius and
        // wrongly leaves the fold active with a huge radius, collapsing the set toward origin —
        // that blacked out LightBulbMoon (MinR −3.1) while positive-MinR boxes were unaffected.
        const minR = Math.max(1e-40, v(i));
        off += 8; map.set(off, v(i - 1) / sqr(minR)); off += 8; map.set(off, sqr(minR)); break;
      }
      case 8: for (const s of [1, 2, -1, -2]) { off += 8; map.set(off, s * v(i)); } off += 4; break; // .FOLDING (R,2R,-R,-2R + a 4-byte fHIntFunctions ptr slot)
      case 9: off += 8; map.set(off, sqr(v(i))); break;                              // .DSQUARE
      case 11: for (const s of [1, 1, -1, -1]) { off += 8; map.set(off, s * v(i)); } break; // .FOLDING16
      case 12: { // .6SINGLEANGLES → 4×4 rotation matrix (16 singles), 6 angles consumed
        const M4 = buildRotMatrix4d([v(i), v(i + 1), v(i + 2), v(i + 3), v(i + 4), v(i + 5)].map((d) => d * PID180));
        for (let j = 0; j < 16; j++) { off += 4; map.set(off, M4[j]); }
        i += 5; // + the outer i++ → 6 option values consumed (CustomFormulas.pas:504)
        break;
      }
      case 13: off += 8; map.set(off, 1 / (Math.abs(v(i)) < 1e-40 ? 1e-40 : v(i))); break; // .DRECIPRO
      case 14: off += 8; map.set(off, v(i)); off += 8; map.set(off, v(i)); break;     // .2DOUBLES (SSE2: same value in both packed lanes)
      case 15: off += 8; map.set(off, 1 / Math.max(1e-40, sqr(v(i)))); break;          // .DSQRRECI — 1/Max(1e-40, v²) (CustomFormulas.pas:516; unblocks toricaleggs' sphereIFS)
      case 21: off += 4; map.set(off, v(i)); off += 4; map.set(off, 1 / (Math.abs(v(i)) < 1e-40 ? 1e-40 : v(i))); break; // .SRECI2 (single + reciprocal single)
      case 22: off += 8; map.set(off, v(i)); off += 8; map.set(off, 1 / (Math.abs(v(i)) < 1e-40 ? 1e-40 : v(i))); break; // .DRECI2 (double + reciprocal double)
      default: throw new Error(`const-pack: unported option type ${t} at index ${i}`);
    }
    i++;
  }
  return map;
}

/** MB3D formula DE settings → GMT preset.features.quality, so a decompiled
 *  formula renders with its own estimator/step/bailout (not AmazingBox's clone).
 *  Estimator selection is decoded from doHybridPasDE (formulas.pas:3729-3736):
 *    (DEoption & $38) == 32 → Log = Sqrt(Rout)·0.5·Ln(Rout)/Deriv1 → GMT estimator 0;
 *    (DEoption & 7)  == 4   → Julia = Abs(y)·Ln|y|/w (no GMT analog) → estimator 0;
 *    else (AmBox + IFS + transforms) → Sqrt(Rout)/Abs(w) = r/dr → GMT estimator 2.
 *  DEscale → fudgeFactor; RStop² → deBailout (clamped to GMT's slider max 1000).
 *  DEoption 20 = MB3D dIFS (the *IFS family, 47 formulas) → estimator 6, the
 *  orbit-trap IFS estimator: the formula writes a per-iteration surface distance
 *  (mb3dRout) and accumulates an absolute scale (mb3dVary); emitFusedHybrid threads
 *  the running minimum of mb3dRout/mb3dVary into g_difsDE, which estimator 6's
 *  getDist returns (mirrors MB3D doHybridIFS3D, formulas.pas:3210). The bounded IFS
 *  orbit never escapes, so a high deBailout (1000) is required or the loop breaks
 *  early and the running min is incomplete. Fudge starts conservative — the running
 *  min is a lower bound (safe to undershoot), tuned against the MB3D refs. */
export function mapDEMeta(de: DecompiledDEMeta): Record<string, number> {
  const opt = de.deOption;
  if (opt === 20) {
    return {
      estimator: 6.0,
      fudgeFactor: 0.7,
      deBailout: 1000,
      // MB3D's DE radius is Euclidean (`r := Sqrt(Rout)`, formulas.pas:2498) — MB3D
      // has NO distance-metric option, so Euclidean (0) is the faithful value. The
      // prior Chebyshev (1) was an unjustified divergence on every import. @see ADR-0088.
      distanceMetric: 0.0,
    };
  }
  // doHybridPasDE estimator (formulas.pas:3729-3736), bitmask-faithful: Log (opt&$38==32)
  // and Julia (opt&7==4) are analytic → GMT estimator 0; everything else — box folds,
  // IFS, transforms (opt 0/2/6/11/21/-1) — is r/dr = GMT estimator 2. The old rule
  // ({2,5,6,11}→1 / else→0) was wrong twice: box/IFS folds are r/dr (estimator 2, NOT
  // GMT's native-AmazingBox (r-1)/dr estimator 1), and opt 0/21 are r/dr too but were
  // mis-routed to the analytic Log (estimator 0). @see formulas.pas:3729 / S1 item 1b.
  const log = (opt & 0x38) === 32;
  const julia = (opt & 7) === 4;
  return {
    estimator: (log || julia) ? 0.0 : 2.0,
    fudgeFactor: Math.min(1.0, Math.max(0.01, de.deScale || 1)),
    // deBailout = rStop² (MB3D escape `Rout > Sqr(RStop)`, HeaderTrafos.pas:558). Clamp to the
    // raised slider ceiling (1e7), NOT 1000 — fold orbits need the full bailout to develop
    // structure (the old 1000 clamp blanked Recycledrelatives' fan, user-verified). @see ADR-0088.
    deBailout: Math.min(1.0e7, Math.max(1, (de.rStop || 100) * (de.rStop || 100))),
    // Euclidean (0) to match MB3D's `r := Sqrt(Rout)` DE (formulas.pas:2498); MB3D has
    // no distance-metric option. The prior Chebyshev (1) was an unjustified divergence
    // on every import (sharper box corners than MB3D's rounder Euclidean). @see ADR-0088.
    distanceMetric: 0.0,
  };
}

/** GLSL helper: Euler-XYZ degrees → 9 row-major matrix elements (mirrors
 *  BuildRotMatrix). Included once when a parametric decompiled formula has
 *  a 3-angle rotation option. */
export const MB3D_ROT_GLSL = `
void mb3dRot(vec3 deg, out float M[9]) {
  vec3 a = deg * 0.017453292519943295;
  float sx=sin(a.x), cx=cos(a.x), sy=sin(a.y), cy=cos(a.y), sz=sin(a.z), cz=cos(a.z);
  M[0]=cy*cz; M[1]=-cy*sz; M[2]=sy;
  M[3]=sx*sy*cz+cx*sz; M[4]=cx*cz-sx*sy*sz; M[5]=-sx*cy;
  M[6]=sx*sz-cx*sy*cz; M[7]=cx*sy*sz+sx*cz; M[8]=cx*cy;
}`;

/** A slider emitted by bindOptions — a scalar or a packed vec control. */
export type DecompParam = PackedParam;

export interface DecompBinding {
  /** const offset → GLSL expression (uniform read or rotation-matrix element). */
  bindings: Map<number, string>;
  params: DecompParam[];
  coreMath: Record<string, any>;
  /** per-rotation matrix setup lines for the slot wrapper. */
  matrixDecls: string[];
  needsRotHelper: boolean;
}

/** Axis-component name → { prefix, axis }, else null. The axis may TRAIL
 *  ("CScale X", separator optional — the historical form) or LEAD with a required
 *  separator ("Z halfwidth", "X add" — the *IFS convention; the separator guard
 *  keeps "Zoom"-style names from reading as a Z component). */
function axisOf(name: string): { prefix: string; axis: 'x' | 'y' | 'z' } | null {
  const t = /^(.*?)[ _]?([XYZ])$/.exec(name.trim());
  if (t && t[1]) return { prefix: t[1].trim(), axis: t[2].toLowerCase() as 'x' | 'y' | 'z' };
  const l = /^([XYZ])[ _-](.+)$/.exec(name.trim());
  if (l) return { prefix: l[2].trim(), axis: l[1].toLowerCase() as 'x' | 'y' | 'z' };
  return null;
}

/**
 * Parametric binding: instead of baking values, map each option to a GMT param
 * slot and bind each const offset to the matching uniform / matrix element.
 *
 * Allocation goes through the shared {@link LaneAllocator} (threaded across a
 * multi-slot hybrid so each slot's params land on distinct uniforms). Scalar options
 * walk the dense 24-lane scalar pool (`paramA..F` → `uVec2*` comps → `uVec4*` comps);
 * once `paramA..F` is full, surplus scalars pack into the idle vec lanes — the
 * {@link ScalarParamPacker} groups same-base vec-lane scalars into ONE combined vec
 * slider (e.g. `uVec4A` carrying three unrelated params). Genuine vec3s — 3-angle
 * rotations (`mb3dRot`) and "<p> X/Y/Z" triples (e.g. Menger CScale) — take a true
 * `uVec3*` unit. Returns null if the pool overflows or an option type is unmapped —
 * the caller bakes. Offset walk mirrors packConstBuffer exactly.
 *
 * `bake` (P3b Task 2, per-option expose/bake directives): options flagged true are
 * bound to LITERALS via packConstBuffer's exact math instead of taking lanes —
 * INCLUDING option types the live binder can't map (angles, squares, reciprocals,
 * 4×4 rotations), so one odd option no longer forces the whole slot to bake.
 * `bake` absent/empty ⇒ behavior is byte-identical to before.
 */
export function bindOptions(
  optionValues: number[],
  optionTypes: number[],
  optionCount: number,
  options: DecompiledOption[],
  alloc: LaneAllocator,
  bake?: boolean[],
): DecompBinding | null {
  const bindings = new Map<number, string>();
  const matrixDecls: string[] = [];
  let needsRotHelper = false;
  const packer = new ScalarParamPacker(alloc);
  const v = (i: number) => optionValues[i] ?? 0;
  const nm = (oi: number) => options[oi]?.name ?? `opt${oi}`;

  // GLSL float literal (fallback for a .BOXSCALE whose preceding Scale isn't a slider).
  const flit = (x: number) => { const s = String(x); return /[.eE]/.test(s) ? s : s + '.0'; };

  let off = 8;
  bindings.set(off, '0.5'); // fixed prelude
  let i = 0, optIdx = 0;
  let prevScalarUni: string | null = null; // last scalar's accessor — .BOXSCALE divides by it
  while (i < Math.min(16, optionCount)) {
    const t = optionTypes[i] ?? 0;
    const name = nm(optIdx);
    if (bake?.[i]) {
      // BAKE DIRECTIVE: bind this option's const offsets to literals using
      // packConstBuffer's exact math — no lanes consumed, all types coverable.
      switch (t) {
        case 0: off += 8; bindings.set(off, flit(v(i))); break;
        case 1: off += 4; bindings.set(off, flit(v(i))); break;
        case 2: off += 4; bindings.set(off, flit(Math.round(v(i)))); break;
        case 3: off += 8; bindings.set(off, flit(Math.sin(v(i) * PID180))); off += 8; bindings.set(off, flit(Math.cos(v(i) * PID180))); break;
        case 4: off += 4; bindings.set(off, flit(Math.sin(v(i) * PID180))); off += 4; bindings.set(off, flit(Math.cos(v(i) * PID180))); break;
        case 6: {
          // NB: a rotation is ONE logical option (one name entry) spanning 3 raw
          // value slots — advance i by the extra 2, but optIdx only via the shared ++.
          const M = buildRotMatrix(v(i) * PID180, v(i + 1) * PID180, v(i + 2) * PID180);
          for (let j = 0; j < 9; j++) { off += 4; bindings.set(off, flit(M[j])); }
          i += 2;
          break;
        }
        case 7: {
          // Scale/MinR² needs the PRECEDING Scale — which may still be a live lane.
          const minR2 = sqr(Math.max(1e-40, v(i)));
          const scale = prevScalarUni ?? flit(v(i - 1));
          off += 8; bindings.set(off, `(${scale} / ${flit(minR2)})`);
          off += 8; bindings.set(off, flit(minR2));
          break;
        }
        case 8: for (const s of [1, 2, -1, -2]) { off += 8; bindings.set(off, flit(s * v(i))); } off += 4; break;
        case 9: off += 8; bindings.set(off, flit(sqr(v(i)))); break;
        case 11: for (const s of [1, 1, -1, -1]) { off += 8; bindings.set(off, flit(s * v(i))); } break;
        case 12: {
          // One logical option spanning 6 raw value slots (see the t6 note above).
          const M4 = buildRotMatrix4d([v(i), v(i + 1), v(i + 2), v(i + 3), v(i + 4), v(i + 5)].map((d) => d * PID180));
          for (let j = 0; j < 16; j++) { off += 4; bindings.set(off, flit(M4[j])); }
          i += 5;
          break;
        }
        case 13: off += 8; bindings.set(off, flit(1 / (Math.abs(v(i)) < 1e-40 ? 1e-40 : v(i)))); break;
        case 14: off += 8; bindings.set(off, flit(v(i))); off += 8; bindings.set(off, flit(v(i))); break;
        case 15: off += 8; bindings.set(off, flit(1 / Math.max(1e-40, sqr(v(i))))); break;
        case 21: off += 4; bindings.set(off, flit(v(i))); off += 4; bindings.set(off, flit(1 / (Math.abs(v(i)) < 1e-40 ? 1e-40 : v(i)))); break;
        case 22: off += 8; bindings.set(off, flit(v(i))); off += 8; bindings.set(off, flit(1 / (Math.abs(v(i)) < 1e-40 ? 1e-40 : v(i)))); break;
        default: return null; // unported type (mirrors packConstBuffer's throw)
      }
      // A baked Scale is still a valid .BOXSCALE dividend (a literal operand).
      prevScalarUni = (t === 0 || t === 1) ? flit(v(i)) : null;
      i++; optIdx++;
      continue;
    }
    // Plain scalar shapes: .DOUBLE (0), .SINGLE (1), and .2DOUBLES (14 — SSE2: one
    // value packed into BOTH 8-byte lanes, so its lane feeds two consecutive offsets).
    const scalarish = (tt: number) => tt === 0 || tt === 1 || tt === 14;
    /** Bind a scalar option's offset(s) to one GLSL expression, honoring its shape. */
    const bindScalarOffsets = (tt: number, expr: string) => {
      if (tt === 14) { off += 8; bindings.set(off, expr); off += 8; bindings.set(off, expr); }
      else { off += (tt === 0 ? 8 : 4); bindings.set(off, expr); }
    };
    if (scalarish(t)) {
      // X/Y/Z triple → one vec3 (e.g. Menger "CScale X/Y/Z", boxIFS "Z/Y/X halfwidth",
      // mixed-shape "Z add"(t14)/"Y add"/"X add"). Three consecutive scalar-shaped
      // options sharing one prefix whose axes cover {x,y,z} in ANY order — each
      // member binds to the component its OWN axis names.
      const a0 = axisOf(name);
      // A bake directive on a later member breaks the triple — the members fall
      // through as individual scalars (each exposed or baked on its own).
      if (a0 && scalarish(optionTypes[i + 1] ?? -1) && scalarish(optionTypes[i + 2] ?? -1)
          && !bake?.[i + 1] && !bake?.[i + 2]) {
        const a1 = axisOf(nm(optIdx + 1)), a2 = axisOf(nm(optIdx + 2));
        if (a1 && a2 && a1.prefix === a0.prefix && a2.prefix === a0.prefix
            && new Set([a0.axis, a1.axis, a2.axis]).size === 3) {
          const members = [a0, a1, a2];
          const seed = { x: 0, y: 0, z: 0 };
          members.forEach((a, k) => { seed[a.axis] = v(i + k); });
          const lane = packer.vec3(a0.prefix, seed, -8, 8, 0.001);
          if (!lane) return null;
          for (let k = 0; k < 3; k++) {
            bindScalarOffsets(optionTypes[i + k] ?? 0, `${lane.componentBase}.${members[k].axis}`);
          }
          i += 2; optIdx += 2; prevScalarUni = null;
          i++; optIdx++;
          continue;
        }
      }
      const acc = packer.scalar(name, v(i), -8, 8, 0.001);
      if (acc === null) return null;
      bindScalarOffsets(t, acc);
      prevScalarUni = acc;
    } else if (t === 2) {
      // .INTEGER → one scalar lane, rounded. The Cm token is a float operand in the
      // decompiled body, so the lane reads as a float (no int() wrap) — identical
      // whether it lands on paramA..F or a vec component. Control shape from the
      // name + value: a declared range ("OTrap option (0..3)", "Modes (0 to 3)")
      // becomes an integer slider over that range (the old hardcoded 0..1 max made
      // 2..3 unreachable); a 0/1 value with no range is a BOOLEAN → toggle control,
      // and a gating name ("apply scale+add") makes it a vec2 'mixed' candidate.
      const val = Math.round(v(i));
      const range = /\(0\s?(?:\.\.+|to|-)\s?(\d+)\)/i.exec(name);
      const rangeMax = range ? Math.max(1, parseInt(range[1], 10)) : undefined;
      const isBool = !rangeMax && (val === 0 || val === 1);
      const acc = packer.scalar(name, val, 0, rangeMax ?? (isBool ? 1 : Math.max(4, val)), 1,
        isBool ? { bool: true, gates: /^(apply|use|enable|with)\b/i.test(name) } : undefined);
      if (acc === null) return null;
      off += 4;
      bindings.set(off, acc);
      prevScalarUni = null;
    } else if (t === 7) {
      // .BOXSCALE (Min R): two consts — Scale/MinR² then MinR² — from the preceding
      // Scale option. Bind both as live expressions over the Min R lane (+ Scale).
      const m = packer.scalar(name, Math.max(0, v(i)), 0, 4, 0.001);
      if (m === null) return null;
      const scale = prevScalarUni ?? flit(v(i - 1));
      // Sqr(Max(1e-9, MinR)) — clamp BEFORE squaring (mirrors packConstBuffer / MB3D
      // CustomFormulas.pas:462), so a negative MinR disables the inner sphere-fold.
      // `m`/`scale` may be a `uVec2A.x`-style component accessor — valid GLSL operands.
      off += 8; bindings.set(off, `(${scale} / (max(1e-9, ${m}) * max(1e-9, ${m})))`);
      off += 8; bindings.set(off, `(max(1e-9, ${m}) * max(1e-9, ${m}))`);
      prevScalarUni = null;
    } else if (t === 8 || t === 11) {
      // .FOLDING (R,2R,-R,-2R + a 4-byte fn-ptr slot) / .FOLDING16 (R,R,-R,-R) —
      // one "fold" scalar drives all four signed multiples. Mirrors packConstBuffer.
      const u = packer.scalar(name, v(i), 0, 4, 0.001);
      if (u === null) return null;
      const exprs = t === 8 ? [u, `${u} * 2.0`, `-${u}`, `${u} * -2.0`] : [u, u, `-${u}`, `-${u}`];
      for (let k = 0; k < 4; k++) { off += 8; bindings.set(off, exprs[k]); }
      if (t === 8) off += 4; // fHIntFunctions pointer slot (no binding)
      prevScalarUni = null;
    } else if (t === 6) {
      const lane = packer.vec3(name, { x: v(i), y: v(i + 1), z: v(i + 2) }, -180, 180, 0.5);
      if (!lane) return null;
      const mvar = `mb3dM_${lane.id}`;
      matrixDecls.push(`float ${mvar}[9]; mb3dRot(${lane.vec3Accessor}, ${mvar});`);
      needsRotHelper = true;
      for (let j = 0; j < 9; j++) { off += 4; bindings.set(off, `${mvar}[${j}]`); }
      i += 2;
      prevScalarUni = null;
    } else {
      return null; // unmapped type → caller bakes
    }
    i++; optIdx++;
  }
  return { bindings, params: packer.params, coreMath: packer.coreMath, matrixDecls, needsRotHelper };
}
