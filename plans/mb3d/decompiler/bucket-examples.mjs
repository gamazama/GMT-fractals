// Dump example formula names per blocking-bucket (for targeted analysis) + the
// 33 "decompile-clean but cross-check fails/errors" near-misses.
import fs from 'node:fs';
import path from 'node:path';
import { decompileFormula } from './decompile.mjs';
import { disasm, interpret, glslToJs } from './xcheck.mjs';

const DIR = 'h:/tmp/mb3d-src/M3Formulas';
function extractCode(f) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let on = 0, h = '';
  for (const l of L) { if (l.trim() === '[CODE]') { on = 1; continue; } if (on && l.startsWith('[')) break; if (on) h += l.trim(); }
  return h;
}
const JUMPS = new Set(['je','jz','jne','jnz','jmp','ja','jae','jb','jbe','jg','jge','jl','jle','jo','jno','js','jns','jp','jnp','jc','jnc','jcxz','jecxz','loop','loope','loopne','call']);
const isSSE = (op) => /sd$|ss$|pd$|ps$|^movq$|^movd$|^punpck|^pxor$|^pshuf|^cvt|^comisd$|^ucomisd$|^movdqa$|^movdqu$|^movhpd$|^movlpd$/.test(op);
const cat = (op) => JUMPS.has(op) ? 'control-flow' : op === 'mem' ? 'complex-mem' : isSSE(op) ? 'sse2' : 'other-x87';

const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.m3f')).sort();
const buckets = {};
const nearMiss = [];
for (const file of files) {
  const name = file.replace(/\.m3f$/i, '');
  const hex = extractCode(path.join(DIR, file));
  if (!hex || hex.length < 8) continue;
  const bytes = new Uint8Array(hex.match(/../g).map((x) => parseInt(x, 16)));
  let res; try { res = await decompileFormula(bytes); } catch { continue; }
  if (res.unhandled.length) {
    const cats = new Set();
    for (const u of res.unhandled) { const op = (u.match(/UNHANDLED (\S+)/) || [])[1]; if (op) cats.add(cat(op)); }
    const key = [...cats].sort().join(' + ');
    (buckets[key] ||= []).push(name);
  } else {
    // clean decompile — does cross-check pass?
    try {
      const ins = await disasm(bytes);
      const jsFn = glslToJs(res.glsl);
      const offs = [...res.glsl.matchAll(/\bCm(\d+)\b/g)].map((m) => +m[1]);
      const C = {}; for (const o of new Set(offs)) C[o] = Math.random() * 2 - 1;
      const consts = new Map(Object.entries(C).map(([k, v]) => [+k, v]));
      let bad = 0;
      for (let t = 0; t < 300; t++) {
        const v = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2, zz: Math.random() * 4 - 2, w: 1 };
        const a = interpret(ins, v, consts), b = jsFn(v.x, v.y, v.zz, v.w, C);
        for (const k of ['x', 'y', 'zz', 'w']) { if (!isFinite(a[k]) || !isFinite(b[k])) continue; if (Math.abs(a[k] - b[k]) > 1e-6 * (1 + Math.abs(a[k]))) { bad++; break; } }
      }
      if (bad > 0) nearMiss.push(name + ' (mismatch)');
    } catch (e) { nearMiss.push(name + ' (interp-throw: ' + String(e.message).slice(0, 40) + ')'); }
  }
}
for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${v.length}] ${k}\n  ${v.slice(0, 24).join(', ')}`);
}
console.log(`\n[${nearMiss.length}] NEAR-MISS (clean decompile, cross-check FAILS — likely decompile bugs)\n  ${nearMiss.slice(0, 40).join(', ')}`);
