// dis.mjs <FormulaName>  — inspect one MB3D [CODE] formula:
//   (a) annotated x87 disassembly with addresses (so branch targets are visible)
//   (b) the current decompiler's GLSL + its UNHANDLED lines
//   (c) the [OPTIONS] block (const/param names + types)
import { Capstone, Const, loadCapstone } from 'capstone-wasm';
import fs from 'node:fs';
import path from 'node:path';
import { decompileFormula } from './decompile.mjs';

const DIR = 'h:/tmp/mb3d-src/M3Formulas';
const name = process.argv[2];
if (!name) { console.error('usage: node dis.mjs <FormulaName>'); process.exit(1); }
const file = path.join(DIR, name + '.m3f');
const txt = fs.readFileSync(file, 'utf8');
const L = txt.split(/\r?\n/);
let on = 0, hex = '', opts = [];
let sect = '';
for (const l of L) {
  const t = l.trim();
  if (t.startsWith('[')) { sect = t; if (t === '[CODE]') on = 1; else on = 0; continue; }
  if (on) hex += t;
  if (sect === '[OPTIONS]' && t.startsWith('.')) opts.push(t);
}
const bytes = new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

await loadCapstone();
const cs = new Capstone(Const.CS_ARCH_X86, Const.CS_MODE_32);
const insns = cs.disasm(bytes, 0);

console.log(`=== ${name}  (${bytes.length} bytes, ${insns.length} insns) ===`);
console.log('--- [OPTIONS] ---');
for (const o of opts) console.log('  ' + o);
console.log('--- disassembly ---');
for (const i of insns) {
  console.log(('000' + i.address.toString(16)).slice(-4), (i.mnemonic + '         ').slice(0, 9), i.opStr ?? '');
}
const { glsl, unhandled } = await decompileFormula(bytes);
console.log('--- decompiler UNHANDLED (' + unhandled.length + ') ---');
for (const u of unhandled) console.log('  ' + u.trim());
console.log('--- decompiler GLSL ---');
console.log(glsl);
