/**
 * Smoke test for the unified undo plugin.
 *
 * Verifies the chain end-to-end:
 *   1. handleInteractionStart('param') captures a snapshot
 *   2. Mutating feature state via a DDFS setter changes the value
 *   3. handleInteractionEnd() pushes a transaction iff the diff is non-empty
 *   4. undo() restores the pre-interaction state
 *   5. redo() re-applies the post-interaction state
 *   6. Scoped variants (undo('param'), undo('camera')) honor the scope filter
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Initial state
    const initialPower = await page.evaluate(() => (window as any).__store.getState().julia.power);
    console.log('initial julia.power:', initialPower);

    // Simulate a param interaction: start, mutate, end.
    await page.evaluate((base: number) => {
        const s = (window as any).__store.getState();
        s.handleInteractionStart('param');
        s.setJulia({ power: base + 2 });
        s.handleInteractionEnd();
    }, initialPower);
    await page.waitForTimeout(100);

    const afterMutate = await page.evaluate(() => (window as any).__store.getState().julia.power);
    console.log('after mutate:', afterMutate);
    if (Math.abs(afterMutate - (initialPower + 2)) > 1e-6) {
        throw new Error(`mutation did not land (want ${initialPower + 2}, got ${afterMutate})`);
    }

    // Undo stack should have 1 entry with scope='param'
    const stack1 = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            undoDepth: s.undoStack.length,
            canUndo: s.canUndo(),
            canRedo: s.canRedo(),
            topScope: s.peekUndo()?.scope,
        };
    });
    console.log('after mutate stack:', JSON.stringify(stack1));
    if (stack1.undoDepth !== 1) throw new Error(`expected 1 transaction on stack, got ${stack1.undoDepth}`);
    if (!stack1.canUndo) throw new Error('canUndo should be true');
    if (stack1.topScope !== 'param') throw new Error(`top scope should be 'param', got ${stack1.topScope}`);

    // Undo
    await page.evaluate(() => (window as any).__store.getState().undo());
    await page.waitForTimeout(100);
    const afterUndo = await page.evaluate(() => (window as any).__store.getState().julia.power);
    console.log('after undo:', afterUndo);
    if (Math.abs(afterUndo - initialPower) > 1e-6) {
        throw new Error(`undo did not restore (want ${initialPower}, got ${afterUndo})`);
    }

    // Redo
    await page.evaluate(() => (window as any).__store.getState().redo());
    await page.waitForTimeout(100);
    const afterRedo = await page.evaluate(() => (window as any).__store.getState().julia.power);
    console.log('after redo:', afterRedo);
    if (Math.abs(afterRedo - (initialPower + 2)) > 1e-6) {
        throw new Error(`redo did not restore (want ${initialPower + 2}, got ${afterRedo})`);
    }

    // Scoped undo — filter to 'animation' should be a no-op when the only tx is 'param'.
    await page.evaluate(() => (window as any).__store.getState().undo('animation'));
    await page.waitForTimeout(50);
    const afterScopedNo = await page.evaluate(() => (window as any).__store.getState().julia.power);
    if (Math.abs(afterScopedNo - afterRedo) > 1e-6) {
        throw new Error(`undo('animation') should no-op when only param txs exist; power changed`);
    }

    // Scoped undo — 'param' should match
    await page.evaluate(() => (window as any).__store.getState().undo('param'));
    await page.waitForTimeout(100);
    const afterScoped = await page.evaluate(() => (window as any).__store.getState().julia.power);
    if (Math.abs(afterScoped - initialPower) > 1e-6) {
        throw new Error(`undo('param') should have restored (want ${initialPower}, got ${afterScoped})`);
    }

    if (errors.length > 0) {
        throw new Error('page errors during smoke:\n  ' + errors.join('\n  '));
    }

    console.log(`\n✓ undo chain: initial=${initialPower.toFixed(2)} → mutate=${afterMutate.toFixed(2)} → undo=${afterUndo.toFixed(2)} → redo=${afterRedo.toFixed(2)} → scoped undo=${afterScoped.toFixed(2)}`);
    await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
