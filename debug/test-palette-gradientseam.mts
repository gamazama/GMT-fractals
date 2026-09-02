/**
 * Guard: palette/core/gradientSeam — the ONE conversion point from a picked or
 * built gradient into GMT's colouring and sky slots.
 *
 * The seam encodes three contracts nothing else pins, and a swapped colour
 * space miscolours every applied gradient without any error:
 *   [1] a preset entry's stops pass through untouched, tagged `linear` +
 *       `oklab` — the fractal shader wants LINEAR radiance and
 *       generateGradientTextureBuffer linearises sRGB stops when baking;
 *   [2] a loaded entry (ramp only) is fitted to stops, tagged `linear`, and
 *       the fit is capped at SEAM_MAX_STOPS = 128 — high enough that a
 *       banded palette keeps a stop per band edge (32 used to smear them);
 *   [3] applyGradientConfig FORCES `linear` whatever the config says (a
 *       favourite often stores `srgb`), routes layer 2 to `gradient2`, and
 *       returns false with no coloring feature (the standalone studio);
 *   [4] applyEnvGradient FORCES `srgb` — the sky gradient is a DISPLAYED
 *       colour, not radiance — writes `materials.envGradientStops`, and
 *       returns false with no materials feature.
 *
 * Runs against the real engineStore with the two feature setters stubbed in
 * by setState, so what is asserted is exactly the object the seam hands the
 * feature. Until 2026-09-02 gradientSeam.ts was reachable from no harness at
 * all (overnight audit, cycle 12).
 *
 * Run: `npm run test:palette-gradientseam` (also the last link of `test:palette`)
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   `applyGradientConfig` forcing `'srgb'` instead of `'linear'`: [3] red
 *   on both layers and on applyEntryToColoring; [1], [2], [4] green.
 *   `SEAM_MAX_STOPS` set to 8: [2] red ("64-band ramp fitted to 8 stops,
 *   expected at least 64"), everything else green.
 */
import { entryToGradientConfig, applyGradientConfig, applyEntryToColoring, applyEnvGradient } from '../palette/core/gradientSeam';
import { useEngineStore } from '../store/engineStore';
import type { CatalogEntry } from '../palette/core/presetCatalog';
import type { GradientConfig, GradientStop } from '../types/graphics';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.log(`  ✗ ${m}`); };
const check = (cond: boolean, msg: string) => (cond ? ok(msg) : fail(msg));

const stop = (id: string, position: number, color: string): GradientStop => ({ id, position, color });
const entry = (partial: Partial<CatalogEntry>): CatalogEntry =>
    ({ id: 'e', name: 'e', facets: {}, ramp: new Uint8Array(256 * 4), ...partial } as unknown as CatalogEntry);

/** 256 RGBA texels in `bands` hard-edged bands of distinct hues. */
const bandedRamp = (bands: number): Uint8Array => {
    const buf = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
        const band = Math.floor((i / 256) * bands);
        const h = (band / bands) * 6;
        const x = 1 - Math.abs((h % 2) - 1);
        const [r, g, b] = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x];
        buf.set([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255], i * 4);
    }
    return buf;
};

console.log('[1] preset entry: stops pass through, tagged linear + oklab');
{
    const stops = [stop('a', 0, '#ff0000'), stop('b', 0.5, '#00ff00'), stop('c', 1, '#0000ff')];
    const cfg = entryToGradientConfig(entry({ stops }));
    check(cfg.stops === stops, 'stops are passed through as the same array (no refit, no copy)');
    check(cfg.colorSpace === 'linear', `colorSpace is linear (got ${cfg.colorSpace})`);
    check(cfg.blendSpace === 'oklab', `blendSpace is oklab (got ${cfg.blendSpace})`);
}

console.log('\n[2] loaded entry: ramp is fitted to stops, linear, capped at 128');
{
    const cfg = entryToGradientConfig(entry({ stops: undefined, ramp: bandedRamp(64) }));
    check(cfg.colorSpace === 'linear', `fitted config is linear (got ${cfg.colorSpace})`);
    check(cfg.stops.length >= 64, `64-band ramp fitted to ${cfg.stops.length} stops, expected at least 64 (one per band edge)`);
    check(cfg.stops.length <= 128, `fit respects SEAM_MAX_STOPS = 128 (got ${cfg.stops.length})`);
    const empty = entryToGradientConfig(entry({ stops: [], ramp: bandedRamp(4) }));
    check(empty.stops.length > 0, 'an entry with an EMPTY stops array falls back to fitting its ramp');
}

console.log('\n[3] applyGradientConfig forces linear, routes layers, no-ops without coloring');
{
    const calls: Array<Record<string, any>> = [];
    useEngineStore.setState({ setColoring: (u: Record<string, any>) => { calls.push(u); } } as any);
    const stops = [stop('a', 0, '#000000'), stop('b', 1, '#ffffff')];
    const srgb: GradientConfig = { stops, colorSpace: 'srgb', blendSpace: 'hsv' };
    check(applyGradientConfig(srgb) === true, 'returns true with a coloring feature');
    check(calls[0]?.gradient?.colorSpace === 'linear', `layer 1 write forced to linear (got ${calls[0]?.gradient?.colorSpace})`);
    check(calls[0]?.gradient?.blendSpace === 'hsv', 'blendSpace is preserved');
    check(calls[0]?.gradient?.stops === stops, 'stops are passed through untouched');
    check(!('gradient2' in (calls[0] ?? {})), 'layer 1 does not touch gradient2');
    applyGradientConfig(srgb, 2);
    check(calls[1]?.gradient2?.colorSpace === 'linear' && !('gradient' in (calls[1] ?? {})), 'layer 2 writes gradient2 only, forced to linear');
    applyEntryToColoring(entry({ stops }));
    check(calls[2]?.gradient?.colorSpace === 'linear' && calls[2]?.gradient?.stops === stops, 'applyEntryToColoring goes through the same path');
    useEngineStore.setState({ setColoring: undefined } as any);
    const before = calls.length;
    check(applyGradientConfig(srgb) === false && calls.length === before, 'returns false and writes nothing without a coloring feature');
}

console.log('\n[4] applyEnvGradient forces srgb into materials.envGradientStops');
{
    const calls: Array<Record<string, any>> = [];
    useEngineStore.setState({ setMaterials: (u: Record<string, any>) => { calls.push(u); } } as any);
    const stops = [stop('a', 0, '#87ceeb'), stop('b', 1, '#ffffff')];
    const linear: GradientConfig = { stops, colorSpace: 'linear', blendSpace: 'oklab' };
    check(applyEnvGradient(linear) === true, 'returns true with a materials feature');
    check(calls[0]?.envGradientStops?.colorSpace === 'srgb', `env write forced to srgb (got ${calls[0]?.envGradientStops?.colorSpace})`);
    check(calls[0]?.envGradientStops?.stops === stops, 'stops are passed through untouched');
    useEngineStore.setState({ setMaterials: undefined } as any);
    check(applyEnvGradient(linear) === false && calls.length === 1, 'returns false and writes nothing without a materials feature');
}

console.log(failures === 0 ? '\nPASS — the GMT gradient seam holds its colour-space contracts' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
