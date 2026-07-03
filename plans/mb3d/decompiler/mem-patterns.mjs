// Collect the exact UNHANDLED memory-operand forms + unhandled-opcode operand
// forms across the whole corpus, normalized (hex offsets → N), so we know
// precisely which addressing modes / instruction shapes to implement next.
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
const norm = (s) => s
  .replace(/0x[0-9a-f]+/g, 'N').replace(/\b\d+\b/g, 'N')
  .replace(/\s+/g, ' ').trim();

const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.m3f')).sort();
const memForms = new Map();   // normalized mem operand → count
const opForms = new Map();    // normalized "op operand" (non-mem unhandled) → count
const memByFormula = new Map(); // form → set of formulas
for (const file of files) {
  const name = file.replace(/\.m3f$/i, '');
  const hex = extractCode(path.join(DIR, file));
  if (!hex || hex.length < 8) continue;
  const bytes = new Uint8Array(hex.match(/../g).map((x) => parseInt(x, 16)));
  let res; try { res = await decompileFormula(bytes); } catch { continue; }
  for (const u of res.unhandled) {
    const m = u.match(/\/\/ UNHANDLED mem (.*)$/);
    if (m) {
      const f = norm(m[1]);
      memForms.set(f, (memForms.get(f) || 0) + 1);
      (memByFormula.get(f) ?? memByFormula.set(f, new Set()).get(f)).add(name);
      continue;
    }
    const o = u.match(/\/\/ UNHANDLED (\S+) ?(.*)$/);
    if (o) { const f = o[1] + ' ' + norm(o[2] || ''); opForms.set(f.trim(), (opForms.get(f.trim()) || 0) + 1); }
  }
}

console.log('=== UNHANDLED memory-operand forms (normalized: N = any offset/number) ===');
[...memForms.entries()].sort((a, b) => b[1] - a[1]).forEach(([f, n]) => {
  const fm = [...(memByFormula.get(f) ?? [])].slice(0, 4).join(',');
  console.log(`  ${String(n).padStart(5)}  ${f.padEnd(34)} e.g. ${fm}`);
});
console.log('\n=== UNHANDLED non-mem opcode forms (op + normalized operand) ===');
[...opForms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).forEach(([f, n]) => console.log(`  ${String(n).padStart(5)}  ${f}`));
