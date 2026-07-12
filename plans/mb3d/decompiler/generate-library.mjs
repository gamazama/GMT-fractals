// Decompile ALL M3Formulas/*.m3f [CODE], cross-check each against the x87
// interpreter, and emit ONLY the verified-faithful ones to the app library:
// engine-gmt/utils/mb3d/decompiled-formulas.ts (GLSL + option metadata + DE).
import fs from 'node:fs';
import path from 'node:path';
import { decompileFormula } from './decompile.mjs';
import { disasm, interpret, glslToJs, SCR, CMP_KEYS, seedConsts, DECODE_DENYLIST } from './xcheck.mjs';

const TYPE_MAP = {
  Double: 0, Single: 1, Integer: 2, DoubleAngle: 3, SingleAngle: 4,
  '3DoubleAngles': 5, '3SingleAngles': 6, Boxscale: 7, Folding: 8, Dsquare: 9,
  Folding16: 11, '6SingleAngles': 12, Drecipro: 13,
  // SSE2-era option types (case-exact keys as they appear in the .m3f corpus).
  // '2Doubles' (14) is the *IFS family's key type — stores one authored value
  // in BOTH packed lanes. The case-variant keys (INTEGER/DSQUARE/DRecipro) and
  // the reciprocal pairs (SReci2/DReci2) round out the single-value SSE2 set.
  '2Doubles': 14, INTEGER: 2, DSQUARE: 9, DRecipro: 13, SReci2: 21, DReci2: 22,
};

function parseM3f(m3fPath) {
  const lines = fs.readFileSync(m3fPath, 'utf8').split(/\r?\n/);
  let section = '', hex = '';
  const options = [];
  // Flat option layout (matches the binary dOptionValue[16] / byOptionType[16]
  // that packConstBuffer/bindOptions walk): a 3-angle option expands to 3 slots.
  const optionTypes = [], optionValues = [];
  const de = { deOption: 0, deScale: 1, rStop: 100 };
  // Formula [CONSTANTS] (CustomFormulas.pas:886): declared values written from Cp0 upward,
  // each advancing pConstPointer16 by its type size (Double/Int64 = 8, Single/Integer = 4),
  // overwriting the PAligned16 defaults. Map byte-offset → value. @see ADR-0087.
  const constants = new Map();
  let constOff = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('[')) { section = t; continue; }
    if (section === '[CODE]') { hex += t; continue; }
    if (section === '[CONSTANTS]' && t) {
      const cm = t.match(/^\.?(Double|Single|Integer|Int64)\b.*?=\s*(\S+)\s*$/i);
      if (cm) {
        const val = parseFloat(cm[2]);
        if (isFinite(val)) constants.set(constOff, val);
        constOff += /^(double|int64)$/i.test(cm[1]) ? 8 : 4;
      }
      continue;
    }
    if (section === '[OPTIONS]' && t.startsWith('.')) {
      const m = t.match(/^\.(\S+)\s+(.*?)\s*=\s*(.*)$/) || t.match(/^\.(\S+)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      if (key === 'DEscale') de.deScale = parseFloat(m[m.length - 1]);
      else if (key === 'DEoption') de.deOption = parseInt(m[m.length - 1], 10);
      else if (key === 'RStop') de.rStop = parseFloat(m[m.length - 1]);
      else if (key in TYPE_MAP && m.length === 4) {
        const type = TYPE_MAP[key];
        options.push({ name: m[2], type });
        const nums = String(m[3]).trim().split(/\s+/).map(Number).filter((n) => isFinite(n));
        const slots = type === 6 ? 3 : 1; // 3SingleAngles consumes 3 flat slots
        for (let k = 0; k < slots; k++) { optionTypes.push(type); optionValues.push(nums[k] ?? nums[0] ?? 0); }
      }
    }
  }
  return { hex, options, de, constants, defaults: { optionTypes, optionValues, optionCount: optionTypes.length } };
}

async function isFaithful(bytes, glsl, constants = new Map()) {
  const ins = await disasm(bytes);
  const jsFn = glslToJs(glsl);
  const toks = [...glsl.matchAll(/\bC([mp]\d+)\b/g)].map((m) => m[1]);
  const C = seedConsts(toks); // PAligned16 p<off> → known value; option/mask tokens random
  // [CONSTANTS] override: seed the formula's declared positive-offset constants with their REAL
  // values (decompile.mjs bakes the same as literals; the interpreter reads them here) — so the
  // gate VERIFIES them instead of blind-matching a random both sides share. @see ADR-0087.
  for (const [off, val] of constants) C['p' + off] = val;
  const consts = new Map(Object.entries(C));
  const R = () => Math.random() * 4 - 2;
  for (let t = 0; t < 500; t++) {
    const cx = R(), cy = R(), cz = R(), cw = R();
    const scr = {}; for (const sn of SCR) scr[sn] = R();
    const v = { x: R(), y: R(), zz: R(), w: 1, cx, cy, cz, cw, ...scr };
    let a, b; try { a = interpret(ins, v, consts, constants); b = jsFn(v.x, v.y, v.zz, v.w, C, { x: cx, y: cy, z: cz, w: cw }, scr); } catch { return false; }
    for (const k of CMP_KEYS) {
      if (!isFinite(a[k]) || !isFinite(b[k])) continue;
      if (Math.abs(a[k] - b[k]) > 1e-6 * (1 + Math.abs(a[k]))) return false;
    }
  }
  return true;
}

const DIR = 'h:/tmp/mb3d-src/M3Formulas';
const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.m3f')).sort();
const glslMap = {}, optMap = {}, deMap = {}, defMap = {}, scrMap = {};
let skipped = 0;
for (const file of files) {
  const name = file.replace(/\.m3f$/i, '');
  if (DECODE_DENYLIST.has(name)) { skipped++; continue; } // known-flaky decode (see xcheck.mjs)
  try {
    const { hex, options, de, defaults, constants } = parseM3f(path.join(DIR, file));
    if (!hex || hex.length < 8) { skipped++; continue; }
    const bytes = new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
    const { glsl, unhandled, scratch } = await decompileFormula(bytes, { constants });
    if (unhandled.length) { skipped++; continue; }
    if (!(await isFaithful(bytes, glsl, constants))) { skipped++; continue; }
    glslMap[name] = glsl; optMap[name] = options; deMap[name] = de; defMap[name] = defaults;
    if (scratch.length) scrMap[name] = scratch;
  } catch { skipped++; }
}

let ts = `/* AUTO-GENERATED by H:/GMT/stuff/mb3d-decomp/generate-library.mjs — do not edit by hand.\n`;
ts += ` * x87-decompiled MB3D [CODE] formula bodies (operate on x,y,zz,w + Cm<offset> consts),\n`;
ts += ` * cross-check-verified against an independent x87 interpreter, with option metadata + DE. */\n\n`;
ts += `export interface DecompiledOption { name: string; type: number; }\n`;
ts += `export interface DecompiledDEMeta { deOption: number; deScale: number; rStop: number; }\n`;
ts += `/** Default option layout (flat, matching the binary dOptionValue/byOptionType\n`;
ts += ` *  arrays that packConstBuffer/bindOptions walk) — lets a formula load\n`;
ts += ` *  standalone with its authored defaults, no MB3D scene file needed. */\n`;
ts += `export interface DecompiledDefaults { optionTypes: number[]; optionValues: number[]; optionCount: number; }\n\n`;
ts += `export const DECOMPILED_FORMULAS: Record<string, string> = {\n`;
for (const [n, g] of Object.entries(glslMap)) ts += `  ${JSON.stringify(n)}: \`\n${g}\n\`,\n`;
ts += `};\n\nexport const DECOMPILED_OPTIONS: Record<string, DecompiledOption[]> = {\n`;
for (const [n, o] of Object.entries(optMap)) ts += `  ${JSON.stringify(n)}: ${JSON.stringify(o)},\n`;
ts += `};\n\nexport const DECOMPILED_DE_META: Record<string, DecompiledDEMeta> = {\n`;
for (const [n, d] of Object.entries(deMap)) ts += `  ${JSON.stringify(n)}: ${JSON.stringify(d)},\n`;
ts += `};\n\nexport const DECOMPILED_DEFAULTS: Record<string, DecompiledDefaults> = {\n`;
for (const [n, d] of Object.entries(defMap)) ts += `  ${JSON.stringify(n)}: ${JSON.stringify(d)},\n`;
ts += `};\n\n/** Per-iteration scratch vars (TIteration3D fields) a formula reads/writes;\n`;
ts += ` *  declared in shader.loopInit + passed inout (see emitFusedHybrid). */\n`;
ts += `export const DECOMPILED_SCRATCH: Record<string, string[]> = {\n`;
for (const [n, s] of Object.entries(scrMap)) ts += `  ${JSON.stringify(n)}: ${JSON.stringify(s)},\n`;
ts += `};\n`;

const out = 'h:/GMT/workspace-gmt/stable/engine-gmt/utils/mb3d/decompiled-formulas.ts';
fs.writeFileSync(out, ts, 'utf8');
console.log(`wrote ${out}: ${Object.keys(glslMap).length} verified-faithful formulas (${skipped} skipped)`);
console.log('formulas:', Object.keys(glslMap).join(', '));
