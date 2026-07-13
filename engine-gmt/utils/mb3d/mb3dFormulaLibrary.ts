/**
 * MB3D formula library = the auto-generated, cross-check-verified decompiled corpus
 * (`decompiled-formulas.ts`) OVERLAID with hand-ported formulas the offline decompiler
 * cannot lift.
 *
 * Why a manual overlay exists: a few MB3D `[CODE]` formulas fold coordinates by editing
 * the raw IEEE-754 bits of the double (masking the exponent, extracting the sign) rather
 * than with ordinary float math. The decompiler models a numeric FPU/SSE stack, not
 * dword-level bit surgery, so it emits `// UNHANDLED` for those branches and the generator
 * filters the formula out. Rather than teach the decompiler a whole bit-lift path (its
 * cross-check referee runs in float64 and can't validate a float32 shader bit-port — the
 * agreement is structurally unreachable), we hand-port the *one* formula that needs it and
 * verify the port byte-exactly against a float64 oracle offline.
 *
 * Consumers import the `DECOMPILED_*` names from HERE, not from `./decompiled-formulas`,
 * so manual entries survive regeneration (`generate-library.mjs` only rewrites the generated
 * file). Manual entries win on key collision (spread last).
 *
 * @see engine-gmt/utils/mb3d/manualBodies below · plans/mb3d/converter-design.md
 */
import {
  DECOMPILED_FORMULAS as GEN_FORMULAS,
  DECOMPILED_OPTIONS as GEN_OPTIONS,
  DECOMPILED_DE_META as GEN_DE_META,
  DECOMPILED_DEFAULTS as GEN_DEFAULTS,
  DECOMPILED_SCRATCH as GEN_SCRATCH,
} from './decompiled-formulas';
import type { DecompiledOption, DecompiledDEMeta, DecompiledDefaults } from './decompiled-formulas';

export type { DecompiledOption, DecompiledDEMeta, DecompiledDefaults };

/**
 * Amazing Surf 2 — MB3D's "infinitized" fold. Fold X and Y are wrapped around the
 * origin by resetting each coordinate's exponent field: the magnitude of a double
 * `x = ±1.m·2^k` is remapped to its significand `1.m ∈ [1,2)` (a tent fold in
 * log-space), then rescaled by `±2^k`. MB3D does this by masking the double's high
 * dword (`and [ptr+4],0xfff00000`, `xor …,0x3ff00000`); the decompiler left two
 * `UNHANDLED jae` branches, so the corpus generator dropped it.
 *
 * Below: the scale-multiply + the rotation / sphere-inversion DE / c-add tail are the
 * decompiler's own faithful GLSL (no bit-hacking there — the pipeline packs Cm40 = Scale,
 * Cm80 = Fold-fiddler, Cm44..Cm76 = Rotation1 matrix, Cm16/24/32 = the SI-fold consts).
 * The two `{ … }` fold blocks are the hand-port: a float32 transliteration of the x87
 * IEEE-754 bit surgery (float64 layout 0x3ff00000/0xfff00000 → float32 0x3f800000/
 * 0xff800000; the LSB-of-exponent sign trick bit20→bit31 becomes bit23→bit31). Verified
 * byte-exact against a float64 oracle over the input range (maxAbsErr 1.9e-7 = float32
 * rounding only; x=0/denormal/large edge cases + the fiddler "bend" all match).
 * `precision highp int` (shaders/chunks/uniforms.ts) guarantees the 32-bit bit ops.
 */
const AMAZING_SURF_2 = `
  float f0, f1, f2, f3, f4, f5, f6, f7;
  // Scale-multiply (Cm40 = Scale), optional abs per Fold-fiddler bits 1 / 2.
  f0 = Cm40;
  f1 = f0 * x;
  if ((int(Cm80) & 1) != 0) f1 = abs(f1);
  x = f1;
  f0 = f0 * y;
  if ((int(Cm80) & 2) != 0) f0 = abs(f0);
  y = f0;
  // Infinitized fold on X (hand-port; Fold-fiddler bit 4 = inside "bend").
  {
    float v = x;
    uint hs = floatBitsToUint(v) & 0xff800000u;                        // sign + exponent
    if (v > 2.0 || v <= -2.0) {
      hs = (hs & 0x80000000u) | 0x3f800000u;                           // outside box: pow2 = sign·1
    } else {
      if ((int(Cm80) & 4) != 0) { v = v - 1.5 * v / abs(v); hs = floatBitsToUint(v) & 0xff800000u; }
      v = uintBitsToFloat((floatBitsToUint(v) & 0x007fffffu) | 0x3f800000u);   // magnitude -> significand [1,2)
    }
    v = uintBitsToFloat(hs) * (0.5 - abs(abs(v) - 1.5));               // pow2 * tent-fold
    v = uintBitsToFloat(floatBitsToUint(v) ^ ((hs & 0x00800000u) << 8));       // exponent-parity sign flip
    x = v;
  }
  // Infinitized fold on Y (Fold-fiddler bit 8 = bend).
  {
    float v = y;
    uint hs = floatBitsToUint(v) & 0xff800000u;
    if (v > 2.0 || v <= -2.0) {
      hs = (hs & 0x80000000u) | 0x3f800000u;
    } else {
      if ((int(Cm80) & 8) != 0) { v = v - 1.5 * v / abs(v); hs = floatBitsToUint(v) & 0xff800000u; }
      v = uintBitsToFloat((floatBitsToUint(v) & 0x007fffffu) | 0x3f800000u);
    }
    v = uintBitsToFloat(hs) * (0.5 - abs(abs(v) - 1.5));
    v = uintBitsToFloat(floatBitsToUint(v) ^ ((hs & 0x00800000u) << 8));
    y = v;
  }
  // Rotation (Cm44..Cm76) + sphere-inversion DE (Cm16/24/32) + c-add — VERBATIM decompiler
  // output (register-swap dance preserved exactly; no bit-hacking here).
  f0 = x;
  f0 = f0 / Cm40;
  f1 = y;
  f1 = f1 / Cm40;
  f2 = zz;
  f3 = f2;
  f3 = f3 * Cm68;
  f4 = f1;
  f4 = f4 * Cm72;
  f3 = f3 + f4;
  f4 = f0;
  f4 = f4 * Cm76;
  f3 = f3 + f4;
  f4 = f2;
  f4 = f4 * Cm44;
  f5 = f1;
  f5 = f5 * Cm48;
  f4 = f4 + f5;
  f5 = f0;
  f5 = f5 * Cm52;
  f4 = f4 + f5;
  { float t = f4; f4 = f2; f2 = t; }
  f4 = f4 * Cm56;
  { float t = f4; f4 = f1; f1 = t; }
  f4 = f4 * Cm60;
  f1 = f1 + f4;
  { float t = f3; f3 = f0; f0 = t; }
  f3 = f3 * Cm64;
  f1 = f1 + f3;
  f3 = f2;
  f3 = f3 * f2;
  f4 = f1;
  f4 = f4 * f1;
  f3 = f3 + f4;
  f4 = f0;
  f4 = f4 * f0;
  f3 = f3 + f4;
  if (!(f3 >= Cm32)) {
  f3 = f3;
  f3 = Cm24;
  } else {
  f4 = 1.0;
  if (!(f4 < f3)) {
  f4 = f4;
  f3 = Cm16 / f3;
  } else {
  f3 = Cm16;
  }
  }
  f4 = w;
  f4 = f4 * f3;
  w = f4;
  f0 = f0 * f3;
  f1 = f1 * f3;
  f2 = f2 * f3;
  f2 = f2 + c.z;
  zz = f2;
  f1 = f1 + c.y;
  y = f1;
  f0 = f0 + c.x;
  x = f0;
`;

/** Hand-ported formula bodies (name → GLSL, same shape as DECOMPILED_FORMULAS). */
const MANUAL_FORMULAS: Record<string, string> = {
  'Amazing Surf 2': AMAZING_SURF_2,
};

/** Option metadata mirroring what generate-library.mjs's parseM3f extracts from the .m3f. */
const MANUAL_OPTIONS: Record<string, DecompiledOption[]> = {
  'Amazing Surf 2': [
    { name: 'Scale', type: 0 },
    { name: 'Min R', type: 7 },
    { name: 'FoldXY', type: 0 },
    { name: 'Rotation1', type: 6 },
    { name: 'Fold fiddler', type: 2 },
  ],
};

const MANUAL_DE_META: Record<string, DecompiledDEMeta> = {
  'Amazing Surf 2': { deOption: 2, deScale: 0.2, rStop: 1024 },
};

const MANUAL_DEFAULTS: Record<string, DecompiledDefaults> = {
  'Amazing Surf 2': { optionTypes: [0, 7, 0, 6, 6, 6, 2], optionValues: [2, 0, 0.5, 0, 0, 0, 0], optionCount: 7 },
};

const MANUAL_SCRATCH: Record<string, string[]> = {};

// Manual entries win on key collision (spread last) so a future regeneration that happens
// to include a same-named formula never silently shadows a verified hand-port.
export const DECOMPILED_FORMULAS: Record<string, string> = { ...GEN_FORMULAS, ...MANUAL_FORMULAS };
export const DECOMPILED_OPTIONS: Record<string, DecompiledOption[]> = { ...GEN_OPTIONS, ...MANUAL_OPTIONS };
export const DECOMPILED_DE_META: Record<string, DecompiledDEMeta> = { ...GEN_DE_META, ...MANUAL_DE_META };
export const DECOMPILED_DEFAULTS: Record<string, DecompiledDefaults> = { ...GEN_DEFAULTS, ...MANUAL_DEFAULTS };
export const DECOMPILED_SCRATCH: Record<string, string[]> = { ...GEN_SCRATCH, ...MANUAL_SCRATCH };
