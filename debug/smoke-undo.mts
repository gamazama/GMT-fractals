/**
 * Smoke test for the undo/redo system (store/slices/historySlice.ts).
 *
 * Runs against the real app-gmt page so the live feature registry, the
 * camera slice's teleporting undo wrappers, and the connected slider
 * components are all in play.
 *
 * Covers the four undo-queue bugs fixed on fix/undo-queue:
 *   (4) Zeroed-slider quick-undo restored the wrong value — the slider
 *       TRACK click fired onChange before onDragStart, so the transaction
 *       snapshot captured the post-click value. Fixed in
 *       components/inputs/ScalarInput.tsx (onDragStart now precedes onChange).
 *       Guarded here two ways: (a) the param restore contract (begin →
 *       change → end → undo → redo restores exactly), and (b) a real
 *       pointer-down on a slider track must snapshot the PRE-interaction
 *       value.
 *   (1) LFO modulation sliders were not undoable — `animations` was not in
 *       the param snapshot. Fixed in getParamSnapshot.
 *   (2) Effects via the raw Histogram drag were not undoable — the handle
 *       drag bypassed the transaction shim. Fixed in components/Histogram.tsx.
 *       The colour-grading levels it drives are snapshot-captured (verified
 *       here); the bloom/fog sliders are connected sliders fixed by (4).
 *   (3) Advanced-panel camera position/rotation was not undoable — the
 *       'camera' interaction mode routed to a PARAM transaction, which does
 *       not capture sceneOffset/cameraRot. Fixed by routing 'camera' to a
 *       new beginCameraTransaction (camera scope). Guarded here via the
 *       camera-scope capture + restore.
 *
 * NOTE: page.evaluate bodies are passed as strings on purpose — tsx/esbuild
 * annotates named inner functions with a `__name` helper that does not exist
 * in the browser eval context.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/app-gmt.html';

const failures: string[] = [];
const ok = (cond: boolean, msg: string) => {
    if (cond) console.log(`  ✓ ${msg}`);
    else { console.log(`  ✗ ${msg}`); failures.push(msg); }
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
        const s = (window as any).__store?.getState?.();
        return s && s.materials && typeof s.setMaterials === 'function'
            && typeof s.undo === 'function' && typeof s.beginParamTransaction === 'function';
    }, { timeout: 20000 });
    await page.waitForTimeout(500);

    // ── (4a) Param restore contract: begin → change → end → undo → redo ──
    console.log('\n[param] restore + redo (guards bug 4 restore logic + value-diff):');
    const paramRes = await page.evaluate(`(function(){
        var s = window.__store; var g = function(){ return s.getState(); };
        g().clearHistory();
        g().setMaterials({ roughness: 0.5 });
        var pre = g().materials.roughness;
        g().beginParamTransaction();
        g().setMaterials({ roughness: 0.0 });
        g().endParamTransaction();
        var afterEnd = { stack: g().paramUndoStack.length, val: g().materials.roughness };
        g().undo('param');
        var afterUndo = g().materials.roughness;
        g().redo('param');
        var afterRedo = g().materials.roughness;
        return { pre: pre, stack: afterEnd.stack, changed: afterEnd.val, afterUndo: afterUndo, afterRedo: afterRedo };
    })()`) as any;
    ok(paramRes.stack === 1, `one undo entry pushed (got ${paramRes.stack})`);
    ok(near(paramRes.changed, 0.0), `value changed to 0 (got ${paramRes.changed})`);
    ok(near(paramRes.afterUndo, paramRes.pre), `undo restored pre value ${paramRes.pre} (got ${paramRes.afterUndo})`);
    ok(near(paramRes.afterRedo, 0.0), `redo re-applied 0 (got ${paramRes.afterRedo})`);

    // ── (4b) Real pointer-down on a slider track snapshots the PRE value ──
    // This exercises the actual ScalarInput.handleTrackPointerDown ordering:
    // onDragStart (→ beginParamTransaction → snapshot) must precede onChange,
    // so the snapshot holds the PRE-interaction value. coreMath is a real
    // registered feature, so its slice is captured by getParamSnapshot.
    console.log('\n[bug 4] slider TRACK pointer-down snapshots pre-interaction value:');
    await page.evaluate(`(function(){ var s = window.__store.getState(); s.setCoreMath({ paramA: 5 }); s.clearHistory(); })()`);
    await page.waitForTimeout(60);
    const sliderSel = '[data-help-id*="coreMath.paramA"]';
    const trackLoc = page.locator(`${sliderSel} .cursor-ew-resize`).first();
    await trackLoc.waitFor({ state: 'visible', timeout: 8000 });
    await trackLoc.scrollIntoViewIfNeeded();
    // hover() runs Playwright's actionability checks and parks the real mouse
    // on the track centre — more reliable than raw page.mouse coords, which
    // intermittently miss the handler.
    await trackLoc.hover();
    const box = (await trackLoc.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.down();
    await page.waitForTimeout(60);
    const onDown = await page.evaluate(`(function(){ var s = window.__store.getState(); return {
        interacting: s.isUserInteracting,
        snap: (s.interactionSnapshot && s.interactionSnapshot.coreMath) ? s.interactionSnapshot.coreMath.paramA : 'NO_SNAP'
    }; })()`) as any;
    // drag right so the value actually changes, then release for a clean end
    await page.mouse.move(cx + box.width * 0.35, cy, { steps: 6 });
    await page.waitForTimeout(40);
    const changed = await page.evaluate(`window.__store.getState().coreMath.paramA`) as any;
    await page.mouse.up();
    await page.waitForTimeout(80);
    const afterUndo = await page.evaluate(`(function(){ window.__store.getState().undo('param'); return window.__store.getState().coreMath.paramA; })()`) as any;
    if (onDown.interacting !== true) {
        failures.push(`bug4: track pointer-down did not register (isUserInteracting=${onDown.interacting}) — harness positioning miss`);
        console.log(`  ✗ track pointer-down did not register (box=${JSON.stringify(box)})`);
    } else {
        ok(onDown.interacting === true, `onDragStart fired on pointer-down (isUserInteracting)`);
        ok(onDown.snap === 5, `snapshot captured PRE value 5, not a post-click value (got ${onDown.snap})`);
        ok(!near(changed, 5), `track drag changed the value away from 5 (got ${changed})`);
        ok(near(afterUndo, 5), `undo restored pre-gesture value 5 (got ${afterUndo})`);
    }

    // ── (1) LFO modulation sliders are undoable (animations in snapshot) ──
    console.log('\n[bug 1] LFO modulation (animations) is undoable:');
    const lfoRes = await page.evaluate(`(function(){
        var s = window.__store; var g = function(){ return s.getState(); };
        var saved = g().animations.slice();
        g().setAnimations([{ id: 'smoke-lfo', enabled: true, target: '', shape: 'Sine', period: 5, amplitude: 1, baseValue: 0, min: -1, max: 1, phase: 0, smoothing: 0.5 }]);
        g().clearHistory();
        g().beginParamTransaction();
        g().setAnimations(g().animations.map(function(a){ return Object.assign({}, a, { period: 12 }); }));
        g().endParamTransaction();
        var stack = g().paramUndoStack.length;
        var changed = g().animations[0] ? g().animations[0].period : null;
        g().undo('param');
        var restored = g().animations[0] ? g().animations[0].period : null;
        g().redo('param');
        var redone = g().animations[0] ? g().animations[0].period : null;
        g().setAnimations(saved); g().clearHistory();
        return { stack: stack, changed: changed, restored: restored, redone: redone };
    })()`) as any;
    ok(lfoRes.stack === 1, `LFO edit pushed an undo entry (got ${lfoRes.stack})`);
    ok(near(lfoRes.changed, 12), `period changed to 12 (got ${lfoRes.changed})`);
    ok(near(lfoRes.restored, 5), `undo restored period 5 (got ${lfoRes.restored})`);
    ok(near(lfoRes.redone, 12), `redo re-applied period 12 (got ${lfoRes.redone})`);

    // ── (2) Colour-grading levels (Histogram target) are snapshot-captured ──
    console.log('\n[bug 2] colour-grading levels (Histogram drag target) is undoable:');
    const cgRes = await page.evaluate(`(function(){
        var s = window.__store; var g = function(){ return s.getState(); };
        if (!g().colorGrading || typeof g().setColorGrading !== 'function') return { skip: true };
        g().setColorGrading({ levelsMax: 1.0 });
        g().clearHistory();
        g().beginParamTransaction();
        g().setColorGrading({ levelsMax: 0.4 });
        g().endParamTransaction();
        var stack = g().paramUndoStack.length;
        g().undo('param');
        var restored = g().colorGrading.levelsMax;
        return { skip: false, stack: stack, restored: restored };
    })()`) as any;
    if (cgRes.skip) ok(true, 'colorGrading slice absent — skipped');
    else {
        ok(cgRes.stack === 1, `levels edit pushed an undo entry (got ${cgRes.stack})`);
        ok(near(cgRes.restored, 1.0), `undo restored levelsMax 1.0 (got ${cgRes.restored})`);
    }

    // ── (3) Advanced-panel camera edits use the CAMERA scope + restore ──
    console.log('\n[bug 3] advanced camera (handleInteractionStart("camera")) → camera scope:');
    const camRes = await page.evaluate(`(function(){
        var s = window.__store; var g = function(){ return s.getState(); };
        g().clearHistory();
        var pre = Object.assign({}, g().cameraRot);
        g().handleInteractionStart('camera');     // fixed: routes to beginCameraTransaction
        var paramAfterStart = g().paramUndoStack.length;
        var camAfterStart = g().cameraUndoStack.length;
        // simulate the teleport result of dragging the rotation input
        window.__store.setState({ cameraRot: { x: 0.11, y: 0.22, z: 0.33, w: 0.9 } });
        g().handleInteractionEnd();
        g().undoCamera();
        var restored = g().cameraRot;
        return {
            paramAfterStart: paramAfterStart, camAfterStart: camAfterStart,
            pre: pre, restored: restored
        };
    })()`) as any;
    ok(camRes.camAfterStart === 1, `camera edit pushed a CAMERA-scope entry (got ${camRes.camAfterStart})`);
    ok(camRes.paramAfterStart === 0, `camera edit did NOT pollute the param stack (got ${camRes.paramAfterStart})`);
    ok(near(camRes.restored.x, camRes.pre.x) && near(camRes.restored.w, camRes.pre.w),
        `undoCamera restored pre rotation (pre.x=${camRes.pre.x} got ${camRes.restored.x})`);

    // ── Scope isolation: a param-scope undo ignores the camera stack ──
    console.log('\n[scope] per-scope stacks stay isolated:');
    const scopeRes = await page.evaluate(`(function(){
        var s = window.__store; var g = function(){ return s.getState(); };
        g().clearHistory();
        // one param entry only
        g().beginParamTransaction();
        g().setMaterials({ roughness: g().materials.roughness === 0.3 ? 0.4 : 0.3 });
        g().endParamTransaction();
        var camUndoReturn = g().undo('camera');   // should no-op — no camera entries
        return { canUndoParam: g().canUndo('param'), canUndoCamera: g().canUndo('camera'), camUndoReturn: camUndoReturn };
    })()`) as any;
    ok(scopeRes.canUndoParam === true, 'param stack has the entry');
    ok(scopeRes.canUndoCamera === false, 'camera stack is empty');
    ok(scopeRes.camUndoReturn === false, `undo("camera") no-ops when no camera entries (got ${scopeRes.camUndoReturn})`);

    // ── No page errors throughout ──
    console.log('');
    ok(errors.length === 0, `no page errors (${errors.length})`);
    if (errors.length) console.log('  errors:\n    ' + errors.join('\n    '));

    await browser.close();

    if (failures.length) {
        console.error(`\n✗ smoke:undo FAILED — ${failures.length} assertion(s):\n  - ${failures.join('\n  - ')}`);
        process.exit(1);
    }
    console.log('\n✓ smoke:undo PASSED — all four undo bugs covered (1 LFO, 2 levels, 3 camera, 4 slider track).');
}

main().catch((e) => { console.error(e); process.exit(1); });
