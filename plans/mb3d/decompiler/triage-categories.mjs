// Precise blocking-reason triage: for every UNHANDLED formula, classify the SET
// of capabilities it needs (control-flow / SSE2 / complex-mem / other-x87). The
// ROI question is "how many unlock with control-flow ALONE" = formulas whose
// blocking set is exactly {control-flow}.
import fs from 'node:fs';
import path from 'node:path';
import { decompileFormula } from './decompile.mjs';

const DIR = 'h:/tmp/mb3d-src/M3Formulas';
function extractCode(f) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let on = 0, h = '';
  for (const l of L) { if (l.trim() === '[CODE]') { on = 1; continue; } if (on && l.startsWith('[')) break; if (on) h += l.trim(); }
  return h;
}

const JUMPS = new Set(['je','jz','jne','jnz','jmp','ja','jae','jb','jbe','jg','jge','jl','jle','jo','jno','js','jns','jp','jnp','jc','jnc','jcxz','jecxz','loop','loope','loopne','call']);
const isSSE = (op) => /sd$|ss$|pd$|ps$|^movq$|^movd$|^punpck|^pxor$|^pshuf|^cvt|^comisd$|^ucomisd$|^movdqa$|^movdqu$|^movhpd$|^movlpd$/.test(op);

function classify(op) {
  if (JUMPS.has(op)) return 'control-flow';
  if (op === 'mem') return 'complex-mem';
  if (isSSE(op)) return 'sse2';
  return 'other:' + op;
}

const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.m3f')).sort();
const records = [];
const otherOps = new Map();
let noCode = 0, clean = 0, errCount = 0;

for (const file of files) {
  const name = file.replace(/\.m3f$/i, '');
  const hex = extractCode(path.join(DIR, file));
  if (!hex || hex.length < 8) { noCode++; continue; }
  const bytes = new Uint8Array(hex.match(/../g).map((x) => parseInt(x, 16)));
  let res;
  try { res = await decompileFormula(bytes); } catch { errCount++; records.push({ name, cats: new Set(['error']) }); continue; }
  if (!res.unhandled.length) { clean++; continue; }
  const cats = new Set();
  for (const u of res.unhandled) {
    const op = (u.match(/UNHANDLED (\S+)/) || [])[1];
    if (!op) continue;
    const c = classify(op);
    cats.add(c.startsWith('other:') ? 'other-x87' : c);
    if (c.startsWith('other:')) otherOps.set(op, (otherOps.get(op) || 0) + 1);
  }
  records.push({ name, cats });
}

// blocking-SET histogram
const setKey = (s) => [...s].sort().join(' + ');
const setHist = new Map();
for (const r of records) { const k = setKey(r.cats); setHist.set(k, (setHist.get(k) || 0) + 1); }

// single-capability ROI: formulas blocked by EXACTLY one category
const single = (cat) => records.filter((r) => r.cats.size === 1 && r.cats.has(cat));
// any-capability: formulas where this category appears
const involves = (cat) => records.filter((r) => r.cats.has(cat));

console.log(`\n=== blocking-reason triage (${files.length} .m3f) ===`);
console.log(`clean-decompile (no unhandled): ${clean}   no-code: ${noCode}   error: ${errCount}`);
console.log(`unhandled formulas: ${records.length}`);

console.log(`\n--- ROI: unlock if we add ONE capability (blocking set == {cap}) ---`);
for (const cat of ['control-flow', 'sse2', 'complex-mem', 'other-x87']) {
  const s = single(cat);
  console.log(`  ${cat.padEnd(13)} alone unlocks ${String(s.length).padStart(3)}   (appears in ${involves(cat).length} total)`);
}

console.log(`\n--- exact blocking-set histogram (top 16) ---`);
[...setHist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}  ${k}`));

console.log(`\n--- control-flow-ALONE examples (prime targets) ---`);
console.log('  ' + single('control-flow').slice(0, 30).map((r) => r.name).join(', '));

console.log(`\n--- other-x87 opcode histogram (cheap wins, no new machinery) ---`);
[...otherOps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([op, n]) => console.log(`  ${op}: ${n}`));

console.log(`\n--- sse2-ALONE examples ---`);
console.log('  ' + single('sse2').slice(0, 20).map((r) => r.name).join(', '));
