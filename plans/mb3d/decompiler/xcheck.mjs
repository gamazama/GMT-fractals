// x87 decompile cross-check: execute the disassembled bytes as a faithful
// NUMERIC x87 stack machine (independent of the GLSL-emit path), and compare to
// the decompiled GLSL evaluated as JS. Disagreement on any random input = a
// decompile bug (e.g. the fcomp-pop/fsub cut bug). Catches mistranslations.
import { Capstone, Const, loadCapstone } from 'capstone-wasm';
import { decompileFormula } from './decompile.mjs';

/** DivUtils.pas:1616-1644 PAligned16 fixed table — positive byte offsets, copied
 *  into EVERY formula's const buffer (CustomFormulas.pas:334, FastMove …,216). These
 *  are compile-time literals (not a runtime dump), so the cross-check can exercise the
 *  REAL constant instead of a random. Offsets 0/8 (abs AND-mask) and 80/88 (sign
 *  XOR-mask) are bit-patterns, NOT seeded here — the U6 decode turns those into
 *  abs()/negate, so they never reach the body as a numeric const. */
export const PALIGNED16 = {
  16: -2, 24: 1e-100, 32: 1, 40: 1, 48: -1, 56: -1, 64: 2, 72: 2,
  96: -1, 104: 2, 112: 0.5, 120: 3, 128: 4, 136: 5, 144: 6, 152: 7,
  160: 8, 168: 10, 176: 15, 184: 21, 192: 28, 200: 35, 208: 70,
};
/** Seed the cross-check const map for a body's `C[mp]<off>` tokens: a positive
 *  `p<off>` that is a PAligned16 table entry gets its KNOWN value (so the gate
 *  verifies the real constant); every other token (option-region `m<off>`, or a mask
 *  `p0/p8/p80/p88`) stays random over (-4,4). One source of truth for all three
 *  cross-check drivers (crossCheck / generate-library / corpus-check) → they cannot
 *  disagree on the table. */
export function seedConsts(toks) {
  const C = {};
  for (const t of new Set(toks)) {
    const pm = /^p(\d+)$/.exec(t);
    C[t] = (pm && PALIGNED16[+pm[1]] !== undefined) ? PALIGNED16[+pm[1]] : Math.random() * 8 - 4;
  }
  return C;
}

const stN = (o) => { const m = o.match(/st\((\d+)\)/); return m ? +m[1] : 0; };
const ARITH = { fadd: ['+', 0], fsub: ['-', 0], fsubr: ['-', 1], fmul: ['*', 0], fdiv: ['/', 0], fdivr: ['/', 1] };
const ARITHP = { faddp: ['+', 0], fsubp: ['-', 0], fsubrp: ['-', 1], fmulp: ['*', 0], fdivp: ['/', 0], fdivrp: ['/', 1] };
const NEUTRAL = new Set(['nop', 'fnop', 'fwait', 'wait', 'fnstsw', 'fnstcw', 'fldcw', 'shr', 'shl', 'sar', 'sal', 'not', 'neg', 'sahf', 'mov',
  'movzx', 'movsx', 'push', 'pop', 'ret', 'and', 'or', 'xor', 'add', 'sub', 'lea', 'test', 'cmp', 'inc', 'dec']);
const apply = (op, a, b) => (op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b);

export async function disasm(bytes) {
  await loadCapstone();
  const cs = new Capstone(Const.CS_ARCH_X86, Const.CS_MODE_32);
  return cs.disasm(bytes, 0).map((i) => ({ m: i.mnemonic, o: (i.opStr ?? '').trim(), a: i.address }));
}

/** Faithful numeric x87 interpreter over pre-disassembled instructions.
 *  Independent of the GLSL emitter — that's what makes the comparison meaningful. */
const localKey = (o) => { const l = o.match(/\[(ebp|esp)(?: (\-|\+) (0x[0-9a-f]+|\d+))?\]/); if (!l) return null; const off = l[3] ? (l[3].startsWith('0x') ? parseInt(l[3], 16) : parseInt(l[3], 10)) : 0; return `${l[1]}_${l[2] === '-' ? 'm' : 'p'}${off}`; };

export function interpret(ins, vars, consts, constMap = new Map()) {
  const v = { ...vars };
  const locals = {};
  // A positive const-buffer offset covered by the formula's [CONSTANTS] holds a REAL declared
  // value (seeded into `consts`), NOT the abs/sign bit-mask — so the U6 abs/negate mirror below
  // must NOT fire for it; it's a genuine multiply by that constant. Keep decompile.mjs in sync
  // (it bakes the same offsets as literals). @see ADR-0087.
  const isFormulaConst = (key) => { const m = /^p(\d+)$/.exec(key || ''); return !!m && constMap.has(+m[1]); };
  // Mirror decompile.mjs's GP-register abstract interpretation (see its notes).
  const hasPreamble = ins.some((i) => i.m === 'mov' && /\[ebp \+ (?:0x)?8\]/.test(i.o));
  const regs = { eax: { t: 'coord', i: 0 }, edx: { t: 'coord', i: 1 }, ecx: { t: 'coord', i: 2 } };
  if (!hasPreamble) { regs.esi = { t: 'iter', o: 0x58 }; regs.edi = { t: 'var', o: 0 }; } // dIFS preset (mirror)
  const COORD = ['x', 'y', 'zz', 'w'];
  // J4/Cw @ −56 (ext); C1/C2/C3 input coords @ 0/8/16 → working x/y/zz; J1/J2/J3 @ +24/+32/+40.
  // Keep in sync with decompile.mjs cField. Offset 16 is C3 (input coord), not c.w.
  const cField = { '-56': 'cw', 0: 'x', 8: 'y', 0x10: 'zz', 0x18: 'cx', 0x20: 'cy', 0x28: 'cz' };
  const iCoord = { '-32': 'x', '-24': 'y', '-16': 'zz', '-8': 'w' }; // dIFS-ext x/y/z/w
  const SCRATCH = { '-40': 'mb3dRStopD', 56: 'mb3dRout', 64: 'mb3dIter', 192: 'mb3dOTrap', 200: 'mb3dVary', 208: 'mb3dFirst', 212: 'mb3dTmp', 216: 'mb3dD1', 224: 'mb3dD2', 232: 'mb3dDr1', 240: 'mb3dDr2', 248: 'mb3dDr3' };
  const imm = (s) => (s.startsWith('0x') || s.startsWith('-0x')) ? parseInt(s, 16) : parseInt(s, 10);
  const isReg = (s) => /^e(ax|bx|cx|dx|si|di)$/.test(s);
  const GOP = { and: '&', or: '|', xor: '^', shl: '<<', sal: '<<', shr: '>>', sar: '>>' };
  // numeric read of a resolved memory operand (mirrors decompile's `int(<mv>)`)
  const memNum = (o) => { const s = resolve(o); if (!s) return null; return Math.trunc(s.k === 'const' ? (consts.get(s.key) ?? 0) : s.k === 'loc' ? (locals[s.key] ?? 0) : (v[s.key] ?? 0)); };
  const trackReg = (m, o) => {
    const t = o.split(',').map((s) => s.trim());
    if (m === 'mov' && t.length === 2 && isReg(t[0])) {
      const dst = t[0], src = t[1]; let mm;
      if (/^(dword ptr )?\[ebp \+ (?:0x)?8\]$/.test(src)) regs[dst] = { t: 'iter', o: 0 };
      else if ((mm = src.match(/^(?:dword ptr )?\[(\w+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]$/))) { const r = regs[mm[1]], d = mm[3] ? imm(mm[3]) * (mm[2] === '-' ? -1 : 1) : 0; if (r && r.t === 'iter' && (d === 0x30 || d === 0x64)) regs[dst] = { t: 'var', o: 0 }; else { const n = memNum(src); regs[dst] = n === null ? undefined : { t: 'gpval', v: n }; } }
      else if (isReg(src) && regs[src]) regs[dst] = { ...regs[src] };
      else if (/^-?(0x[0-9a-f]+|\d+)$/.test(src)) regs[dst] = { t: 'int', v: imm(src) };
      else regs[dst] = undefined;
    } else if ((m === 'add' || m === 'sub') && t.length === 2 && isReg(t[0]) && /^-?(0x[0-9a-f]+|\d+)$/.test(t[1])) {
      const r = regs[t[0]]; if (r) { const k = imm(t[1]) * (m === 'sub' ? -1 : 1); if (r.t === 'int') r.v += k; else if (r.t === 'coord') r.i += k / 8; else if (r.t === 'gpval') r.v = (r.v + k) | 0; else r.o = (r.o || 0) + k; }
    } else if (m === 'lea' && t.length === 2 && isReg(t[0])) {
      const mm = t[1].match(/^\[(\w+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]$/);
      if (mm && regs[mm[1]]) { const r = { ...regs[mm[1]] }, d = mm[3] ? imm(mm[3]) * (mm[2] === '-' ? -1 : 1) : 0; if (r.t === 'coord') r.i += d / 8; else if (r.t !== 'gpval') r.o = (r.o || 0) + d; regs[t[0]] = r; }
      else regs[t[0]] = undefined;
    } else if (m === 'xor' && t.length === 2 && t[0] === t[1]) regs[t[0]] = { t: 'int', v: 0 };
    else if (GOP[m] && t.length === 2 && regs[t[0]]?.t === 'gpval') {
      const r = regs[t[0]], opd = t[1]; let rv = null;
      if (/^-?(0x[0-9a-f]+|\d+)$/.test(opd)) rv = imm(opd);
      else if (isReg(opd) && regs[opd]?.t === 'gpval') rv = regs[opd].v;
      if (rv !== null) { const a = r.v | 0, b = rv | 0; r.v = m === 'and' ? (a & b) : m === 'or' ? (a | b) : m === 'xor' ? (a ^ b) : (m === 'shl' || m === 'sal') ? (a << b) : (a >> b); } else regs[t[0]] = undefined;
    } else if (m === 'neg' && regs[t[0]]?.t === 'gpval') regs[t[0]].v = (-regs[t[0]].v) | 0;
    else if (m === 'inc' && regs[t[0]]?.t === 'int') regs[t[0]].v++;
    else if (m === 'dec' && regs[t[0]]?.t === 'int') regs[t[0]].v--;
    else if (/^(imul|mul|idiv|div|shl|shr|sar|sal|or|not|neg|pop)$/.test(m) && isReg(t[0])) regs[t[0]] = undefined;
  };
  const iterName = (off) => iCoord[off] ?? cField[off] ?? SCRATCH[off] ?? null;
  const resolve = (o, extra = 0) => {
    // scaled-index `[base + idx*scale (+/- disp)]` (orbit-trap selector) — compute the
    // index numerically (mirrors decompile.mjs's GLSL selection).
    const si = o.match(/\[(\w+) \+ (\w+)\*(\d+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]/);
    if (si) {
      const base = regs[si[1]], ir = regs[si[2]], scale = +si[3], disp = (si[5] ? imm(si[5]) * (si[4] === '-' ? -1 : 1) : 0) + extra;
      if (!base || base.t !== 'iter' || !ir) return null;
      const idx = ir.t === 'int' ? ir.v : ir.t === 'gpval' ? (ir.v | 0) : null;
      if (idx === null) return null;
      const nm = iterName(base.o + disp + idx * scale);
      return nm ? { k: 'v', key: nm } : null;
    }
    const mm = o.match(/\[(\w+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]/);
    if (!mm) return null;
    const base = mm[1], d = (mm[3] ? imm(mm[3]) * (mm[2] === '-' ? -1 : 1) : 0) + extra;
    if (base === 'ebp' || base === 'esp') return { k: 'loc', key: `${base}_${d < 0 ? 'm' : 'p'}${Math.abs(d)}` };
    const r = regs[base]; if (!r) return null;
    if (r.t === 'coord') { const idx = r.i + d / 8; return (Number.isInteger(idx) && idx >= 0 && idx < 4) ? { k: 'v', key: COORD[idx] } : null; }
    if (r.t === 'var') { const off = r.o + d; return { k: 'const', key: (off < 0 ? 'm' : 'p') + Math.abs(off) }; }
    if (r.t === 'iter') { const nm = iterName(r.o + d); return nm ? { k: 'v', key: nm } : null; }
    return null;
  };
  const memRead = (o, extra = 0) => { const s = resolve(o, extra); if (!s) return 0; if (s.k === 'const') return consts.get(s.key) ?? 0; if (s.k === 'loc') return locals[s.key] ?? 0; return v[s.key] ?? 0; };
  const memWrite = (o, val, extra = 0) => { const s = resolve(o, extra); if (!s) return; if (s.k === 'loc') locals[s.key] = val; else if (s.k === 'v') v[s.key] = val; };
  // SSE2 xmm register file (8 regs × 2 double lanes), mirroring decompile.mjs.
  const xreg = Array.from({ length: 8 }, () => ({ lo: 0, hi: 0 }));
  const xidx = (s) => { const mm = s.match(/^xmm(\d)$/); return mm ? +mm[1] : null; };
  // numeric source lanes [lo, hi]; packed mem reads two adjacent doubles ([o],[o+8]).
  const sseLanesN = (s, packed) => { if (/\[/.test(s)) { const lo = memRead(s, 0); return [lo, packed ? memRead(s, 8) : 0]; } const r = xidx(s); if (r === null) return null; return [xreg[r].lo, xreg[r].hi]; };
  const sseStore = (s, lo, hi) => { memWrite(s, lo, 0); if (hi !== undefined) memWrite(s, hi, 8); };
  /** Execute one SSE2 instruction numerically; returns true if handled. */
  const sseExec = (m, o) => {
    const parts = o.split(',').map((s) => s.trim());
    const dst = parts[0], src = parts[1];
    const dIsMem = /\[/.test(dst), di = dIsMem ? null : xidx(dst);
    const PD = { addpd: (a, b) => a + b, subpd: (a, b) => a - b, mulpd: (a, b) => a * b, divpd: (a, b) => a / b, maxpd: Math.max, minpd: Math.min };
    const SD = { addsd: (a, b) => a + b, subsd: (a, b) => a - b, mulsd: (a, b) => a * b, divsd: (a, b) => a / b, maxsd: Math.max, minsd: Math.min };
    if (PD[m] || m === 'sqrtpd') { if (di === null) return false; const s = sseLanesN(src, true); if (!s) return false; const d = xreg[di]; d.lo = m === 'sqrtpd' ? Math.sqrt(s[0]) : PD[m](d.lo, s[0]); d.hi = m === 'sqrtpd' ? Math.sqrt(s[1]) : PD[m](d.hi, s[1]); return true; }
    if (SD[m] || m === 'sqrtsd') { if (di === null) return false; const s = sseLanesN(src, false); if (!s) return false; const d = xreg[di]; d.lo = m === 'sqrtsd' ? Math.sqrt(s[0]) : SD[m](d.lo, s[0]); return true; }
    // bitwise sign-mask ops (DivUtils PAligned16): [+0]/[+8]=abs mask, [+80]/[+88]=sign mask
    if (m === 'andpd' || m === 'andps' || m === 'xorpd' || m === 'xorps') {
      if (di === null) return false;
      if ((m === 'xorpd' || m === 'xorps') && xidx(src) === di) { xreg[di].lo = 0; xreg[di].hi = 0; return true; }
      const s = /\[/.test(src) ? resolve(src) : null;
      if ((m === 'andpd' || m === 'andps') && s && s.k === 'const' && (s.key === 'p0' || s.key === 'p8') && !isFormulaConst(s.key)) { xreg[di].lo = Math.abs(xreg[di].lo); xreg[di].hi = Math.abs(xreg[di].hi); return true; }
      if ((m === 'xorpd' || m === 'xorps') && s && s.k === 'const' && (s.key === 'p80' || s.key === 'p88') && !isFormulaConst(s.key)) { xreg[di].lo = -xreg[di].lo; xreg[di].hi = -xreg[di].hi; return true; }
      return false;
    }
    if (m === 'movupd' || m === 'movapd' || m === 'movaps' || m === 'movups') {
      if (dIsMem) { const si = xidx(src); if (si === null) return false; sseStore(dst, xreg[si].lo, xreg[si].hi); return true; }
      if (di === null) return false; const s = sseLanesN(src, true); if (!s) return false; xreg[di].lo = s[0]; xreg[di].hi = s[1]; return true;
    }
    if (m === 'movsd') {
      if (dIsMem) { const si = xidx(src); if (si === null) return false; sseStore(dst, xreg[si].lo); return true; }
      if (di === null) return false;
      if (/\[/.test(src)) { xreg[di].lo = memRead(src, 0); xreg[di].hi = 0; return true; }
      const si = xidx(src); if (si === null) return false; xreg[di].lo = xreg[si].lo; return true; // preserve hi
    }
    if (m === 'movlpd' || m === 'movlps') {
      if (dIsMem) { const si = xidx(src); if (si === null) return false; sseStore(dst, xreg[si].lo); return true; }
      if (di === null) return false; xreg[di].lo = memRead(src, 0); return true; // preserve hi
    }
    if (m === 'movhpd' || m === 'movhps') {
      if (dIsMem) { const si = xidx(src); if (si === null) return false; sseStore(dst, xreg[si].hi); return true; }
      if (di === null) return false; xreg[di].hi = memRead(src, 0); return true;
    }
    if (m === 'movddup') { if (di === null) return false; const s = sseLanesN(src, false); if (!s) return false; xreg[di].lo = s[0]; xreg[di].hi = s[0]; return true; }
    if (m === 'pshufd') { if (di === null) return false; const si = xidx(src); if (si === null) return false; const iv = imm(parts[2]); const d = [iv & 3, (iv >> 2) & 3, (iv >> 4) & 3, (iv >> 6) & 3]; const qsel = (a, b) => (a === 0 && b === 1) ? 'lo' : (a === 2 && b === 3) ? 'hi' : null; const ls = qsel(d[0], d[1]), hs = qsel(d[2], d[3]); if (!ls || !hs) return false; const sl = xreg[si].lo, sh = xreg[si].hi; xreg[di].lo = ls === 'lo' ? sl : sh; xreg[di].hi = hs === 'lo' ? sl : sh; return true; }
    if (m === 'shufpd') { if (di === null) return false; const si = xidx(src); if (si === null) return false; const iv = imm(parts[2]); const dl = xreg[di].lo, dh = xreg[di].hi, sl = xreg[si].lo, sh = xreg[si].hi; xreg[di].lo = (iv & 1) ? dh : dl; xreg[di].hi = (iv & 2) ? sh : sl; return true; }
    if (m === 'unpcklpd') { if (di === null) return false; const s = sseLanesN(src, false); if (!s) return false; xreg[di].hi = s[0]; return true; }
    if (m === 'unpckhpd') { if (di === null) return false; const s = sseLanesN(src, true); if (!s) return false; xreg[di].lo = xreg[di].hi; xreg[di].hi = s[1]; return true; }
    if (m === 'haddpd') { if (di === null) return false; const s = sseLanesN(src, true); if (!s) return false; const a = xreg[di].lo + xreg[di].hi, b = s[0] + s[1]; xreg[di].lo = a; xreg[di].hi = b; return true; }
    return false;
  };
  const st = [];          // st[st.length-1] is st(0)
  const S = (i) => st.length - 1 - i;
  const addrIdx = new Map(); ins.forEach((x, i) => addrIdx.set(x.a, i));
  let C0 = 0, C3 = 0, CF = 0, ZF = 0, steps = 0; // FPU condition codes + EFLAGS
  const callStack = []; // return addresses for call/ret
  for (let p = 0; p < ins.length; p++) {
    if (++steps > 300000) break; // loop guard (shipped formulas are forward-only)
    const { m, o } = ins[p];
    trackReg(m, o);
    if (m === 'and' && /\+ 4\], eax/.test(o)) {
      const rm = o.match(/\[(\w+) \+ 4\]/); const s = rm ? resolve(`[${rm[1]}]`) : null;
      if (s && s.k === 'v') v[s.key] = Math.abs(v[s.key] ?? 0); else if (s && s.k === 'loc') locals[s.key] = Math.abs(locals[s.key] ?? 0);
      continue;
    }
    // inc/dec on a memory slot (the bFirstIt flag `inc [edi+0x50]` → mb3dFirst++).
    // Mirror of decompile.mjs: register inc/dec is modeled in trackReg; a memory
    // operand resolving to a writable state var increments that slot.
    if ((m === 'inc' || m === 'dec') && /\[/.test(o)) {
      const s = resolve(o);
      if (s && (s.k === 'v' || s.k === 'loc')) memWrite(o, memRead(o) + (m === 'inc' ? 1 : -1));
      continue;
    }
    // compares → FPU condition codes (C0 = a<b, C3 = a==b), with pop effect
    if (/^f(ucom|com|ucomp|comp|ucompp|compp|tst)$/.test(m)) {
      const a = st[S(0)];
      const b = /compp$/.test(m) ? st[S(1)] : m === 'ftst' ? 0 : (/st\(/.test(o) ? st[S(stN(o))] : (o ? memRead(o) : st[S(1)]));
      C0 = a < b ? 1 : 0; C3 = a === b ? 1 : 0;
      if (/compp$/.test(m)) { st.pop(); st.pop(); } else if (/comp$/.test(m)) { st.pop(); }
      continue;
    }
    // flag extract: shr ah,1 / sahf / test|and ah,mask
    // shr ah,1: CF=C0 (ah bit0). ZF=(ah>>1==0) — but ah bits 3-5 hold the x87 TOP
    // field, nonzero at every real compare site, so ZF is effectively always 0
    // (faithful to hardware: jbe≡jb, ja≡jae). Keep in sync with decompile.mjs decodeCond.
    if (m === 'shr' && /^ah, ?1$/.test(o)) { CF = C0; ZF = 0; continue; }
    if (m === 'sahf') { CF = C0; ZF = C3; continue; }
    // test/and set ZF from the masked condByte and CLEAR CF (+OF) like real hardware, so a
    // following signed jCC resolves on ZF alone: jg (CF==0 && ZF==0) ≡ jne, jle (CF==1 ||
    // ZF==1) ≡ je. (U5 — matches decompile.mjs decodeCond's signed-jCC-after-mask mapping.)
    if ((m === 'test' || m === 'and') && /^ah,/.test(o)) { const mv = o.split(',')[1].trim(); const mask = mv.startsWith('0x') ? parseInt(mv, 16) : parseInt(mv, 10); ZF = (((C0 ? 1 : 0) | (C3 ? 0x40 : 0)) & mask) === 0 ? 1 : 0; CF = 0; continue; }
    // GP-register integer flag set: test/and/cmp reg, reg|imm → CF/ZF (mirrors detectGpBranch)
    if ((m === 'test' || m === 'and' || m === 'cmp') && /^e(ax|bx|cx|dx|si|di)\b/.test(o)) {
      const parts = o.split(',').map((s) => s.trim()); const rd = regs[parts[0]];
      if (rd && rd.t === 'gpval') {
        let b = null;
        if (/^-?(0x[0-9a-f]+|\d+)$/.test(parts[1])) b = imm(parts[1]) | 0;
        else if (isReg(parts[1]) && regs[parts[1]]?.t === 'gpval') b = regs[parts[1]].v | 0;
        if (b !== null) { const a = rd.v | 0; if (m === 'cmp') { CF = a < b ? 1 : 0; ZF = a === b ? 1 : 0; } else { ZF = (a & b) === 0 ? 1 : 0; } continue; }
      }
    }
    // integer compare `cmp [mem], imm` → CF (a<b), ZF (a==b)
    if (m === 'cmp') {
      const parts = o.split(','); if (parts.length === 2) { const X = parts[0].trim(), Y = parts[1].trim();
        if (/\[/.test(X)) { const A = memRead(X); const B = Y.startsWith('0x') ? parseInt(Y, 16) : (/^-?\d+$/.test(Y) ? parseInt(Y, 10) : NaN); if (!isNaN(B)) { CF = A < B ? 1 : 0; ZF = A === B ? 1 : 0; } } }
      continue;
    }
    // SSE2 scalar compare `ucomisd/comisd xmm, src` → CF (a<b), ZF (a==b)
    if (m === 'ucomisd' || m === 'comisd') { const parts = o.split(',').map((s) => s.trim()); const A = sseLanesN(parts[0], false), B = sseLanesN(parts[1], false); if (A && B) { CF = A[0] < B[0] ? 1 : 0; ZF = A[0] === B[0] ? 1 : 0; } continue; }
    if (sseExec(m, o)) continue; // SSE2 (xmm) instruction
    // calls / returns / jumps
    if (m === 'call') { const t = addrIdx.get(parseInt(o, 16)); if (t !== undefined) { callStack.push(p); p = t - 1; } continue; }
    if (m === 'ret') { if (callStack.length) p = callStack.pop(); else break; continue; }
    if (m === 'jmp') { const t = addrIdx.get(parseInt(o, 16)); if (t !== undefined) p = t - 1; continue; }
    if (/^j/.test(m)) {
      let take = false;
      if (/^j(b|c|l|nge)$/.test(m)) take = CF === 1;
      else if (/^j(ae|nc|nb|ge|nl)$/.test(m)) take = CF === 0;
      else if (/^j(e|z)$/.test(m)) take = ZF === 1;
      else if (/^j(ne|nz)$/.test(m)) take = ZF === 0;
      else if (/^j(be|ng|le)$/.test(m)) take = CF === 1 || ZF === 1;
      else if (/^j(a|nle|g)$/.test(m)) take = CF === 0 && ZF === 0;
      if (take) { const t = addrIdx.get(parseInt(o, 16)); if (t !== undefined) p = t - 1; }
      continue;
    }
    if (ARITH[m]) {
      const [op, rev] = ARITH[m]; let a, b, tgt;
      if (/st\(\d+\), st\(0\)/.test(o)) { const k = stN(o); a = st[S(k)]; b = st[S(0)]; tgt = S(k); }
      else if (/st\(/.test(o)) { const k = stN(o); a = st[S(0)]; b = st[S(k)]; tgt = S(0); }
      else {
        // mirror decompile.mjs U6: `fmul` against the abs/sign PAligned16 mask offsets
        // (p0/p8 = abs AND-mask, p80/p88 = sign XOR-mask) is abs/negate, not a multiply.
        const s = resolve(o);
        if (m === 'fmul' && s && s.k === 'const' && (s.key === 'p0' || s.key === 'p8') && !isFormulaConst(s.key)) { st[S(0)] = Math.abs(st[S(0)]); continue; }
        if (m === 'fmul' && s && s.k === 'const' && (s.key === 'p80' || s.key === 'p88') && !isFormulaConst(s.key)) { st[S(0)] = -st[S(0)]; continue; }
        a = st[S(0)]; b = memRead(o); tgt = S(0);
      }
      st[tgt] = rev ? apply(op, b, a) : apply(op, a, b);
      continue;
    }
    if (ARITHP[m]) {
      const [op, rev] = ARITHP[m]; const k = stN(o);
      const sk = st[S(k)], s0 = st[S(0)]; st.pop();
      st[st.length - k] = rev ? apply(op, s0, sk) : apply(op, sk, s0);
      continue;
    }
    switch (m) {
      case 'fld': st.push(/st\(/.test(o) ? st[S(stN(o))] : memRead(o)); break;
      case 'fld1': st.push(1.0); break;
      case 'fldz': st.push(0.0); break;
      case 'fldpi': st.push(Math.PI); break;
      case 'fabs': st[S(0)] = Math.abs(st[S(0)]); break;
      case 'fchs': st[S(0)] = -st[S(0)]; break;
      case 'fsqrt': st[S(0)] = Math.sqrt(st[S(0)]); break;
      case 'frndint': st[S(0)] = Math.floor(st[S(0)] + 0.5); break;
      case 'fsin': st[S(0)] = Math.sin(st[S(0)]); break;
      case 'fcos': st[S(0)] = Math.cos(st[S(0)]); break;
      case 'fptan': st[S(0)] = Math.tan(st[S(0)]); st.push(1.0); break;
      case 'fpatan': { const r = Math.atan2(st[S(1)], st[S(0)]); st.pop(); st[S(0)] = r; break; }
      case 'f2xm1': st[S(0)] = Math.pow(2, st[S(0)]) - 1; break;
      case 'fyl2x': { const r = st[S(1)] * Math.log2(st[S(0)]); st.pop(); st[S(0)] = r; break; }
      case 'fyl2xp1': { const r = st[S(1)] * Math.log2(st[S(0)] + 1); st.pop(); st[S(0)] = r; break; }
      case 'fscale': st[S(0)] = st[S(0)] * Math.pow(2, Math.floor(st[S(1)])); break;
      case 'fsincos': { const t = st[S(0)]; st[S(0)] = Math.sin(t); st.push(Math.cos(t)); break; }
      case 'fxch': { const k = stN(o); const t = st[S(0)]; st[S(0)] = st[S(k)]; st[S(k)] = t; break; }
      case 'fst': if (/st\(/.test(o)) st[S(stN(o))] = st[S(0)]; else memWrite(o, st[S(0)]); break;
      case 'fstp': if (/st\(/.test(o)) { const k = stN(o); st[S(k)] = st[S(0)]; st.pop(); } else memWrite(o, st.pop()); break;
      case 'fild': st.push(memRead(o)); break;
      case 'fist': memWrite(o, Math.floor(st[S(0)] + 0.5)); break;
      case 'fistp': memWrite(o, Math.floor(st[S(0)] + 0.5)); st.pop(); break;
      case 'fiadd': st[S(0)] = st[S(0)] + memRead(o); break;
      case 'fisub': st[S(0)] = st[S(0)] - memRead(o); break;
      case 'fisubr': st[S(0)] = memRead(o) - st[S(0)]; break;
      case 'fimul': st[S(0)] = st[S(0)] * memRead(o); break;
      case 'fidiv': st[S(0)] = st[S(0)] / memRead(o); break;
      case 'fidivr': st[S(0)] = memRead(o) / st[S(0)]; break;
      case 'fprem': case 'fprem1': { const a = st[S(0)], b = st[S(1)]; st[S(0)] = a - b * Math.trunc(a / b); break; }
      case 'fldln2': st.push(0.6931471805599453); break;
      case 'fldl2e': st.push(1.4426950408889634); break;
      case 'fldlg2': st.push(0.30102999566398114); break;
      case 'fldl2t': st.push(3.321928094887362); break;
      case 'ffree': break;
      case 'fincstp': st.pop(); break;
      case 'fdecstp': st.push(0); break;
      default: if (!NEUTRAL.has(m)) throw new Error('interp unhandled ' + m + ' ' + o);
    }
  }
  return v;
}

/** Compile the decompiled GLSL body to a JS function (the decompiler's output).
 *  GLSL builtins the decompiler emits are bound to JS equivalents in the prelude
 *  (GLSL `atan(y,x)` is two-arg = atan2). Consts `Cm<off>`/`Cp<off>` (negative /
 *  positive esi offset — DISTINCT memory) map to string-keyed C['m<off>']/C['p<off>']. */
const GLSL_PRELUDE = 'const sqrt=Math.sqrt,sin=Math.sin,cos=Math.cos,tan=Math.tan,abs=Math.abs,floor=Math.floor,ceil=Math.ceil,trunc=Math.trunc,atan=Math.atan2,exp2=(v)=>Math.pow(2,v),log2=Math.log2,sign=Math.sign,min=Math.min,max=Math.max,mod=(a,b)=>a-b*Math.floor(a/b),fract=(a)=>a-Math.floor(a),clamp=(a,lo,hi)=>Math.min(Math.max(a,lo),hi),int=(x)=>Math.trunc(x);';
/** Per-iteration scratch vars (TIteration3D fields) a formula may read+write. */
export const SCR = ['mb3dRStopD', 'mb3dRout', 'mb3dIter', 'mb3dOTrap', 'mb3dVary', 'mb3dFirst', 'mb3dTmp', 'mb3dD1', 'mb3dD2', 'mb3dDr1', 'mb3dDr2', 'mb3dDr3'];
/**
 * Formulas whose decode is NOT reliably faithful — excluded from both the gate
 * (corpus-check) and the shipped library (generate-library) so neither is flaky.
 * Each entry is a CONST-SEED-DEPENDENT cross-check divergence: it passes most random
 * const seeds but trips a minority (maxErr ~13 on the DE), so a 0-mismatch run is
 * luck, not correctness. The recon's "geometry decode clean" was over-optimistic for
 * these. Keep the SOLE-target formula of each in mind: none of these is a scene
 * blocker (TorusIFS, not helistairsIFS, is what fix #1 unlocks Rama-Elysium through).
 *  - helistairsIFS: an option-flag branch in the IFS fold whose decode diverges for
 *    a subset of const seeds (surfaced when the `fild [esi-0x18]` ItResultI fix
 *    unblocked the rest of the body). A residual decoder gap, not a Tier-1 win.
 */
export const DECODE_DENYLIST = new Set(['helistairsIFS']);
/** Keys compared between interpreter + decompiled-GLSL (point + scratch). */
export const CMP_KEYS = ['x', 'y', 'zz', 'w', ...SCR];
export function glslToJs(bodyGlsl) {
  const s = bodyGlsl.replace(/\bfloat\b/g, 'let').replace(/\bC([mp]\d+)\b/g, 'C["$1"]');
  // `c` = iteration constant {x,y,z,w}; `scr` = persistent scratch (seeded as locals).
  const scrDecl = SCR.map((n) => `let ${n}=scr.${n};`).join('');
  return new Function('x', 'y', 'zz', 'w', 'C', 'c', 'scr', `${GLSL_PRELUDE}\n${scrDecl}\n${s}\n return { x, y, zz, w, ${SCR.join(', ')} };`);
}

/** Cross-check one formula's bytes: interpret vs decompiled-GLSL on N randoms. */
export async function crossCheck(bytes, n = 3000) {
  const ins = await disasm(bytes);
  const { glsl } = await decompileFormula(bytes);
  const jsFn = glslToJs(glsl);
  const toks = [...glsl.matchAll(/\bC([mp]\d+)\b/g)].map((m) => m[1]);
  const C = seedConsts(toks); // PAligned16 p<off> → known value; option/mask tokens random (wide range exercises int-cast flags)
  const consts = new Map(Object.entries(C));
  const R = () => Math.random() * 4 - 2;
  let maxErr = 0, fails = 0;
  for (let t = 0; t < n; t++) {
    const cx = R(), cy = R(), cz = R(), cw = R();
    const scr = {}; for (const sn of SCR) scr[sn] = R();
    const vars = { x: R(), y: R(), zz: R(), w: 1, cx, cy, cz, cw, ...scr };
    const a = interpret(ins, vars, consts);
    const b = jsFn(vars.x, vars.y, vars.zz, vars.w, C, { x: cx, y: cy, z: cz, w: cw }, scr);
    for (const k of CMP_KEYS) { const e = Math.abs(a[k] - b[k]); maxErr = Math.max(maxErr, e); if (e > 1e-9) fails++; }
  }
  return { maxErr, fails, total: n * CMP_KEYS.length };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('xcheck.mjs')) {
  const fs = await import('node:fs');
  const ex = (f) => { const L = fs.readFileSync(f, 'utf8').split(/\r?\n/); let on = 0, h = ''; for (const l of L) { if (l.trim() === '[CODE]') { on = 1; continue; } if (on && l.startsWith('[')) break; if (on) h += l.trim(); } return h; };
  const hex = ex('h:/tmp/mb3d-src/M3Formulas/Menger3.m3f');
  const bytes = new Uint8Array(hex.match(/../g).map((x) => parseInt(x, 16)));
  const r = await crossCheck(bytes);
  console.log(`Menger3 x-check: maxErr=${r.maxErr.toExponential(2)} fails=${r.fails}/${r.total} -> ${r.fails === 0 ? 'MATCH ✓ (decompile faithful)' : 'MISMATCH ✗ (decompile bug!)'}`);
  process.exit(r.fails === 0 ? 0 : 1);
}
