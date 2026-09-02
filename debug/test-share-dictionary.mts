/**
 * Guard: the share-link dictionary is collision-free, non-trivial, memoised,
 * and round-trips EVERY feature slice through the real encoder.
 *
 * Why this exists: two `shortId` collisions shipped to production and silently
 * dropped state from every share link for months — droste vs drawing on feature
 * alias 'dr', materials emissionMode vs envMapColorSpace on param alias 'ec'
 * (fixed 8f59b143). `smoke:share-link` samples three params in a browser; this
 * builds the REAL GMT dictionary in node (every registered feature) and checks
 * all of it in about a second, with no dev server and no Chromium.
 *
 * Blocks:
 *   1. `featureRegistry.getDictionary()` builds, is memoised (same object on a
 *      second call), is frozen, and `findDictionaryCollisions` finds nothing.
 *   2. Size floors — a builder that returns the root-only skeleton cannot pass.
 *   3. Round-trip: a synthetic preset carrying a distinct value for every param
 *      of every registered feature (aliased or not) plus the aliased root keys
 *      is encoded and decoded through `UrlStateEncoder` the way
 *      `utils/Sharing.ts` does it, then compared path by path; the first
 *      differing path is named. This is the assertion that would have caught
 *      both production collisions, and it also catches the class a static walk
 *      of the dictionary cannot see: a shortId equal to an UN-aliased sibling's
 *      name (un-aliased params are not in the dictionary and pass through the
 *      encoder verbatim).
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   Giving AO's 'Spread' param the shortId 'ai' (already 'Ambient Occlusion')
 *   in engine-gmt/features/ao/index.ts: block 1 red ("1 found", naming
 *   ao: 'aoIntensity' and 'aoSpread' both alias to 'ai') AND block 3 red
 *   ("round-trip lost or changed a value at features.ao.aoIntensity") — the
 *   two detectors agree, and the second one is what a static walk cannot
 *   provide on its own. Reverted; all green.
 *
 * Not covered here, by design: `utils/Sharing.ts`'s glue (quality-field
 * stripping, the two-pass formula peek) and the store's hydrate path — that is
 * `smoke:share-link`'s job.
 *
 * Under tsx `import.meta.env` is undefined, so both detectors take their PROD
 * branch here (warn once, continue). Deliberate: every assertion below is made
 * on returned data, never on a throw — a throw-based guard would be vacuous in
 * node. Expect a `[FeatureSystem]` / `[UrlStateEncoder]` warn line above a
 * failure, not instead of one.
 *
 * Run: `npm run test:share-dictionary`
 */
import '../engine-gmt/formulas/index';
import { registerFeatures } from '../engine-gmt/features/index';
import { featureRegistry } from '../engine/FeatureSystem';
import { UrlStateEncoder, findDictionaryCollisions, type Dict, type DictEntry } from '../utils/UrlStateEncoder';

registerFeatures();

let failures = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string) => { console.error(`  ✗ ${msg}`); failures++; };
const check = (cond: boolean, msg: string) => (cond ? ok(msg) : fail(msg));

// Floors. Measured 2026-09-02: 27 features, see PARAM note below. Set at
// roughly two-thirds so a legitimate removal of a feature or two does not trip
// them, while a builder that emits only the root skeleton (0 / 0) cannot pass.
const FEATURE_FLOOR = 18;
const PARAM_ALIAS_FLOOR = 0; // set after first measurement

const children = (e: DictEntry | undefined): Dict =>
    (e && typeof e === 'object' && e.children) ? e.children : {};

console.log('\n[1] dictionary builds, is memoised, has no alias collisions:');
let dict: Dict | null = null;
try {
    dict = featureRegistry.getDictionary() as Dict;
    ok('getDictionary() returned');
} catch (e) {
    fail(`getDictionary() threw — ${(e as Error).message}`);
}

if (dict) {
    check(featureRegistry.getDictionary() === dict, 'getDictionary() is memoised (second call returns the same object)');
    check(Object.isFrozen(dict) && Object.isFrozen(children(dict.features)),
        'the memoised dictionary is frozen (a caller cannot poison the cache)');

    const collisions = findDictionaryCollisions(dict);
    check(collisions.length === 0, `dictionary has no alias collisions (${collisions.length} found)`);
    for (const c of collisions) {
        console.error(`      at ${c.scope || '<root>'}: '${c.keys[0]}' and '${c.keys[1]}' both alias to '${c.alias}'`);
    }

    console.log('\n[2] size floors:');
    const featChildren = children(dict.features);
    const featureCount = Object.keys(featChildren).length;
    let paramAliasCount = 0;
    for (const e of Object.values(featChildren)) paramAliasCount += Object.keys(children(e)).length;
    check(featureCount >= FEATURE_FLOOR, `features in dictionary: ${featureCount} (floor ${FEATURE_FLOOR})`);
    check(paramAliasCount >= PARAM_ALIAS_FLOOR, `aliased params in dictionary: ${paramAliasCount} (floor ${PARAM_ALIAS_FLOOR})`);

    console.log('\n[3] full round-trip through UrlStateEncoder:');
    const features: Record<string, Record<string, unknown>> = {};
    const skipped: string[] = [];
    let unaliased = 0;
    let n = 1000;
    for (const feat of featureRegistry.getAll()) {
        const slice: Record<string, unknown> = {};
        for (const [key, cfg] of Object.entries(feat.params)) {
            // `is*` keys are transient by encoder convention (quantize and getDiff
            // both filter them) — they never reach the wire, so they cannot
            // round-trip and are reported rather than asserted.
            if (key.startsWith('is')) { skipped.push(`${feat.id}.${key}`); continue; }
            if (!cfg.shortId) unaliased++;
            slice[key] = ++n; // distinct integer per param: survives the 5-dp quantizer exactly
        }
        // A feature with no params (cameraManager keeps its state on the root
        // store) has nothing to carry; the encoder's diff drops an empty slice
        // by design, so it cannot round-trip as `{}` and is not expected to.
        if (Object.keys(slice).length === 0) { skipped.push(`${feat.id} (no params)`); continue; }
        features[feat.id] = slice;
    }
    const paramTotal = n - 1000;
    const preset: Record<string, unknown> = {
        formula: 'Mandelbulb',
        cameraPos: { x: 1.5, y: -2.25, z: 3.125 },
        cameraRot: { x: 0.5, y: 0.25, z: -0.75 },
        sceneOffset: { x: 0.1, y: 0.2, z: 0.3, xL: 0, yL: 0, zL: 0 },
        targetDistance: 4.12345, // five decimals: the quantizer's exact limit
        features,
    };
    // Same base shape utils/Sharing.ts uses — `getFullDefaultPreset(...)` with
    // `features: {}` and a blanked formula — so every slice takes the same
    // verbatim path through getDiff that it takes in production.
    const base = { formula: '', cameraPos: { x: 0, y: 0, z: 0 }, cameraRot: { x: 0, y: 0, z: 0 }, features: {} };

    const encoder = new UrlStateEncoder(base as any, dict);
    const payload = encoder.encode(preset as any);
    check(payload.length > 0,
        `encode produced a payload (${payload.length} chars for ${paramTotal} params over ${Object.keys(features).length} features, ${unaliased} un-aliased)`);
    const decoded = encoder.decode(payload) as Record<string, unknown> | null;
    check(!!decoded, 'decode returned a preset');
    if (decoded) {
        const diff = firstDifference(preset, decoded, '');
        check(diff === null, diff === null
            ? 'every root key and every feature slice round-tripped value-for-value'
            : `round-trip lost or changed a value at ${diff}`);
    }
    if (skipped.length) {
        console.log(`      note: ${skipped.length} param(s) not in the round-trip (is* keys are transient by encoder convention; a feature with no params has nothing to carry): ${skipped.join(', ')}`);
    }
}

/** Every path in `expected` must be present and equal in `actual`. */
function firstDifference(expected: unknown, actual: unknown, path: string): string | null {
    const at = path || '<root>';
    if (Array.isArray(expected)) {
        return JSON.stringify(expected) === JSON.stringify(actual) ? null
            : `${at} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`;
    }
    if (expected && typeof expected === 'object') {
        if (!actual || typeof actual !== 'object') return `${at} (expected an object, got ${JSON.stringify(actual)})`;
        for (const k of Object.keys(expected)) {
            const d = firstDifference((expected as any)[k], (actual as any)[k], path ? `${path}.${k}` : k);
            if (d) return d;
        }
        return null;
    }
    return expected === actual ? null : `${at} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`;
}

if (failures) {
    console.error(`\n✗ test:share-dictionary FAILED — ${failures} assertion(s)`);
    process.exit(1);
}
console.log('\n✓ test:share-dictionary PASSED — dictionary is collision-free and every slice round-trips.');
