/**
 * Smoke test for the fluid-toy Presets tab.
 *
 * Opens the "Presets" panel via togglePanel (docked on the right), waits
 * for the preset grid chips to appear, clicks "Coral Gyre", and asserts
 * that a handful of signature fields now match that preset's expected
 * values across four slices (julia, coupling, palette, postFx).
 *
 * Proves the translate-and-dispatch path in `presets/apply.ts` reaches
 * every slice correctly without preset serialization.
 */
import { chromium } from 'playwright';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Click the right-dock "Presets" tab header to make it the active
    // panel. togglePanel via the store set isOpen but the tab bar itself
    // is the authoritative interaction — the component only mounts once
    // the dock believes that tab is active.
    await page.locator('button[data-tut="tab-Presets"]').click({ force: true });
    await page.waitForTimeout(500);

    // Click "Coral Gyre" — first chip in the grid.
    const chip = page.locator('button', { hasText: 'Coral Gyre' }).first();
    await chip.waitFor({ timeout: 4000 });
    await chip.click({ force: true });
    await page.waitForTimeout(400);

    const state = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            kind:          s.julia.kind,
            juliaCx:       s.julia.juliaC?.x,
            maxIter:       s.julia.maxIter,
            forceMode:     s.coupling.forceMode,
            forceGain:     s.coupling.forceGain,
            orbitEnabled:  s.coupling.orbitEnabled,
            colorMapping:  s.palette.colorMapping,
            colorIter:     s.palette.colorIter,
            dyeBlend:      s.palette.dyeBlend,
            show:          s.composite.show,
            toneMapping:   s.postFx.toneMapping,
            bloom:         s.postFx.bloomAmount,
            collisionOn:   s.collision.enabled,
        };
    });

    // Expected values from toy-fluid/presets.ts#coral-gyre, translated:
    // kind: 'julia' → 0
    // juliaC.x ≈ -0.8174
    // maxIter: 182
    // forceMode: 'curl' → 1
    // forceGain: -760
    // orbit: omitted → disabled
    // colorMapping: 'orbit-point' → 5
    // colorIter: 96
    // dyeBlend: 'add' → 0
    // show: 'composite' → 0
    // toneMapping: 'filmic' → 3
    // bloomAmount: 1.35
    // collisionEnabled: true
    const expected = {
        kind: 0, juliaCx: -0.8173594132029339, maxIter: 182,
        forceMode: 1, forceGain: -760, orbitEnabled: false,
        colorMapping: 5, colorIter: 96, dyeBlend: 0,
        show: 0, toneMapping: 3, bloom: 1.35, collisionOn: true,
    };

    for (const [k, v] of Object.entries(expected)) {
        const got = (state as any)[k];
        const ok = typeof v === 'number'
            ? Math.abs(got - (v as number)) < 1e-6
            : got === v;
        if (!ok) throw new Error(`Coral Gyre apply mismatch on ${k}: expected ${JSON.stringify(v)} got ${JSON.stringify(got)}`);
    }

    if (errors.length > 0) {
        const fatal = errors.filter((e) => /TypeError|ReferenceError|\bis not a function\b/.test(e));
        if (fatal.length > 0) throw new Error('page errors during preset apply:\n  ' + errors.join('\n  '));
    }

    console.log('\n✅ Preset grid + translate-and-dispatch path works — Coral Gyre landed in every slice');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
