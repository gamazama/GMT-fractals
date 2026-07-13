// x87 [CODE] -> GLSL decompiler for MB3D formulas (importable).
// Models the FPU stack as mutable vars f0..f7 (one statement per instruction);
// data-dependent compare/swap branches become GLSL `if`s. Pure-arithmetic +
// transcendental opcodes are covered; control flow (jmp/loops) + SSE2 + local
// stack memory remain UNHANDLED (flagged, not silently mistranslated).
import { Capstone, Const, loadCapstone } from 'capstone-wasm';

const stN = (o) => { const m = o.match(/st\((\d+)\)/); return m ? +m[1] : 0; };
const ARITH = { fadd: ['+', 0], fsub: ['-', 0], fsubr: ['-', 1], fmul: ['*', 0], fdiv: ['/', 0], fdivr: ['/', 1] };
const ARITHP = { faddp: ['+', 0], fsubp: ['-', 0], fsubrp: ['-', 1], fmulp: ['*', 0], fdivp: ['/', 0], fdivrp: ['/', 1] };
const NEUTRAL = new Set(['nop', 'fnop', 'fwait', 'wait', 'fnstsw', 'fnstcw', 'fldcw', 'shr', 'shl', 'sar', 'sal', 'not', 'neg', 'sahf', 'mov',
  'movzx', 'movsx', 'push', 'pop', 'ret', 'and', 'or', 'xor', 'add', 'sub', 'lea', 'test', 'cmp', 'inc', 'dec']);

export async function decompileFormula(bytes, opts = {}) {
  await loadCapstone();
  const cs = new Capstone(Const.CS_ARCH_X86, Const.CS_MODE_32);
  const ins = cs.disasm(bytes, 0).map((i) => ({ m: i.mnemonic, o: (i.opStr ?? '').trim(), a: i.address }));

  // Formula `[CONSTANTS]` (CustomFormulas.pas:886) — declared doubles/singles written from
  // pConstPointer16 (= Cp0) upward, OVERWRITING the PAligned16 defaults at those offsets. So a
  // positive const-buffer read at one of these offsets is the formula's OWN constant (e.g.
  // PolyFold-symIFS's 1/2π at Cp0, 2π at Cp8), NOT the abs/sign bit-mask the U6 decode assumes.
  // Bake those as GLSL literals here so the U6 `fmul Cp0/Cp8 → abs()` path is bypassed and the
  // real value is used. Offsets NOT covered keep the mask/PAligned16 behaviour. @see ADR-0087.
  const constMap = opts.constants instanceof Map ? opts.constants : new Map();
  const fLit = (val) => { if (!isFinite(val)) return '0.0'; if (Number.isInteger(val)) return val.toFixed(1); return String(val); };

  // dIFS sub-formula convention: the hybrid caller presets esi/edi (no
  // `mov <reg>,[ebp+8]` preamble at all). Per TIteration3Dext, esi = struct+88
  // (so x/y/z/w sit at [esi-0x78/-0x70/-0x68/-0x60] = struct -32..-8, VaryScale
  // at [esi+0x70]) and edi = PVar (const buffer). Seed the model so esi/edi
  // resolve before their first use; a real `[ebp+8]` load (standard formulas)
  // overrides this.
  const hasPreamble = ins.some((i) => i.m === 'mov' && /\[ebp \+ (?:0x)?8\]/.test(i.o));

  const locals = new Set();
  const scratch = new Set();
  // GP-register abstract interpretation (Delphi reg convention:
  // procedure(var x,y,z,w; PIteration3D)). Each GP register holds a tagged value:
  //   {t:'coord', i}  pointer to x/y/z/w (i=0..3; coords are adjacent doubles)
  //   {t:'iter',  o}  pointer to PIteration3D + o bytes
  //   {t:'var',   o}  pointer to the const buffer (PVar = [PIter+0x30]) + o bytes
  //   {t:'int',   v}  integer value (loop counters / masks)
  //   undefined       unknown
  // Subsumes the old fixed piterReg/pvarReg AND resolves pointer arithmetic
  // (`add edi,0x80` to reach the per-iteration SCRATCH region — TIteration3D
  // fields VaryScale@+200, bFirstIt@+208, bTmp@+212, Dfree1@+216, Dfree2@+224).
  const regs = { eax: { t: 'coord', i: 0 }, edx: { t: 'coord', i: 1 }, ecx: { t: 'coord', i: 2 } };
  if (!hasPreamble) { regs.esi = { t: 'iter', o: 0x58 }; regs.edi = { t: 'var', o: 0 }; } // dIFS preset (see above)
  const COORD = ['x', 'y', 'zz', 'w'];
  // J1/J2/J3 = the C (Julia) constant @ +24/+32/+40; J4/Cw @ −56 (ext extension,
  // Aexion1). C1/C2/C3 = the pre-4D-rotation INPUT coords @ 0/8/16 (TIteration3Dext)
  // — bound to the working z.xyz, exact for iteration-0 pretransforms (_JuliaSets).
  // NB offset 16 (was mis-mapped to c.w) is C3, never a Julia const; J4 lives at −56.
  const cField = { '-56': 'c.w', 0: 'x', 8: 'y', 0x10: 'zz', 0x18: 'c.x', 0x20: 'c.y', 0x28: 'c.z' };
  const iCoord = { '-32': 'x', '-24': 'y', '-16': 'zz', '-8': 'w' }; // dIFS-ext: x/y/z/w at struct -32..-8 (read via esi=struct+88)
  // TIteration3Dext fields (decompiler_off = ext_offset − 56). Rout@112 (the IFS DE
  // distance output) and RStopD@16 (orbit-trap source, decompiler_off −40) are added
  // for the SSE2 *IFS family; the rest are the per-iteration scratch region.
  // mb3dIter@64 = ItResultI (integer iteration count, `fild [esi-0x18]`); the MB3D
  // OTrap-on-iterations colour idiom. GMT-side it's bound to float(i), not threaded.
  const SCRATCH = { '-40': 'mb3dRStopD', 56: 'mb3dRout', 64: 'mb3dIter', 192: 'mb3dOTrap', 200: 'mb3dVary', 208: 'mb3dFirst', 212: 'mb3dTmp', 216: 'mb3dD1', 224: 'mb3dD2', 232: 'mb3dDr1', 240: 'mb3dDr2', 248: 'mb3dDr3' };
  const imm = (s) => (s.startsWith('0x') || s.startsWith('-0x')) ? parseInt(s, 16) : parseInt(s, 10);
  // GLSL integer bit-ops folded into a {t:'gpval', e} register (see GPVAL below).
  const GOP = { and: '&', or: '|', xor: '^', shl: '<<', sal: '<<', shr: '>>', sar: '>>' };
  /** Update the register-value model from an instruction (mov/add/sub/lea/…). */
  function trackReg(m, o) {
    const t = o.split(',').map((s) => s.trim());
    const isReg = (s) => /^e(ax|bx|cx|dx|si|di)$/.test(s);
    if (m === 'mov' && t.length === 2 && isReg(t[0])) {
      const dst = t[0], src = t[1]; let mm;
      if (/^(dword ptr )?\[ebp \+ (?:0x)?8\]$/.test(src)) regs[dst] = { t: 'iter', o: 0 };
      else if ((mm = src.match(/^(?:dword ptr )?\[(\w+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]$/))) {
        const r = regs[mm[1]], d = mm[3] ? imm(mm[3]) * (mm[2] === '-' ? -1 : 1) : 0;
        // pointer-chase to the const buffer, else a scalar int load → {t:'gpval'}
        if (r && r.t === 'iter' && (d === 0x30 || d === 0x64)) regs[dst] = { t: 'var', o: 0 };
        else { const mv = memVar(src); regs[dst] = mv ? { t: 'gpval', e: `int(${mv})` } : undefined; }
      } else if (isReg(src) && regs[src]) regs[dst] = { ...regs[src] };
      else if (/^-?(0x[0-9a-f]+|\d+)$/.test(src)) regs[dst] = { t: 'int', v: imm(src) };
      else regs[dst] = undefined;
    } else if ((m === 'add' || m === 'sub') && t.length === 2 && isReg(t[0]) && /^-?(0x[0-9a-f]+|\d+)$/.test(t[1])) {
      const r = regs[t[0]]; if (r) { const k = imm(t[1]) * (m === 'sub' ? -1 : 1); if (r.t === 'int') r.v += k; else if (r.t === 'coord') r.i += k / 8; else if (r.t === 'gpval') r.e = `(${r.e} + (${k}))`; else r.o = (r.o || 0) + k; }
    } else if (m === 'lea' && t.length === 2 && isReg(t[0])) {
      const mm = t[1].match(/^\[(\w+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]$/);
      if (mm && regs[mm[1]]) { const r = { ...regs[mm[1]] }, d = mm[3] ? imm(mm[3]) * (mm[2] === '-' ? -1 : 1) : 0; if (r.t === 'coord') r.i += d / 8; else if (r.t !== 'gpval') r.o = (r.o || 0) + d; regs[t[0]] = r; }
      else regs[t[0]] = undefined;
    } else if (m === 'xor' && t.length === 2 && t[0] === t[1]) regs[t[0]] = { t: 'int', v: 0 };
    else if (GOP[m] && t.length === 2 && regs[t[0]]?.t === 'gpval') { // fold and/or/xor/shl/sar into the GLSL int expr
      const r = regs[t[0]], opd = t[1]; let rhs = null;
      if (/^-?(0x[0-9a-f]+|\d+)$/.test(opd)) rhs = String(imm(opd));
      else if (isReg(opd) && regs[opd]?.t === 'gpval') rhs = regs[opd].e;
      if (rhs !== null) r.e = `(${r.e} ${GOP[m]} ${rhs})`; else regs[t[0]] = undefined;
    } else if (m === 'neg' && regs[t[0]]?.t === 'gpval') regs[t[0]].e = `(-${regs[t[0]].e})`;
    else if (m === 'inc' && regs[t[0]]?.t === 'int') regs[t[0]].v++;
    else if (m === 'dec' && regs[t[0]]?.t === 'int') regs[t[0]].v--;
    else if (/^(imul|mul|idiv|div|shl|shr|sar|sal|or|not|neg|pop)$/.test(m) && isReg(t[0])) regs[t[0]] = undefined;
  }
  // Resolve a struct-relative iter offset (decompiler_off) to a GLSL var name.
  const iterName = (off) => { if (iCoord[off]) return iCoord[off]; if (cField[off]) return cField[off]; if (SCRATCH[off]) { scratch.add(SCRATCH[off]); return SCRATCH[off]; } return null; };
  function memVar(o, extra = 0) {
    // scaled-index addressing `[base + idx*scale (+/- disp)]` (e.g. the orbit-trap
    // `[esi + eax*8 - 0x80]` selecting one of {RStopD,x,y,z} by eax&3). Emit a GLSL
    // selection over the gpval index; a constant index resolves to one slot.
    const si = o.match(/\[(\w+) \+ (\w+)\*(\d+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]/);
    if (si) {
      const base = regs[si[1]], ir = regs[si[2]], scale = +si[3], disp = (si[5] ? imm(si[5]) * (si[4] === '-' ? -1 : 1) : 0) + extra;
      if (!base || base.t !== 'iter' || !ir) return null;
      const b = base.o + disp;
      if (ir.t === 'int') return iterName(b + ir.v * scale);
      if (ir.t === 'gpval') { const c = []; for (let k = 0; k < 4; k++) { const nm = iterName(b + k * scale); if (nm === null) return null; c.push(nm); } const e = ir.e; return `((${e}) == 0 ? ${c[0]} : (${e}) == 1 ? ${c[1]} : (${e}) == 2 ? ${c[2]} : ${c[3]})`; }
      return null;
    }
    const mm = o.match(/\[(\w+)(?: ([+\-]) (0x[0-9a-f]+|\d+))?\]/);
    if (!mm) return null;
    const base = mm[1], d = (mm[3] ? imm(mm[3]) * (mm[2] === '-' ? -1 : 1) : 0) + extra;
    if (base === 'ebp' || base === 'esp') { const name = `loc_${base}_${d < 0 ? 'm' : 'p'}${Math.abs(d)}`; locals.add(name); return name; }
    const r = regs[base]; if (!r) return null;
    if (r.t === 'coord') { const idx = r.i + d / 8; return (Number.isInteger(idx) && idx >= 0 && idx < 4) ? COORD[idx] : null; }
    if (r.t === 'var') { const off = r.o + d; if (off >= 0 && constMap.has(off)) return fLit(constMap.get(off)); return off < 0 ? `Cm${-off}` : `Cp${off}`; }
    if (r.t === 'iter') return iterName(r.o + d);
    return null;
  }

  const addrIdx = new Map();
  ins.forEach((x, i) => addrIdx.set(x.a, i));

  let top = 0, scId = 0;
  // SSE2 xmm register file: 8 regs × 2 lanes (low/high = 2 doubles), each lane
  // materialized as a GLSL float `x<n>l`/`x<n>h` (mirrors the f0..f7 approach).
  // Only lanes actually touched are declared. See the SSE2 block below.
  let sseUsed = false;
  const sseLanes = new Set();
  const xmmL = (n) => { sseLanes.add(`x${n}l`); return `x${n}l`; };
  const xmmH = (n) => { sseLanes.add(`x${n}h`); return `x${n}h`; };
  const xi = (s) => { const mm = s.match(/^xmm(\d)$/); return mm ? +mm[1] : null; };
  const F = (i) => `f${top - 1 - i}`;
  const out = [];
  const consts = new Set();
  const emit = (s) => out.push('  ' + s);
  const push = (e) => { top++; emit(`${F(0)} = ${e};`); };
  const mem = (o) => { const v = memVar(o); if (v === null) { emit(`// UNHANDLED mem ${o}`); return '0.0'; } if (v[0] === 'C') consts.add(v); return v; };
  const bin = (a, b, op, rev) => (rev ? `${b} ${op} ${a}` : `${a} ${op} ${b}`);

  // ===== SSE2 (xmm) decompile =====================================================
  // Each xmm holds two double lanes (lo/hi). Packed ops (pd) act on both lanes,
  // scalar ops (sd) on lo only. A packed memory operand `[base]` pulls TWO adjacent
  // doubles ([base], [base+8]) — for coords that's e.g. (x, y); for the const buffer
  // two adjacent Cm offsets. ucomisd sets CF/ZF for a following jCC (intCond path).
  const SSE_BIN_PD = { addpd: '+', subpd: '-', mulpd: '*', divpd: '/' };
  const SSE_BIN_SD = { addsd: '+', subsd: '-', mulsd: '*', divsd: '/' };
  const SSE_FN_PD = { maxpd: 'max', minpd: 'min' };
  const SSE_FN_SD = { maxsd: 'max', minsd: 'min' };
  const SSE_MOV = new Set(['movsd', 'movupd', 'movapd', 'movaps', 'movups', 'movlpd', 'movlps', 'movhpd', 'movhps', 'movddup']);
  const SSE_SHUF = new Set(['pshufd', 'shufpd', 'unpcklpd', 'unpckhpd', 'haddpd']);
  const SSE_ALL = new Set([...Object.keys(SSE_BIN_PD), ...Object.keys(SSE_BIN_SD), ...Object.keys(SSE_FN_PD), ...Object.keys(SSE_FN_SD), 'sqrtpd', 'sqrtsd', ...SSE_MOV, ...SSE_SHUF, 'ucomisd', 'comisd']);
  // Resolve an operand to {lo, hi} GLSL exprs. mem packed = ([o], [o+8]); a register
  // is its two lanes; scalar mem high lane is omitted (null). Registers consts/lanes.
  function sseLanesOf(s, packed) {
    if (s === undefined) return null;
    if (/\[/.test(s)) { const lo = memVar(s); if (lo === null) return null; if (lo[0] === 'C') consts.add(lo); if (!packed) return { lo, hi: null }; const hi = memVar(s, 8); if (hi === null) return null; if (hi[0] === 'C') consts.add(hi); return { lo, hi }; }
    const r = xi(s); if (r === null) return null; return { lo: xmmL(r), hi: xmmH(r) };
  }
  // pshufd imm → which source qword feeds each dest lane (only qword-clean shuffles).
  function pshufdLanes(immv) {
    const d = [immv & 3, (immv >> 2) & 3, (immv >> 4) & 3, (immv >> 6) & 3];
    const qsel = (a, b) => (a === 0 && b === 1) ? 'lo' : (a === 2 && b === 3) ? 'hi' : null;
    const lo = qsel(d[0], d[1]), hi = qsel(d[2], d[3]);
    return (lo && hi) ? { lo, hi } : null;
  }
  /** Emit GLSL for one SSE2 instruction; returns true if handled. */
  function sseOp(m, o) {
    const parts = o.split(',').map((s) => s.trim());
    const dst = parts[0], src = parts[1];
    const dIsMem = /\[/.test(dst), di = dIsMem ? null : xi(dst);
    if (SSE_BIN_PD[m] || SSE_FN_PD[m] || m === 'sqrtpd') { if (di === null) return false; const s = sseLanesOf(src, true); if (!s) return false; const op = SSE_BIN_PD[m]; emit(op ? `${xmmL(di)} = ${xmmL(di)} ${op} ${s.lo};` : m === 'sqrtpd' ? `${xmmL(di)} = sqrt(${s.lo});` : `${xmmL(di)} = ${SSE_FN_PD[m]}(${xmmL(di)}, ${s.lo});`); emit(op ? `${xmmH(di)} = ${xmmH(di)} ${op} ${s.hi};` : m === 'sqrtpd' ? `${xmmH(di)} = sqrt(${s.hi});` : `${xmmH(di)} = ${SSE_FN_PD[m]}(${xmmH(di)}, ${s.hi});`); sseUsed = true; return true; }
    if (SSE_BIN_SD[m] || SSE_FN_SD[m] || m === 'sqrtsd') { if (di === null) return false; const s = sseLanesOf(src, false); if (!s) return false; const op = SSE_BIN_SD[m]; emit(op ? `${xmmL(di)} = ${xmmL(di)} ${op} ${s.lo};` : m === 'sqrtsd' ? `${xmmL(di)} = sqrt(${s.lo});` : `${xmmL(di)} = ${SSE_FN_SD[m]}(${xmmL(di)}, ${s.lo});`); sseUsed = true; return true; }
    // bitwise sign-mask ops on the global SIMD table (DivUtils PAligned16, pointed
    // by PVar/edi): [+0]/[+8] hold the abs AND-mask (0x7FFF…), [+80]/[+88] the
    // sign-flip XOR-mask (0x8000…). andpd→abs, xorpd→negate. (xorpd reg,reg = zero.)
    if (m === 'andpd' || m === 'andps' || m === 'xorpd' || m === 'xorps') {
      if (di === null) return false;
      if ((m === 'xorpd' || m === 'xorps') && xi(src) === di) { emit(`${xmmL(di)} = 0.0;`); emit(`${xmmH(di)} = 0.0;`); sseUsed = true; return true; }
      const lo = /\[/.test(src) ? memVar(src) : null; // side-effect-free name (no const registration)
      if ((m === 'andpd' || m === 'andps') && (lo === 'Cp0' || lo === 'Cp8')) { emit(`${xmmL(di)} = abs(${xmmL(di)});`); emit(`${xmmH(di)} = abs(${xmmH(di)});`); sseUsed = true; return true; }
      if ((m === 'xorpd' || m === 'xorps') && (lo === 'Cp80' || lo === 'Cp88')) { emit(`${xmmL(di)} = -(${xmmL(di)});`); emit(`${xmmH(di)} = -(${xmmH(di)});`); sseUsed = true; return true; }
      return false; // other masks → UNHANDLED (safe)
    }
    if (m === 'movupd' || m === 'movapd' || m === 'movaps' || m === 'movups') {
      if (dIsMem) { const d2 = sseLanesOf(dst, true), si = xi(src); if (!d2 || si === null) return false; emit(`${d2.lo} = ${xmmL(si)};`); emit(`${d2.hi} = ${xmmH(si)};`); sseUsed = true; return true; }
      if (di === null) return false; const s = sseLanesOf(src, true); if (!s) return false; emit(`${xmmL(di)} = ${s.lo};`); emit(`${xmmH(di)} = ${s.hi};`); sseUsed = true; return true;
    }
    if (m === 'movsd') {
      if (dIsMem) { const d2 = sseLanesOf(dst, false), si = xi(src); if (!d2 || si === null) return false; emit(`${d2.lo} = ${xmmL(si)};`); sseUsed = true; return true; } // scalar store (lo)
      if (di === null) return false;
      if (/\[/.test(src)) { const s = sseLanesOf(src, false); if (!s) return false; emit(`${xmmL(di)} = ${s.lo};`); emit(`${xmmH(di)} = 0.0;`); sseUsed = true; return true; } // load from mem zeroes hi
      const si = xi(src); if (si === null) return false; emit(`${xmmL(di)} = ${xmmL(si)};`); sseUsed = true; return true; // reg→reg preserves hi
    }
    if (m === 'movlpd' || m === 'movlps') {
      if (dIsMem) { const d2 = sseLanesOf(dst, false), si = xi(src); if (!d2 || si === null) return false; emit(`${d2.lo} = ${xmmL(si)};`); sseUsed = true; return true; }
      if (di === null) return false; const s = sseLanesOf(src, false); if (!s) return false; emit(`${xmmL(di)} = ${s.lo};`); sseUsed = true; return true; // load lo, preserve hi
    }
    if (m === 'movhpd' || m === 'movhps') {
      if (dIsMem) { const d2 = sseLanesOf(dst, false), si = xi(src); if (!d2 || si === null) return false; emit(`${d2.lo} = ${xmmH(si)};`); sseUsed = true; return true; } // store hi
      if (di === null) return false; const s = sseLanesOf(src, false); if (!s) return false; emit(`${xmmH(di)} = ${s.lo};`); sseUsed = true; return true; // load qword into hi lane
    }
    if (m === 'movddup') { if (di === null) return false; const s = sseLanesOf(src, false); if (!s) return false; emit(`${xmmH(di)} = ${s.lo};`); emit(`${xmmL(di)} = ${s.lo};`); sseUsed = true; return true; }
    if (m === 'pshufd') { if (di === null) return false; const si = xi(src); if (si === null) return false; const sel = pshufdLanes(imm(parts[2])); if (!sel) return false; emit(`{ float _pl = ${xmmL(si)}, _ph = ${xmmH(si)}; ${xmmL(di)} = ${sel.lo === 'lo' ? '_pl' : '_ph'}; ${xmmH(di)} = ${sel.hi === 'lo' ? '_pl' : '_ph'}; }`); sseUsed = true; return true; }
    if (m === 'shufpd') { if (di === null) return false; const si = xi(src); if (si === null) return false; const iv = imm(parts[2]); emit(`{ float _dl = ${xmmL(di)}, _dh = ${xmmH(di)}, _sl = ${xmmL(si)}, _sh = ${xmmH(si)}; ${xmmL(di)} = ${(iv & 1) ? '_dh' : '_dl'}; ${xmmH(di)} = ${(iv & 2) ? '_sh' : '_sl'}; }`); sseUsed = true; return true; }
    if (m === 'unpcklpd') { if (di === null) return false; const s = sseLanesOf(src, false); if (!s) return false; emit(`${xmmH(di)} = ${s.lo};`); sseUsed = true; return true; } // hi=src.lo, lo unchanged
    if (m === 'unpckhpd') { if (di === null) return false; const s = sseLanesOf(src, true); if (!s) return false; emit(`{ float _dh = ${xmmH(di)}; ${xmmL(di)} = _dh; ${xmmH(di)} = ${s.hi}; }`); sseUsed = true; return true; }
    if (m === 'haddpd') { if (di === null) return false; const s = sseLanesOf(src, true); if (!s) return false; emit(`{ float _a = ${xmmL(di)} + ${xmmH(di)}, _b = ${s.lo} + ${s.hi}; ${xmmL(di)} = _a; ${xmmH(di)} = _b; }`); sseUsed = true; return true; }
    return false;
  }
  const sseFlagNeutral = (mn) => SSE_ALL.has(mn) || mn === 'mov' || mn === 'lea' || mn === 'nop' || mn === 'movzx' || mn === 'movsx';
  // ===============================================================================

  // FPU compare condition codes after `fnstsw ax`: C0 (bit0 of ah) = (a<b),
  // C3 (bit6) = (a==b). The flag-extract instruction + jCC select a relation.
  function decodeCond(extract, mask, jcc, A, B) {
    const LT = `${A} < ${B}`, GE = `${A} >= ${B}`, LE = `${A} <= ${B}`, GT = `${A} > ${B}`, EQ = `${A} == ${B}`, NE = `${A} != ${B}`;
    if (extract === 'shr') {
      // `shr ah,1` only cleanly extracts CF=C0=(a<b). ZF reflects (ah>>1)==0, but
      // ah bits 3-5 hold the x87 TOP field, which is NONZERO whenever operands are
      // on the stack (true at every real fcom site). So ZF is effectively always 0,
      // and `jbe`≡`jb`, `ja`≡`jae` at runtime — only CF matters. (The old model
      // assumed TOP=0 → ZF=!C3, which collapsed `if (a<b)` guards like _updateC2's
      // swap into dead swap-on-equality. See xcheck.mjs shr handling — kept in sync.)
      if (/^j(b|c|be)$/.test(jcc)) return LT;        // CF (||ZF, ZF=0) → a<b
      if (/^j(ae|nc|nb|a)$/.test(jcc)) return GE;    // !CF (&&!ZF) → a>=b
      return null;
    }
    if (extract === 'sahf') {
      if (/^j(b|c)$/.test(jcc)) return LT; if (/^j(ae|nc|nb)$/.test(jcc)) return GE;
      if (/^j(e|z)$/.test(jcc)) return EQ; if (/^j(ne|nz)$/.test(jcc)) return NE;
      if (jcc === 'jbe') return LE; if (jcc === 'ja') return GT; return null;
    }
    if (extract === 'test' || extract === 'and') { // ZF = (condByte & mask)==0; C0=1,C2=4,C3=0x40
      // After `test/and ah,mask`, OF=0 and (the masks 0x41/0x01/0x40 keep result bit7=0 so)
      // SF=0 — the signed jumps collapse to the ZF-only forms: jg/jnle ≡ jne, jle/jng ≡ je.
      // The UNSIGNED forms collapse the same way: AND clears CF, so jbe (CF||ZF) ≡ je and
      // ja (!CF&&!ZF) ≡ jne. (U5 root cause 1 — gates _HopSqrt{X,Y,Z}, _NeoSqr{X,Y,Z},
      // _hopalong/_hopalm1, _gnarl*fast, koch_cube/koch_surf. xcheck.mjs already evaluates
      // ja/jbe with CF clear after `and ah` — this aligns the decompiler with it.)
      const je = /^j(e|z|le|ng|be)$/.test(jcc), jne = /^j(ne|nz|g|nle|a)$/.test(jcc);
      if (!je && !jne) return null;
      if (mask === 0x41) return je ? GT : LE;   // !C0 && !C3 => a>b
      if (mask === 0x01) return je ? GE : LT;   // !C0 => a>=b
      if (mask === 0x40) return je ? NE : EQ;   // !C3 => a!=b
      return null;
    }
    return null;
  }
  // Detect a forward compare→fnstsw→flag→jCC branch at p (target within [.,hi)).
  const skipFiller = (i) => { while (ins[i] && /^(wait|fwait|fnop|nop)$/.test(ins[i].m)) i++; return i; }; // `fwait` between fcom/fnstsw, padding nops
  // Is `idx` the function epilogue? — a trailing `fstp st(0)` that discards the
  // in-progress FPU value, followed only by stack-frame teardown (register pops,
  // `leave`, esp/ebp-restore moves) up to `ret`. Used to recognise a forward jCC
  // that early-outs the formula leaving the point unchanged (see detectBranch).
  function isEpilogueTarget(idx) {
    if (ins[idx]?.m !== 'fstp' || !/^st\(0\)$/.test(ins[idx].o)) return false;
    for (let j = idx + 1; j < ins.length; j++) {
      const m = ins[j].m;
      if (m === 'ret') return true;
      if (m === 'pop' || m === 'leave' || /^(nop|fnop|fwait|wait)$/.test(m)) continue;
      if (m === 'mov' && /\b(esp|ebp)\b/.test(ins[j].o)) continue;
      return false; // any real work before ret → not a bare epilogue
    }
    return false;
  }
  function detectBranch(p, hi) {
    const ci = ins[p];
    if (!/^f(ucom|com|ucomp|comp|ucompp|compp|tst)$/.test(ci.m)) return null;
    // U5 root cause 2: a balanced `fxch` / `fst st(i)` between the compare and the
    // flag-extract doesn't touch `ah` (so detection can step over it) but DOES reshuffle
    // the FPU stack, so the operand that a later guarded op mutates may differ from what
    // was compared (MsltoeSym2/3/4: `fcom st(1); fnstsw; fxch st(2); shr ah,1; jb`, where
    // the guarded `fchs` negates the swapped-in coord, not the compared one). Collect such
    // interior ops; emitBranch snapshots the compared values into temps and emits the
    // interior swaps before the guard, so the guarded block runs on the post-swap stack.
    // Gap A: a flag-neutral `fld [mem]` scheduled between `fnstsw` and the flag-extract
    // (the compiler preloads a value the taken branch consumes) — e.g. `fcompp; fnstsw ax;
    // fld [edi]; and ah,0x41; jne` (_PartlyJuliaRoff) / `fcomp st(1); fnstsw ax;
    // fld [esi-0x10]; shr ah,1; jb` (ABoxSphereOffset4d). It's a stack PUSH (not a
    // depth-neutral reshuffle), but the same `interior` path is correct: it overwrites the
    // now-popped compared temp, so the capLines snapshot (built because interior is non-empty)
    // preserves the compared values, and emitBranch's `run(idx,idx+1)` emits the push with the
    // proper `top++`. Memory operand only — `mem(o)` is top-independent; `fld st(i)` is not.
    const interior = [];
    const skipI = (i) => {
      while (ins[i]) {
        const mi = ins[i].m;
        if (/^(wait|fwait|fnop|nop)$/.test(mi)) { i++; continue; }
        if (mi === 'fxch' || (mi === 'fst' && /^st\(\d+\)$/.test(ins[i].o))) { interior.push(i); i++; continue; }
        if (mi === 'fld' && /\[/.test(ins[i].o)) { interior.push(i); i++; continue; }
        break;
      }
      return i;
    };
    let nq = skipI(p + 1);
    if (ins[nq]?.m !== 'fnstsw') return null;
    let q = skipI(nq + 1), extract = null, mask = null;
    const fo = ins[q]?.o ?? '';
    if (ins[q]?.m === 'shr' && /^ah, ?1$/.test(fo)) { extract = 'shr'; q++; }
    else if (ins[q]?.m === 'sahf') { extract = 'sahf'; q++; }
    else if ((ins[q]?.m === 'test' || ins[q]?.m === 'and') && /^ah,/.test(fo)) { const mv = fo.split(',')[1].trim(); extract = ins[q].m; mask = mv.startsWith('0x') ? parseInt(mv, 16) : parseInt(mv, 10); q++; }
    else return null;
    q = skipFiller(q);
    // `ftst`/`fcom` leave the tested value on the stack; an `fstp st(0)` between
    // the flag-extract and the jCC drops it (common after ftst). Skip it here and
    // fold its pop into popN — the compare condition still references the live F(0).
    let extraPop = 0;
    while (ins[q] && ins[q].m === 'fstp' && /^st\(0\)$/.test(ins[q].o)) { extraPop++; q++; q = skipFiller(q); }
    const jcc = ins[q];
    // Signed forms (g|ge|l|le + n-synonyms) are admitted here and resolved by decodeCond:
    // after `and/test ah,mask` the derivable ones (jg/jle/jng/jnle) map to jne/je; the rest
    // (and any signed jCC after shr/sahf) return null below → rejected, same as before.
    if (!jcc || !/^j(a|ae|b|be|e|ne|z|nz|c|nc|nb|g|ge|l|le|ng|nge|nl|nle)$/.test(jcc.m)) return null;
    let tIdx = addrIdx.get(parseInt(jcc.o, 16));
    if (tIdx === undefined || tIdx <= q) return null; // forward only
    // A forward jCC whose target is the function epilogue (a trailing `fstp st(0)`
    // that pops the in-progress value before the register-restore + ret) is an
    // early-out that ABANDONS the fold and returns the point unchanged — e.g.
    // _SphereFolding1's 3-way sphere fold, where the middle case (`jae epilogue`)
    // leaves x/y/z as-is. We can't goto the epilogue in straight-line GLSL, but a
    // non-popping compare leaves the tested value (F(0)) on the stack, so guarding
    // only the REST of the current block ([jcc+1, hi)) is equivalent: the taken
    // case skips the block's remaining work, F(0) passes through unchanged, and the
    // shared post-block merge applies to it (for _SphereFolding1 the merge is
    // `F(0) /= R2`, so the unchanged F(0)=R2 yields 1.0 → identity scale). Clamp the
    // effective target to `hi` (guard, no else). Cross-check-gated, so a formula
    // where this model is wrong fails xcheck and is dropped, never shipped wrong.
    if (tIdx > hi) {
      // Only when the compare is non-popping (F(0) survives as the pass-through
      // value) with no intervening pop, and the target is the epilogue.
      if (/^f(ucom|com|tst)$/.test(ci.m) && extraPop === 0 && isEpilogueTarget(tIdx)) tIdx = hi;
      else return null;
    }
    let cmpA, cmpB, popN = extraPop;
    const operand = (s) => { const v = memVar(s); if (v && v[0] === 'C') consts.add(v); return v; };
    if (/compp$/.test(ci.m)) { cmpA = F(0); cmpB = F(1); popN += 2; }
    else if (ci.m === 'ftst') { cmpA = F(0); cmpB = '0.0'; }
    else { cmpA = F(0); cmpB = /st\(/.test(ci.o) ? F(stN(ci.o)) : (ci.o ? operand(ci.o) : F(1)); if (cmpB === null) return null; popN += /comp$/.test(ci.m) ? 1 : 0; }
    // With an interior reshuffle, snapshot the compared values into temps NOW (before the
    // fxch/fst swaps the slot vars) and build the guard over the temps; emitBranch emits the
    // capture + interior swaps after the pop, then the guard.
    let capLines = [];
    if (interior.length) {
      const a = `_bca${scId}`, b = `_bcb${scId}`; scId++;
      capLines = [`float ${a} = ${cmpA}, ${b} = ${cmpB};`];
      cmpA = a; cmpB = b;
    }
    const jumpCond = decodeCond(extract, mask, jcc.m, cmpA, cmpB);
    if (!jumpCond) return null;
    return { jccIdx: q, tIdx, popN, jumpCond, interior, capLines };
  }
  // Integer-memory compare branch: `cmp [const/coord], imm; jCC` (option flags).
  function intCond(jcc, A, B) {
    if (/^j(e|z)$/.test(jcc)) return `${A} == ${B}`;
    if (/^j(ne|nz)$/.test(jcc)) return `${A} != ${B}`;
    if (/^j(l|b|c|nge)$/.test(jcc)) return `${A} < ${B}`;
    if (/^j(le|be|ng)$/.test(jcc)) return `${A} <= ${B}`;
    if (/^j(g|a|nle)$/.test(jcc)) return `${A} > ${B}`;
    if (/^j(ge|ae|nc|nb|nl)$/.test(jcc)) return `${A} >= ${B}`;
    return null;
  }
  function detectIntBranch(p, hi) {
    if (ins[p].m !== 'cmp') return null;
    const jcc = ins[p + 1];
    if (!jcc || !/^j(a|ae|b|be|e|ne|z|nz|g|ge|l|le|c|nc|nb|ng|nl|nle|nge)$/.test(jcc.m)) return null;
    const tIdx = addrIdx.get(parseInt(jcc.o, 16));
    if (tIdx === undefined || tIdx <= p + 1 || tIdx > hi) return null;
    const parts = ins[p].o.split(',');
    if (parts.length !== 2) return null;
    const X = parts[0].trim(), Y = parts[1].trim();
    if (!/\[/.test(X)) return null; // reg compares (loop counters) not handled here
    const v = memVar(X); if (v === null) return null; if (v[0] === 'C') consts.add(v);
    const B = Y.startsWith('0x') ? String(parseInt(Y, 16)) + '.0' : (/^-?\d+$/.test(Y) ? Y + '.0' : null);
    if (B === null) return null;
    const jumpCond = intCond(jcc.m, v, B);
    if (!jumpCond) return null;
    return { jccIdx: p + 1, tIdx, popN: 0, jumpCond };
  }
  // GP-register integer-conditional branch: `and reg,imm; jCC` / `test reg,reg|imm; jCC`
  // / `cmp reg,imm; jCC`, where reg is a tracked {t:'gpval', e} (option-flag bit tests).
  function detectGpBranch(p, hi) {
    const ci = ins[p];
    if (ci.m !== 'and' && ci.m !== 'test' && ci.m !== 'cmp') return null;
    // The flag-setter and the jCC may be separated by padding nops (koch_surf's
    // `and eax,1; nop; nop; je` option-flag branch). The interpreter executes them
    // linearly (nops are NEUTRAL), so skip the filler to align the decoder with it.
    const jq = skipFiller(p + 1);
    const jcc = ins[jq];
    if (!jcc || !/^j(a|ae|b|be|e|ne|z|nz|g|ge|l|le|c|nc|nb|ng|nl|nle|nge)$/.test(jcc.m)) return null;
    const tIdx = addrIdx.get(parseInt(jcc.o, 16));
    if (tIdx === undefined || tIdx <= jq || tIdx > hi) return null;
    const parts = ci.o.split(',').map((s) => s.trim());
    if (parts.length !== 2) return null;
    const dst = parts[0], rd = regs[dst];
    if (!rd || rd.t !== 'gpval') return null; // need a tracked GP-integer value
    let jumpCond = null;
    if (ci.m === 'cmp') {
      const B = parts[1].startsWith('0x') ? String(parseInt(parts[1], 16)) : (/^-?\d+$/.test(parts[1]) ? parts[1] : null);
      if (B === null) return null;
      jumpCond = intCond(jcc.m, `(${rd.e})`, B);
    } else { // and/test → ZF = ((dst & mask) == 0); for `and`, trackReg already folded the mask in
      if (!/^j(e|z|ne|nz)$/.test(jcc.m)) return null;
      const je = /^j(e|z)$/.test(jcc.m);
      let expr;
      if (ci.m === 'and') expr = `(${rd.e}) == 0`;                       // result already in rd.e
      else if (parts[1] === dst) expr = `(${rd.e}) == 0`;               // test reg,reg
      else if (/^-?(0x[0-9a-f]+|\d+)$/.test(parts[1])) expr = `((${rd.e}) & ${imm(parts[1])}) == 0`;
      else if (/^e(ax|bx|cx|dx|si|di)$/.test(parts[1]) && regs[parts[1]]?.t === 'gpval') expr = `((${rd.e}) & (${regs[parts[1]].e})) == 0`;
      else return null;
      jumpCond = je ? expr : `!(${expr})`;
    }
    if (!jumpCond) return null;
    return { jccIdx: jq, tIdx, popN: 0, jumpCond };
  }

  // SSE2 compare branch: `ucomisd/comisd xmm, src` sets CF/ZF; a later jCC consumes
  // them. Unlike the FPU path the jCC need not be adjacent — flag-neutral SSE moves
  // (e.g. preloading the fold multiplier) may sit between. We capture the compared
  // lo lanes, mark the interior [compare+1, jcc) to run unconditionally before the
  // `if`, and reuse intCond (CF=a<b, ZF=a==b matches ucomisd's flag semantics).
  function detectSseBranch(p, hi) {
    const ci = ins[p];
    if (ci.m !== 'ucomisd' && ci.m !== 'comisd') return null;
    const parts = ci.o.split(',').map((s) => s.trim());
    const A = sseLanesOf(parts[0], false), B = sseLanesOf(parts[1], false);
    if (!A || !B) return null;
    let q = p + 1;
    for (;;) {
      if (q >= hi) return null;
      const mq = ins[q].m;
      if (/^j(a|ae|b|be|e|ne|z|nz|c|nc|nb|g|ge|l|le|ng|nl|nle|nge)$/.test(mq)) break;
      if (!sseFlagNeutral(mq)) return null; // a flag-setting / control-flow instr → not a simple branch
      q++;
    }
    const tIdx = addrIdx.get(parseInt(ins[q].o, 16));
    if (tIdx === undefined || tIdx <= q || tIdx > hi) return null; // forward only, in range
    return { jccIdx: q, tIdx, interiorLo: p + 1, interiorHi: q, cmpA: A.lo, cmpB: B.lo, jcc: ins[q].m };
  }

  const snapRegs = () => { const s = {}; for (const k in regs) s[k] = regs[k] ? { ...regs[k] } : regs[k]; return s; };
  const restRegs = (s) => { for (const k of Object.keys(regs)) delete regs[k]; for (const k in s) regs[k] = s[k]; };
  // Out-of-line conditional block (block reorder, NOT a loop): a forward branch
  // whose TAKEN target is a straight-line block placed at the tail that ends in
  // `jmp M`, where M is the branch's own fall-through (the merge). MB3D's
  // compiler hoists the unconditional path to M and parks the conditional extra
  // work at the end. Structure as `if (taken) { <ool> }` then fall through to M
  // — no `return`/duplication needed. Requires the fall-through block [M, tIdx)
  // to terminate (ret) before the ool block, and the ool block to be one
  // straight-line run (its only jmp is the terminating `jmp M`).
  function detectOOL(br, hi) {
    const M = br.jccIdx + 1;
    for (let j = br.tIdx; j < hi; j++) {
      const q = ins[j];
      if (q.m === 'ret') return null;
      if (q.m === 'jmp') {
        const t = addrIdx.get(parseInt(q.o, 16));
        if (t !== M) return null;                         // only the terminating jmp-to-merge allowed
        let k = br.tIdx - 1; while (k > M && /^(nop|fnop|fwait|wait)$/.test(ins[k].m)) k--;
        if (ins[k]?.m !== 'ret') return null;             // fall-through must end in ret, not fall into ool
        return { oolLo: br.tIdx, oolHi: j };
      }
    }
    return null;
  }

  // Emit a structured if/else (or out-of-line block) for a detected forward branch
  // {jccIdx, tIdx, popN, jumpCond}; returns the index to resume `p` at. Shared by
  // the FPU, integer-option, GP-integer and SSE2 compare paths.
  function emitBranch(br, hi) {
    // out-of-line conditional tail block (reorder, not a loop) — see detectOOL.
    const ool = detectOOL(br, hi);
    if (ool) {
      top -= br.popN;
      (br.capLines || []).forEach((l) => emit(l));        // snapshot compared values (interior fxch/fst)
      (br.interior || []).forEach((idx) => run(idx, idx + 1)); // emit the interior stack reshuffle
      const top0 = top, sr = snapRegs();
      emit(`if (${br.jumpCond}) {`);
      run(ool.oolLo, ool.oolHi);
      if (top !== top0) emit(`// UNHANDLED ool-imbalance ${top0}/${top}`);
      top = top0; restRegs(sr);
      emit(`}`);
      return br.jccIdx; // fall through to the merge (M); ool block sits after the ret
    }
    top -= br.popN;
    (br.capLines || []).forEach((l) => emit(l));        // snapshot compared values (interior fxch/fst)
    (br.interior || []).forEach((idx) => run(idx, idx + 1)); // emit the interior stack reshuffle
    const top0 = top;
    let thenHi = br.tIdx, elseLo = -1, elseHi = -1, merge = br.tIdx;
    // the then-block's terminating `jmp <merge>` may be separated from the
    // else-block start (tIdx) by padding nops — skip them backward.
    let li = br.tIdx - 1; while (li > br.jccIdx && /^(nop|fnop|fwait|wait)$/.test(ins[li].m)) li--;
    const last = ins[li];
    if (last?.m === 'jmp') { const m2 = addrIdx.get(parseInt(last.o, 16)); if (m2 !== undefined && m2 > br.tIdx) { thenHi = li; elseLo = br.tIdx; elseHi = m2; merge = m2; } }
    emit(`if (!(${br.jumpCond})) {`);
    run(br.jccIdx + 1, thenHi);
    const topThen = top;
    if (elseLo >= 0) {
      emit(`} else {`);
      top = top0;
      run(elseLo, elseHi);
      if (top !== topThen) emit(`// UNHANDLED branch-imbalance ${topThen}/${top}`);
      top = topThen;
      emit(`}`);
    } else {
      if (top !== top0) emit(`// UNHANDLED branch-imbalance ${top0}/${top}`);
      emit(`}`);
    }
    return merge - 1;
  }

  function run(lo, hi) {
  for (let p = lo; p < hi; p++) {
    const { m, o } = ins[p];
    trackReg(m, o); // GP-register abstract interpretation (mov/add/sub/lea/…)
    // abs via sign-dword clear: `and [ptr+4], 0x7fffffff` (ptr = the value's address)
    if (m === 'and' && /\+ 4\], eax/.test(o)) {
      const rm = o.match(/\[(\w+) \+ 4\]/); const cv = rm ? memVar(`[${rm[1]}]`) : null;
      emit(cv ? `${cv} = abs(${cv});` : `// UNHANDLED abs ${o}`); continue;
    }
    // inc/dec on a memory slot (the bFirstIt first-iteration flag: `inc [edi+0x50]`
    // → mb3dFirst++, which makes the once-per-orbit init guard fire only on iter 0
    // so per-iteration scratch like VaryScale accumulates instead of resetting).
    // Register inc/dec is modeled in trackReg (no GLSL); only a memory operand
    // resolving to a writable state var emits an assignment.
    if ((m === 'inc' || m === 'dec') && /\[/.test(o)) {
      const mv = memVar(o);
      if (mv !== null && mv[0] !== 'C') emit(`${mv} = ${mv} ${m === 'inc' ? '+' : '-'} 1.0;`);
      continue;
    }
    // SSE2 compare→jCC branch (interior flag-neutral moves run unconditionally,
    // compared lanes are snapshotted so a reassign in the interior can't corrupt them).
    const sbr = detectSseBranch(p, hi);
    if (sbr) {
      const ca = `_c${scId}a`, cb = `_c${scId}b`; scId++;
      emit(`float ${ca} = ${sbr.cmpA}, ${cb} = ${sbr.cmpB};`);
      run(sbr.interiorLo, sbr.interiorHi);
      p = emitBranch({ jccIdx: sbr.jccIdx, tIdx: sbr.tIdx, popN: 0, jumpCond: intCond(sbr.jcc, ca, cb) }, hi);
      continue;
    }
    // general forward conditional branch (FPU compare, or integer option-flag cmp)
    const br = detectBranch(p, hi) || detectIntBranch(p, hi) || detectGpBranch(p, hi);
    if (br) { p = emitBranch(br, hi); continue; }
    if (sseOp(m, o)) continue; // SSE2 (xmm) instruction
    // internal function calls + returns + unconditional skips.
    if (m === 'ret') return;                                  // end of this (sub)routine
    if (m === 'call') { const ti = addrIdx.get(parseInt(o, 16)); if (ti !== undefined) run(ti, ins.length); else emit(`// UNHANDLED call ${o}`); continue; } // inline the callee (its ret stops it)
    if (m === 'jmp') { const ti = addrIdx.get(parseInt(o, 16)); if (ti !== undefined && ti > p) { p = ti - 1; continue; } /* backward = loop → handled below / UNHANDLED */ }
    // arithmetic (non-pop): fadd/fsub/fsubr/fmul/fdiv/fdivr  (mem | st(i) | st(i),st0)
    if (ARITH[m]) {
      const [op, rev] = ARITH[m];
      if (/st\(\d+\), st\(0\)/.test(o)) { const k = stN(o); emit(`${F(k)} = ${bin(F(k), F(0), op, rev)};`); }
      else if (/st\(/.test(o)) { const k = stN(o); emit(`${F(0)} = ${bin(F(0), F(k), op, rev)};`); }
      else {
        // abs/neg via the DivUtils PAligned16 masks: an x87 `fmul [PVar+0/8]` (abs
        // AND-mask 0x7FFF…) or `fmul [PVar+80/88]` (sign XOR-mask 0x8000…) is the
        // bit-mask trick capstone mis-decodes as a scalar multiply by the mask-as-
        // double. Resolve side-effect-free (no const registration) and mirror the SSE2
        // andpd/xorpd handling. Offsets 0/8/80/88 are NEVER real consts (DivUtils.pas),
        // so a `Cp{0,8,80,88}` name uniquely means the PVar base (r.t==='var').
        const mv = memVar(o);
        if (m === 'fmul' && (mv === 'Cp0' || mv === 'Cp8')) { emit(`${F(0)} = abs(${F(0)});`); continue; }
        if (m === 'fmul' && (mv === 'Cp80' || mv === 'Cp88')) { emit(`${F(0)} = -(${F(0)});`); continue; }
        emit(`${F(0)} = ${bin(F(0), mem(o), op, rev)};`);
      }
      continue;
    }
    if (ARITHP[m]) { const [op, rev] = ARITHP[m]; const k = stN(o); emit(`${F(k)} = ${bin(F(k), F(0), op, rev)};`); top--; continue; }

    switch (m) {
      case 'fld': /st\(/.test(o) ? push(F(stN(o))) : push(mem(o)); break;
      case 'fld1': push('1.0'); break;
      case 'fldz': push('0.0'); break;
      case 'fldpi': push('3.141592653589793'); break;
      case 'fabs': emit(`${F(0)} = abs(${F(0)});`); break;
      case 'fchs': emit(`${F(0)} = -(${F(0)});`); break;
      case 'fsqrt': emit(`${F(0)} = sqrt(${F(0)});`); break;
      case 'frndint': emit(`${F(0)} = floor(${F(0)} + 0.5);`); break;
      case 'fsin': emit(`${F(0)} = sin(${F(0)});`); break;
      case 'fcos': emit(`${F(0)} = cos(${F(0)});`); break;
      case 'fptan': emit(`${F(0)} = tan(${F(0)});`); push('1.0'); break;
      case 'fpatan': emit(`${F(1)} = atan(${F(1)}, ${F(0)});`); top--; break;
      case 'f2xm1': emit(`${F(0)} = exp2(${F(0)}) - 1.0;`); break;
      case 'fyl2x': emit(`${F(1)} = ${F(1)} * log2(${F(0)});`); top--; break;
      case 'fyl2xp1': emit(`${F(1)} = ${F(1)} * log2(${F(0)} + 1.0);`); top--; break;
      case 'fscale': emit(`${F(0)} = ${F(0)} * exp2(floor(${F(1)}));`); break;
      case 'fsincos': { const t = `_sc${scId++}`; emit(`float ${t} = ${F(0)};`); emit(`${F(0)} = sin(${t});`); top++; emit(`${F(0)} = cos(${t});`); break; }
      case 'fxch': { const k = stN(o); emit(`{ float t = ${F(0)}; ${F(0)} = ${F(k)}; ${F(k)} = t; }`); break; }
      case 'fst': if (!/st\(/.test(o)) emit(`${mem(o)} = ${F(0)};`); else emit(`${F(stN(o))} = ${F(0)};`); break;
      case 'fstp': if (/st\(/.test(o)) { emit(`${F(stN(o))} = ${F(0)};`); top--; } else { emit(`${mem(o)} = ${F(0)};`); top--; } break;
      // integer-memory FPU ops (operand is a dword/qword int in mem)
      case 'fild': push(mem(o)); break;
      case 'fist': emit(`${mem(o)} = floor(${F(0)} + 0.5);`); break;
      case 'fistp': emit(`${mem(o)} = floor(${F(0)} + 0.5);`); top--; break;
      case 'fiadd': emit(`${F(0)} = ${F(0)} + ${mem(o)};`); break;
      case 'fisub': emit(`${F(0)} = ${F(0)} - ${mem(o)};`); break;
      case 'fisubr': emit(`${F(0)} = ${mem(o)} - ${F(0)};`); break;
      case 'fimul': emit(`${F(0)} = ${F(0)} * ${mem(o)};`); break;
      case 'fidiv': emit(`${F(0)} = ${F(0)} / ${mem(o)};`); break;
      case 'fidivr': emit(`${F(0)} = ${mem(o)} / ${F(0)};`); break;
      // partial remainder (toward zero), extra constant loads, stack housekeeping
      case 'fprem': case 'fprem1': emit(`${F(0)} = ${F(0)} - ${F(1)} * trunc(${F(0)} / ${F(1)});`); break;
      case 'fldln2': push('0.6931471805599453'); break;
      case 'fldl2e': push('1.4426950408889634'); break;
      case 'fldlg2': push('0.30102999566398114'); break;
      case 'fldl2t': push('3.321928094887362'); break;
      case 'ffree': break;            // tag a register empty — no value effect
      case 'fincstp': top--; break;   // rotate top up = discard st(0)
      case 'fdecstp': top++; break;   // rotate top down
      // bare compares not consumed by a branch — only their stack (pop) effect matters
      case 'fcom': case 'fucom': case 'ftst': case 'fcomi': case 'fucomi': break;
      case 'fcomp': case 'fucomp': case 'fcomip': case 'fucomip': top--; break;
      case 'fcompp': case 'fucompp': top -= 2; break;
      default: if (!NEUTRAL.has(m)) emit(`// UNHANDLED ${m} ${o}`);
    }
  }
  }
  run(0, ins.length);
  const unhandled = out.filter((l) => l.includes('UNHANDLED'));
  const localDecls = locals.size ? `  float ${[...locals].join(' = 0.0, ')} = 0.0;\n` : '';
  const sseDecls = sseLanes.size ? `  float ${[...sseLanes].sort().map((l) => `${l} = 0.0`).join(', ')};\n` : '';
  const glsl = `  float f0, f1, f2, f3, f4, f5, f6, f7;\n${localDecls}${sseDecls}${out.join('\n')}`;
  return { glsl, consts: [...consts], unhandled, scratch: [...scratch] };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('decompile.mjs')) {
  const fs = await import('node:fs');
  const hex = fs.readFileSync(process.argv[2] || 'menger3.hex', 'utf8').trim();
  const bytes = new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
  const { glsl, consts, unhandled } = await decompileFormula(bytes);
  console.log(`// consts: ${consts.sort().join(', ')}  unhandled: ${unhandled.length}`);
  console.log(`void formula(inout float x, inout float y, inout float zz, inout float w) {\n${glsl}\n}`);
}
