/**
 * Uniform-headroom cost probe (weave amendment A3): what does WIDENING the
 * uniform slot vocabulary cost at compile time?
 *
 * Takes the live production fragment shader snapshot (debug/bench-shader-
 * snapshot.json, ~250 uniforms, AmazingBox scene) and compiles it on the REAL
 * GPU (headed Chrome / ANGLE D3D11) against variants with extra DECLARED-BUT-
 * UNREAD uniforms injected — the exact shape of idle param lanes:
 *
 *   base    — snapshot as-is
 *   plus30  — +24 floats +6 vec4 (double today's 24-lane scalar pool + 6 units)
 *   plus120 — +96 floats +24 vec4 (absurd headroom, scaling check)
 *
 * Variants are interleaved per round with unique cache-busting tail comments
 * (ANGLE's program-binary cache keys on source). LINK_STATUS is queried to
 * force ANGLE's deferred HLSL translation + DXBC compile into the timing.
 * FPS is not measured: uniforms that a program never reads are INACTIVE after
 * link — no registers, no upload (UniformManager sets by cached location).
 *
 *   npx tsx debug/probe-uniform-headroom.mts [--rounds=7]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const ROUNDS = parseInt(process.argv.find((a) => a.startsWith('--rounds='))?.split('=')[1] ?? '7', 10);
const snapshot = JSON.parse(readFileSync('debug/bench-shader-snapshot.json', 'utf8'));
const baseFrag: string = snapshot.fragSrc;

function widen(frag: string, floats: number, vec4s: number): string {
  const decls: string[] = [];
  for (let i = 0; i < floats; i++) decls.push(`uniform float uHeadroomF${i};`);
  for (let i = 0; i < vec4s; i++) decls.push(`uniform vec4 uHeadroomV${i};`);
  const at = frag.indexOf('\nuniform ');
  return frag.slice(0, at + 1) + decls.join('\n') + '\n' + frag.slice(at + 1);
}

const VARIANTS: Record<string, string> = {
  base: baseFrag,
  plus30: widen(baseFrag, 24, 6),
  plus120: widen(baseFrag, 96, 24),
};

const VERT_SRC = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  vUv = (p + 1.0) * 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false, // real GPU (ANGLE/D3D11), never SwiftShader
    args: ['--disable-blink-features=AutomationControlled', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'],
  });
  const page = await (await browser.newContext({ viewport: { width: 320, height: 240 } })).newPage();
  await page.goto('about:blank');

  const results = await page.evaluate(
    async ({ variants, vertSrc, rounds }: { variants: Record<string, string>; vertSrc: string; rounds: number }) => {
      // tsx/esbuild keepNames helper is not defined inside the page context.
      (window as any).__name = (f: any) => f;
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 240;
      document.body.appendChild(canvas);
      const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' })!;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';

      const compileOnce = (frag: string, bust: string) => {
        const src = frag + `\n// bust-${bust}`;
        const t0 = performance.now();
        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, vertSrc + `\n// bust-${bust}`); gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, src); gl.compileShader(fs);
        const prog = gl.createProgram()!;
        gl.attachShader(prog, vs); gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          throw new Error('link failed: ' + gl.getProgramInfoLog(prog));
        }
        const activeUniforms = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        const ms = performance.now() - t0;
        gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
        return { ms, activeUniforms };
      };

      const names = Object.keys(variants);
      const times: Record<string, number[]> = Object.fromEntries(names.map((n) => [n, []]));
      const active: Record<string, number> = {};
      // Warm-up round (discarded — first D3D compile pays one-time driver costs).
      for (const n of names) compileOnce(variants[n], `warm-${n}`);
      for (let r = 0; r < rounds; r++) {
        // Rotate order each round so thermal/JIT drift doesn't bias one variant.
        const order = names.map((_, i) => names[(i + r) % names.length]);
        for (const n of order) {
          const { ms, activeUniforms } = compileOnce(variants[n], `r${r}-${n}`);
          times[n].push(ms);
          active[n] = activeUniforms;
        }
        await new Promise((res) => setTimeout(res, 50));
      }
      return { renderer, times, active };
    },
    { variants: VARIANTS, vertSrc: VERT_SRC, rounds: ROUNDS },
  );

  await browser.close();

  console.log(`renderer: ${results.renderer}`);
  console.log(`frag: ${baseFrag.length} chars, formula ${snapshot.formula}, ${ROUNDS} rounds (median of full compile+link)`);
  const baseMed = median(results.times.base);
  for (const [name, ts] of Object.entries(results.times)) {
    const med = median(ts as number[]);
    console.log(
      `${name.padEnd(8)} median ${med.toFixed(1)} ms  (min ${Math.min(...(ts as number[])).toFixed(1)}, max ${Math.max(...(ts as number[])).toFixed(1)})` +
      `  active uniforms: ${results.active[name]}` +
      (name === 'base' ? '' : `  Δ vs base: ${(med - baseMed >= 0 ? '+' : '')}${(med - baseMed).toFixed(1)} ms (${(((med - baseMed) / baseMed) * 100).toFixed(1)}%)`),
    );
  }
})();
