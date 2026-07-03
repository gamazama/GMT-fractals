// Run the decompiler + x87 cross-check over ALL M3Formulas/*.m3f to triage how
// much of the corpus is faithfully decompilable (the real coverage number).
import fs from 'node:fs';
import path from 'node:path';
import { decompileFormula } from './decompile.mjs';
import { disasm, interpret, glslToJs, SCR, CMP_KEYS, seedConsts, DECODE_DENYLIST } from './xcheck.mjs';

const DIR = 'h:/tmp/mb3d-src/M3Formulas';
function extractCode(f) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let on = 0, h = '';
  for (const l of L) { if (l.trim() === '[CODE]') { on = 1; continue; } if (on && l.startsWith('[')) break; if (on) h += l.trim(); }
  return h;
}

// Formula [CONSTANTS] → Map<byteOffset, value> (Cp0 upward; Double/Int64=8B, Single/Integer=4B).
// These overwrite the PAligned16 defaults; threaded into decompile + interpret so the abs/sign
// mask decode is bypassed for real declared constants. @see ADR-0087.
function parseConstants(f) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let on = 0, off = 0; const map = new Map();
  for (const l of L) {
    const t = l.trim();
    if (t.startsWith('[')) { on = t === '[CONSTANTS]' ? 1 : 0; continue; }
    if (!on || !t) continue;
    const cm = t.match(/^\.?(Double|Single|Integer|Int64)\b.*?=\s*(\S+)\s*$/i);
    if (cm) { const val = parseFloat(cm[2]); if (isFinite(val)) map.set(off, val); off += /^(double|int64)$/i.test(cm[1]) ? 8 : 4; }
  }
  return map;
}

const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.m3f')).sort();
const faithful = [], mismatch = [], nocode = [];
const unhandledOps = new Map();
let unhandledCount = 0, errCount = 0;

for (const file of files) {
  if (DECODE_DENYLIST.has(file.replace(/\.m3f$/i, ''))) continue; // known-flaky decode (see xcheck.mjs)
  const hex = extractCode(path.join(DIR, file));
  if (!hex || hex.length < 8) { nocode.push(file); continue; }
  const bytes = new Uint8Array(hex.match(/../g).map((x) => parseInt(x, 16)));
  const constants = parseConstants(path.join(DIR, file));
  try {
    const { glsl, unhandled } = await decompileFormula(bytes, { constants });
    if (unhandled.length) {
      unhandledCount++;
      for (const u of unhandled) { const op = (u.match(/UNHANDLED (\S+)/) || [])[1]; if (op) unhandledOps.set(op, (unhandledOps.get(op) || 0) + 1); }
      continue;
    }
    const ins = await disasm(bytes);
    const jsFn = glslToJs(glsl);
    const toks = [...glsl.matchAll(/\bC([mp]\d+)\b/g)].map((m) => m[1]);
    const C = seedConsts(toks); // PAligned16 p<off> → known value; option/mask tokens random
    for (const [off, val] of constants) C['p' + off] = val; // real [CONSTANTS] override (verify, not blind-match)
    const consts = new Map(Object.entries(C));
    let fail = 0;
    const R = () => Math.random() * 4 - 2;
    for (let t = 0; t < 300; t++) {
      const cx = R(), cy = R(), cz = R(), cw = R();
      const scr = {}; for (const sn of SCR) scr[sn] = R();
      const v = { x: R(), y: R(), zz: R(), w: 1, cx, cy, cz, cw, ...scr };
      let a, b;
      try { a = interpret(ins, v, consts, constants); b = jsFn(v.x, v.y, v.zz, v.w, C, { x: cx, y: cy, z: cz, w: cw }, scr); } catch { fail = -1; break; }
      for (const k of CMP_KEYS) {
        if (!isFinite(a[k]) || !isFinite(b[k])) continue;
        if (Math.abs(a[k] - b[k]) > 1e-6 * (1 + Math.abs(a[k]))) { fail++; break; }
      }
    }
    if (fail === -1) { errCount++; }
    else if (fail > 0) mismatch.push(file);
    else faithful.push(file);
  } catch (e) { errCount++; }
}

console.log(`\n=== MB3D [CODE] corpus triage (${files.length} .m3f files) ===`);
console.log(`FAITHFUL (decompiled + cross-check MATCH): ${faithful.length}`);
console.log(`MISMATCH (decompiled but x-check FAILED — needs a fix): ${mismatch.length}`);
console.log(`UNHANDLED (uses an x87 op the decompiler doesn't cover yet): ${unhandledCount}`);
console.log(`ERROR (interp threw / other): ${errCount}`);
console.log(`NO [CODE]: ${nocode.length}`);
console.log(`\nTop missing opcodes (add these to widen coverage):`);
[...unhandledOps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([op, n]) => console.log(`  ${op}: ${n} formulas`));
console.log(`\nFaithful sample: ${faithful.slice(0, 18).join(', ')}`);
if (mismatch.length) console.log(`Mismatch sample: ${mismatch.slice(0, 10).join(', ')}`);
