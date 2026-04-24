/**
 * Smoke test for @engine/migrations + fluid-toy's tab-parity
 * restructure migration.
 *
 * Synthesise a preset in the OLD shape (pre-restructure: `dye` slice
 * with collision*, dyeMix, dyeInject etc., separate `orbit` and
 * `sceneCamera` slices, fluidSim owning forceMode). Call loadPreset
 * with it. Verify the fields land in their NEW slices after the
 * migration layer runs.
 */
import { launchWebglTestPage } from './helpers/webglHarness';

const URL = process.env.ENGINE_URL || 'http://localhost:3400/fluid-toy.html';

async function main() {
    const { page, browser, assertNoFatalErrors } = await launchWebglTestPage({ url: URL });

    // Build a preset that predates the tab-parity restructure.
    const oldShapePreset = {
        formula: 'JuliaFluid',
        name: 'migration-probe',
        features: {
            julia: { kind: 0, juliaC: { x: 0.123, y: -0.456 }, maxIter: 200, power: 2 },
            dye: {
                // Fields that should stay on palette post-rename:
                gradient: undefined,
                colorMapping: 3,
                gradientRepeat: 2.1,
                // Fields that should MOVE to collision:
                collisionEnabled: true,
                collisionRepeat: 2,
                collisionPhase: 0.1,
                // Fields that should MOVE to composite:
                dyeMix: 1.4,
                // Fields that should MOVE to fluidSim:
                dyeInject: 2.2,
                dyeDissipation: 1.8,
                dyeDecayMode: 2,
            },
            fluidSim: {
                vorticity: 30,
                pressureIters: 55,
                // Fields that should MOVE to coupling:
                forceMode: 2,
                forceGain: -900,
                interiorDamp: 0.7,
                edgeMargin: 0.05,
            },
            // Orbit + sceneCamera are standalone; their fields should merge into coupling / julia.
            orbit: { enabled: true, radius: 0.123, speed: 0.5 },
            sceneCamera: { center: { x: 0.25, y: -0.1 }, zoom: 3.2 },
        },
    };

    await page.evaluate((preset: any) => {
        (window as any).__store.getState().loadPreset(preset);
    }, oldShapePreset);
    await page.waitForTimeout(200);

    const state = await page.evaluate(() => {
        const s = (window as any).__store.getState();
        return {
            julia_center: s.julia?.center,
            julia_zoom:   s.julia?.zoom,
            palette_colorMapping: s.palette?.colorMapping,
            palette_gradientRepeat: s.palette?.gradientRepeat,
            collision_enabled: s.collision?.enabled,
            collision_repeat:  s.collision?.repeat,
            collision_phase:   s.collision?.phase,
            composite_dyeMix:  s.composite?.dyeMix,
            fluidSim_dyeInject:     s.fluidSim?.dyeInject,
            fluidSim_dyeDissipation: s.fluidSim?.dyeDissipation,
            fluidSim_dyeDecayMode:   s.fluidSim?.dyeDecayMode,
            coupling_forceMode:   s.coupling?.forceMode,
            coupling_forceGain:   s.coupling?.forceGain,
            coupling_interiorDamp: s.coupling?.interiorDamp,
            coupling_edgeMargin:  s.coupling?.edgeMargin,
            coupling_orbitEnabled: s.coupling?.orbitEnabled,
            coupling_orbitRadius:  s.coupling?.orbitRadius,
            coupling_orbitSpeed:   s.coupling?.orbitSpeed,
            // These should no longer exist on old slices:
            stale_dye: (window as any).__store.getState().dye,
            stale_orbit: (window as any).__store.getState().orbit,
            stale_sceneCamera: (window as any).__store.getState().sceneCamera,
        };
    });
    console.log('post-migration state:', JSON.stringify(state, null, 2));

    const expected = {
        julia_center: { x: 0.25, y: -0.1 },
        julia_zoom: 3.2,
        palette_colorMapping: 3,
        palette_gradientRepeat: 2.1,
        collision_enabled: true,
        collision_repeat: 2,
        collision_phase: 0.1,
        composite_dyeMix: 1.4,
        fluidSim_dyeInject: 2.2,
        fluidSim_dyeDissipation: 1.8,
        fluidSim_dyeDecayMode: 2,
        coupling_forceMode: 2,
        coupling_forceGain: -900,
        coupling_interiorDamp: 0.7,
        coupling_edgeMargin: 0.05,
        coupling_orbitEnabled: true,
        coupling_orbitRadius: 0.123,
        coupling_orbitSpeed: 0.5,
    };

    for (const [k, v] of Object.entries(expected)) {
        const got = (state as any)[k];
        const ok = typeof v === 'number'
            ? Math.abs(got - v) < 1e-6
            : typeof v === 'object'
                ? JSON.stringify(got) === JSON.stringify(v)
                : got === v;
        if (!ok) throw new Error(`after migration: ${k} expected ${JSON.stringify(v)}, got ${JSON.stringify(got)}`);
    }

    assertNoFatalErrors();
    console.log('\n✅ Slice migrations land all fields on their new slices');
    await browser.close();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
