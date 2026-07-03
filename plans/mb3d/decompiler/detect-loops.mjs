// Classify the genuine loop idioms across the corpus:
//   POWSQ  — exponentiation-by-squaring helper (shr reg,1 / fmul st(0) / back jne)
//   COUNT  — counted loop (dec reg; jnz back) or (mov reg,N; ...; dec; jnz)
//   OTHER  — backward jump that's neither (block-reorder goto / irreducible)
import fs from 'node:fs';
import path from 'node:path';
import { Capstone, Const, loadCapstone } from 'capstone-wasm';

const DIR = 'h:/tmp/mb3d-src/M3Formulas';
function extractCode(f) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let on = 0, h = '';
  for (const l of L) { if (l.trim() === '[CODE]') { on = 1; continue; } if (on && l.startsWith('[')) break; if (on) h += l.trim(); }
  return h;
}
await loadCapstone();
const cs = new Capstone(Const.CS_ARCH_X86, Const.CS_MODE_32);
const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.m3f')).sort();

// pow-by-squaring helper mnemonic template (allowing nops/filler is unnecessary: it's contiguous)
function findPowSq(ins) {
  for (let i = 0; i + 5 < ins.length; i++) {
    // shr <gpreg>,1 ; je ; jae ; (fld st(0)|fld1)
    if (ins[i].m === 'shr' && /^e(ax|bx|cx|dx|si|di), ?1$/.test(ins[i].o) && ins[i + 1]?.m === 'je') {
      // look ahead for fmul st(0) and a backward jne within ~14 insns
      let hasSquare = false, hasBackJne = false;
      for (let k = i + 2; k < Math.min(ins.length, i + 16); k++) {
        if (ins[k].m === 'fmul' && /st\(0\)/.test(ins[k].o)) hasSquare = true;
        if ((ins[k].m === 'jne' || ins[k].m === 'jae') && parseInt(ins[k].o, 16) < ins[k].a) hasBackJne = true;
      }
      if (hasSquare && hasBackJne) return ins[i].a;
    }
  }
  return -1;
}
function findCounted(ins) {
  const out = [];
  for (let i = 0; i + 1 < ins.length; i++) {
    if (ins[i].m === 'dec' && /^e(ax|bx|cx|dx|si|di)$/.test(ins[i].o) && (ins[i + 1].m === 'jnz' || ins[i + 1].m === 'jne')) {
      const t = parseInt(ins[i + 1].o, 16);
      if (t < ins[i + 1].a) out.push({ at: ins[i + 1].a, target: t, reg: ins[i].o });
    }
  }
  return out;
}

let nPow = 0, nCount = 0, nOther = 0;
const powList = [], countList = [], otherList = [];
for (const file of files) {
  const hex = extractCode(path.join(DIR, file));
  if (!hex || hex.length < 8) continue;
  const bytes = new Uint8Array(hex.match(/../g).map((x) => parseInt(x, 16)));
  let ins;
  try { ins = cs.disasm(bytes, 0).map((i) => ({ m: i.mnemonic, o: (i.opStr ?? '').trim(), a: i.address })); } catch { continue; }
  const addrSet = new Set(ins.map((i) => i.a));
  const backs = ins.filter((i) => /^j/.test(i.m) && addrSet.has(parseInt(i.o, 16)) && parseInt(i.o, 16) < i.a);
  if (!backs.length) continue;
  const sse = ins.some((i) => /sd$|pd$/.test(i.m) || /xmm/.test(i.o));
  const pow = findPowSq(ins);
  const counted = findCounted(ins);
  const name = file.replace('.m3f', '');
  // does pow/counted account for ALL the back-edges?
  const powAddrs = new Set();
  if (pow >= 0) { for (const b of backs) if (b.a >= pow && b.a < pow + 0x30) powAddrs.add(b.a); }
  const countAddrs = new Set(counted.map((c) => c.at));
  const accounted = new Set([...powAddrs, ...countAddrs]);
  const unaccounted = backs.filter((b) => !accounted.has(b.a));
  const tag = `${sse ? 'SSE ' : ''}back=${backs.length}`;
  if (pow >= 0 && !unaccounted.length) { nPow++; powList.push(`${name.padEnd(24)} ${tag} POW@${pow.toString(16)}`); }
  else if (counted.length && !unaccounted.length) { nCount++; countList.push(`${name.padEnd(24)} ${tag} COUNT x${counted.length}`); }
  else { nOther++; otherList.push(`${name.padEnd(24)} ${tag}${pow >= 0 ? ' has-pow' : ''}${counted.length ? ' has-count' : ''} unacct=${unaccounted.map((b) => b.m + '@' + b.a.toString(16)).join(',')}`); }
}
console.log(`POW-only: ${nPow}\n` + powList.map((l) => '  ' + l).join('\n'));
console.log(`\nCOUNT-only: ${nCount}\n` + countList.map((l) => '  ' + l).join('\n'));
console.log(`\nOTHER (block-reorder / mixed): ${nOther}\n` + otherList.map((l) => '  ' + l).join('\n'));
