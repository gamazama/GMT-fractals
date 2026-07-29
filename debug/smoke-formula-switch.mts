/**
 * Smoke test for Phase A: formula registry + renderer plugin + live
 * formula switch via CompileGate.
 *
 * Verifies:
 *   1. Both formulas (Mandelbulb, Mandelbox) are registered + DDFS-lifted
 *      into the feature registry (slices exist on the store).
 *   2. Initial formula = 'Mandelbulb' and a WebGL program is live on the
 *      canvas — tested by reading back a non-black centre pixel.
 *   3. Switching state.formula to 'Mandelbox' triggers a shader rebuild
 *      through CompileGate, proven by the ACTIVE_UNIFORMS set swapping:
 *      uFoldLimit appears and uPower disappears, and the reverse on the
 *      way back. Both directions, presence AND absence.
 *
 * ⚠ Item 3 used to read "(IS_COMPILING event emitted) and the canvas continues
 * producing frames (framesRendered advances)". Neither was ever true as
 * coverage, measured 2026-07-29: `window.FractalEvents` is undefined on
 * fractal-toy.html (so the listener below never attaches), `__compileSeen` is
 * never read by any assertion, and `framesRendered` is not a store field here.
 * The uniform-set swap is what actually proves the rebuild, so that is what the
 * item now claims. The absence half was added at the same time — without it a
 * hypothetical assembler that emitted BOTH formulas' uniforms into one program
 * would satisfy every presence check. Measured disjoint on this tree:
 * Mandelbulb ends ...uPower, uPhaseTheta, uPhasePhi, uTwist, uRadiolaria*;
 * Mandelbox ends ...uScale, uMinRadius, uFoldLimit, uFixedRadius.
 *
 * Run:  ENGINE_URL=http://localhost:3400/fractal-toy.html npm run smoke:formula-switch
 */

import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fractal-toy.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Both formula slices present, initial formula is Mandelbulb.
    const initial = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        return {
            formula: s?.formula,
            hasMandelbulb: !!s?.mandelbulb && typeof s.mandelbulb.power === 'number',
            hasMandelbox:  !!s?.mandelbox  && typeof s.mandelbox.scale  === 'number',
            mbPower: s?.mandelbulb?.power,
            mxScale: s?.mandelbox?.scale,
        };
    });
    console.log('initial:', JSON.stringify(initial));
    if (initial.formula !== 'Mandelbulb') throw new Error(`initial formula should be 'Mandelbulb', got '${initial.formula}'`);
    if (!initial.hasMandelbulb) throw new Error('mandelbulb slice missing');
    if (!initial.hasMandelbox)  throw new Error('mandelbox slice missing');
    if (initial.mbPower !== 8.0) throw new Error(`mandelbulb.power should default 8.0, got ${initial.mbPower}`);
    if (initial.mxScale !== 2.0) throw new Error(`mandelbox.scale should default 2.0, got ${initial.mxScale}`);

    // 2. Canvas is producing non-black pixels at the centre.
    const centrePx = await page.evaluate(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return null;
        const gl = canvas.getContext('webgl2');
        if (!gl) return null;
        const w = canvas.width, h = canvas.height;
        const px = new Uint8Array(4);
        gl.readPixels(Math.floor(w / 2), Math.floor(h / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return { w, h, r: px[0], g: px[1], b: px[2] };
    });
    console.log('centre px (Mandelbulb):', centrePx);
    if (!centrePx) throw new Error('canvas / GL not ready');
    const bulbLum = centrePx.r + centrePx.g + centrePx.b;
    if (bulbLum < 10) throw new Error(`centre pixel too dark (${bulbLum}) — shader may not be compiling`);

    // Reads the CURRENT_PROGRAM's ACTIVE_UNIFORMS. Returns the whole list, not a
    // boolean, so a failure can print what the program actually carries.
    const activeUniformNames = () => page.evaluate(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const gl = canvas?.getContext('webgl2');
        const prog = gl?.getParameter(gl.CURRENT_PROGRAM);
        if (!gl || !prog) return null;
        const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        const out: string[] = [];
        for (let i = 0; i < n; i++) out.push(gl.getActiveUniform(prog, i)!.name);
        return out;
    });

    const bulbUniforms = await activeUniformNames();
    if (!bulbUniforms) throw new Error('no CURRENT_PROGRAM before the switch — nothing is bound');
    if (bulbUniforms.includes('uFoldLimit')) {
        throw new Error(`Mandelbox's uFoldLimit is live while Mandelbulb is selected — the programs are not disjoint, so every presence check below is satisfiable by a superset program: ${bulbUniforms.join(', ')}`);
    }

    // 3. Switch formula.
    //
    // @stale The block below is DEAD and is left in place only so the next
    // reader does not re-add it. Measured 2026-07-29: `window.FractalEvents` is
    // undefined on fractal-toy.html, so `fe.on` never runs and no listener is
    // attached; `window.__fractalEvents` is undefined too; and `__compileSeen`
    // is not read by any assertion in this file. Removing it is a deletion, so
    // it is left for the owner. The rebuild is proven by the uniform-set swap.
    await page.evaluate(() => {
        (window as any).__compileSeen = false;
        const evt = (window as any).__fractalEvents ?? null;
        // Fall back to monkey-patching compileGate via store's FractalEvents
        const fe = (window as any).FractalEvents;
        if (fe && fe.on) fe.on('is_compiling', () => { (window as any).__compileSeen = true; });
    });

    await page.evaluate(() => {
        (window as any).__store.setState({ formula: 'Mandelbox' });
    });
    await page.waitForTimeout(800);

    const afterSwitch = await page.evaluate(() => {
        const s = (window as any).__store?.getState?.();
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const gl = canvas.getContext('webgl2');
        const w = canvas.width, h = canvas.height;
        const px = new Uint8Array(4);
        gl!.readPixels(Math.floor(w / 2), Math.floor(h / 2), 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, px);
        return {
            formula: s?.formula,
            r: px[0], g: px[1], b: px[2],
        };
    });
    console.log('after switch (Mandelbox):', JSON.stringify(afterSwitch));
    if (afterSwitch.formula !== 'Mandelbox') throw new Error(`formula did not update: '${afterSwitch.formula}'`);
    const boxLum = afterSwitch.r + afterSwitch.g + afterSwitch.b;
    if (boxLum < 10) throw new Error(`centre pixel too dark after switch (${boxLum}) — rebuild may have failed`);

    // Also verify mandelbox's uniforms actually reached the GL program
    // by confirming a uniform-name lookup resolves to a location.
    const hasBoxUniform = await page.evaluate(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const gl = canvas.getContext('webgl2');
        // Walk the GL ACTIVE_UNIFORMS and look for the formula-specific name.
        const prog = gl!.getParameter(gl!.CURRENT_PROGRAM);
        if (!prog) return false;
        const n = gl!.getProgramParameter(prog, gl!.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
            const info = gl!.getActiveUniform(prog, i);
            if (info?.name === 'uFoldLimit') return true;
        }
        return false;
    });
    if (!hasBoxUniform) throw new Error('uFoldLimit uniform missing — Mandelbox shader did not install');

    // ...and the OLD formula's uniform is gone. Presence alone would pass on a
    // program that merged both formulas; this is what proves a real swap.
    const boxUniforms = await activeUniformNames();
    if (!boxUniforms) throw new Error('no CURRENT_PROGRAM after the switch to Mandelbox');
    if (boxUniforms.includes('uPower')) {
        throw new Error(`Mandelbulb's uPower is still live after switching to Mandelbox — the old program was not replaced: ${boxUniforms.join(', ')}`);
    }

    // Switch back to Mandelbulb — verify bulb uniform reappears.
    await page.evaluate(() => {
        (window as any).__store.setState({ formula: 'Mandelbulb' });
    });
    await page.waitForTimeout(800);

    const hasBulbUniform = await page.evaluate(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const gl = canvas.getContext('webgl2');
        const prog = gl!.getParameter(gl!.CURRENT_PROGRAM);
        if (!prog) return false;
        const n = gl!.getProgramParameter(prog, gl!.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
            const info = gl!.getActiveUniform(prog, i);
            if (info?.name === 'uPower') return true;
        }
        return false;
    });
    if (!hasBulbUniform) throw new Error('uPower uniform missing after switch back — rebuild failed');

    const backUniforms = await activeUniformNames();
    if (!backUniforms) throw new Error('no CURRENT_PROGRAM after switching back to Mandelbulb');
    if (backUniforms.includes('uFoldLimit')) {
        throw new Error(`Mandelbox's uFoldLimit is still live after switching back — the rebuild did not drop it: ${backUniforms.join(', ')}`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log('\n✓ formula registry + renderer plugin + live switch all working');
    await browser.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
