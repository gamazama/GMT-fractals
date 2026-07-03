// diag.mjs <Name...> — per-formula blocker diagnostic:
//   preamble? backward jumps? decompiler UNHANDLED lines? first 6 insns.
import fs from 'node:fs';
import path from 'node:path';
import { Capstone, Const, loadCapstone } from 'capstone-wasm';
import { decompileFormula } from './decompile.mjs';

const DIR = 'h:/tmp/mb3d-src/M3Formulas';
function extractCode(f) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let on = 0, h = '';
  for (const l of L) { if (l.trim() === '[CODE]') { on = 1; continue; } if (on && l.startsWith('[')) break; if (on) h += l.trim(); }
  return h;
}
await loadCapstone();
const cs = new Capstone(Const.CS_ARCH_X86, Const.CS_MODE_32);
const names = process.argv.slice(2);
for (const name of names) {
  const file = path.join(DIR, name + '.m3f');
  if (!fs.existsSync(file)) { console.log(`${name}: NO FILE`); continue; }
  const hex = extractCode(file);
  if (!hex) { console.log(`${name}: NO CODE`); continue; }
  const bytes = new Uint8Array(hex.match(/../g).map((x) => parseInt(x, 16)));
  const ins = cs.disasm(bytes, 0).map((i) => ({ m: i.mnemonic, o: (i.opStr ?? '').trim(), a: i.address }));
  const addrSet = new Set(ins.map((i) => i.a));
  const preamble = ins.slice(0, 8).some((i) => i.m === 'mov' && /\[ebp \+ (?:0x)?8\]/.test(i.o));
  const backs = ins.filter((i) => /^j/.test(i.m) && addrSet.has(parseInt(i.o, 16)) && parseInt(i.o, 16) < i.a)
    .map((i) => `${i.m}@${i.a.toString(16)}->${parseInt(i.o, 16).toString(16)}`);
  const sse = ins.some((i) => /sd$|pd$/.test(i.m) || /xmm/.test(i.o));
  let unh = [];
  try { const r = await decompileFormula(bytes); unh = r.unhandled.map((u) => u.trim()); } catch (e) { unh = ['THREW ' + e.message]; }
  console.log(`\n=== ${name} (${ins.length} insns) preamble=${preamble} sse=${sse} backs=[${backs.join(', ')}] ===`);
  console.log('  first insns: ' + ins.slice(0, 6).map((i) => `${i.m} ${i.o}`).join(' | '));
  console.log('  UNHANDLED(' + unh.length + '): ' + unh.slice(0, 12).join(' ; '));
}
