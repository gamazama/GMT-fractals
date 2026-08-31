/**
 * Environment-map sampling contract (ADR-0069, ADR-0072).
 * Run: `npm run test:env-sampling`  (tsx debug/test-env-sampling.mts)
 *
 * The env chunk produces every sky pixel and every reflection pixel in GMT, and
 * before 2026-08-31 nothing read it at the text level. It is GLSL held in a TS
 * string, so `typecheck` cannot see inside it and `test:shader` only proves it
 * COMPILES — an implicit-LOD fetch compiles perfectly and renders wrong.
 *
 * Covers:
 *   A. Bicubic taps carry an EXPLICIT LOD. `sampleEnvBicubic`'s tap coordinates
 *      c0/c1 jump +0.8 texels at every base-texel boundary (the Sigg & Hadwiger
 *      construction keeps the RESULT continuous via compensating g0/g1 weights,
 *      not the coordinates). A `texture()` fetch derives its minification LOD
 *      from exactly those coordinates, so on a mirror it reads that saw-tooth as
 *      ~2.4 mips of LOD noise, quantised to 2x2 quads. That was the hard
 *      stair-stepped reflection edges reported 2026-08-31.
 *   B. No implicit-LOD fetch of uEnvMapTexture ANYWHERE in the chunk — the same
 *      defect at any other site would be just as invisible.
 *   C. The baseFilter DCE contract (2026-07-10 compile-cost pass): baseFilter is
 *      a CONSTANT at every caller so fxc can dead-code the bicubic out of the
 *      ~8 fogRadiance instances. A variable there costs ~2.5s of cold compile.
 *   D. The gate is roughness-only, recorded as a KNOWN limitation rather than a
 *      claim it is correct — it fires on mirrors, which are minified. See the
 *      @assumption in block D.
 *
 * FALSIFIED 2026-08-31 — each mutation applied, run, reverted, re-run green:
 *   - taps back to `texture(uEnvMapTexture, ...)`       -> 4 red (3 in A, 1 in B)
 *   - `GetEnvMap` passing `baseFilter` through as a var -> 1 red (C)
 *   - `sampleEnvBicubic` body emptied to `return vec3(0.0)` -> 4 red (A)
 *
 * That third one is the point. "No implicit-LOD fetch present" is VACUOUSLY
 * TRUE when the function is gone — it is the audit's most common guard defect
 * ("green because the input vanished") and it would have passed at exit 0 here.
 * Block A asserts the four fetches EXIST before asserting what kind they are,
 * so the emptied body reds on existence instead of passing. Any check added
 * below must keep that ordering.
 */
import { LIGHTING_ENV } from '../engine-gmt/shaders/chunks/lighting/env.ts';

let pass = 0;
const fails: string[] = [];
const ck = (name: string, cond: boolean, got?: unknown) => {
    if (cond) pass++;
    else fails.push(`${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ''}`);
};

const src = LIGHTING_ENV;

/** Body of a top-level GLSL function, brace-matched. */
function fnBody(name: string): string | null {
    const i = src.indexOf(`${name}(`);
    if (i < 0) return null;
    const open = src.indexOf('{', i);
    if (open < 0) return null;
    let depth = 0;
    for (let j = open; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}' && --depth === 0) return src.slice(open + 1, j);
    }
    return null;
}

/**
 * Fetches of `sampler`, split by whether the LOD is explicit.
 *
 * Deliberately regex-free: the fetch builtin is whatever identifier immediately
 * precedes the `(sampler` opening, so read it backwards off the string. A regex
 * here has to survive both a template literal and a shell heredoc, and silently
 * degrades to matching nothing if an escape is lost — the exact "green because
 * the input vanished" failure this guard exists to prevent.
 */
function fetches(body: string, sampler: string) {
    const out = { total: 0, explicit: 0, implicit: 0, kinds: [] as string[] };
    const needle = '(' + sampler;
    for (let i = body.indexOf(needle); i >= 0; i = body.indexOf(needle, i + 1)) {
        // The char after the sampler name must not be an identifier char, or
        // `uEnvMapTexture` would also match a hypothetical `uEnvMapTextureFoo`.
        const after = body[i + needle.length];
        if (after && /[A-Za-z0-9_]/.test(after)) continue;
        let j = i;
        while (j > 0 && /[A-Za-z0-9_]/.test(body[j - 1])) j--;
        const fn = body.slice(j, i);
        if (!fn) continue;
        // textureSize/textureQueryLevels read metadata, they do not sample.
        if (fn === 'textureSize' || fn === 'textureQueryLevels') continue;
        out.total++;
        out.kinds.push(fn);
        if (fn === 'textureLod' || fn === 'textureGrad') out.explicit++;
        else if (fn === 'texture') out.implicit++;
    }
    return out;
}

// ── A. Bicubic taps: prove they EXIST, then prove they are explicit-LOD ──────
{
    const body = fnBody('vec3 sampleEnvBicubic');
    ck('A: sampleEnvBicubic is present', body !== null);
    if (body) {
        const f = fetches(body, 'uEnvMapTexture');
        // Existence first — a "no implicit fetch" assertion is vacuously true
        // when the function is gone. This is the guard's own subject proof.
        ck('A: bicubic makes exactly 4 env fetches (the reconstruction)', f.total === 4, f.total);
        ck('A: bicubic taps carry an explicit LOD', f.explicit === 4, f);
        ck('A: bicubic makes NO implicit-LOD fetch', f.implicit === 0, f.implicit);
        ck('A: taps request base level specifically', (body.match(/, 0\.0\)\.rgb/g) || []).length === 4,
           (body.match(/, 0\.0\)\.rgb/g) || []).length);
        // The discontinuity the explicit LOD exists to defuse must still be the
        // construction in use — if someone swaps in a continuous formulation,
        // this comment/rationale needs revisiting rather than silently rotting.
        ck('A: still the Sigg-Hadwiger w1/g0 + w3/g1 tap construction',
           body.includes('w1 / g0') && body.includes('w3 / g1'));
    }
}

// ── B. Chunk-wide: no implicit-LOD env fetch at ANY site ────────────────────
{
    const f = fetches(src, 'uEnvMapTexture');
    ck('B: chunk fetches uEnvMapTexture at all', f.total > 0, f.total);
    ck('B: every uEnvMapTexture fetch in the chunk is explicit-LOD', f.implicit === 0, f);
}

// ── C. baseFilter DCE contract (compile cost) ───────────────────────────────
{
    const get = fnBody('vec3 GetEnvMap');
    const fog = fnBody('vec3 fogRadiance');
    ck('C: GetEnvMap is present', get !== null);
    ck('C: fogRadiance is present', fog !== null);
    // Constant at the call site, so fxc can fold the branch. A pass-through
    // variable defeats the whole 2026-07-10 structural pass.
    ck('C: GetEnvMap passes baseFilter as the literal true',
       !!get && /envSampleCore\([^)]*,\s*true\s*\)/.test(get), get?.trim());
    ck('C: fogRadiance passes baseFilter as the literal false',
       !!fog && /envSampleCore\([^)]*,\s*false\s*\)/.test(fog));
    ck('C: envImageSample branches on baseFilter (the DCE seam)',
       (fnBody('vec3 envImageSample') || '').includes('baseFilter &&'));
}

// ── D. The gate is roughness-only — recorded, not endorsed ──────────────────
{
    const core = fnBody('vec3 envSampleCore') || '';
    const img = fnBody('vec3 envImageSample') || '';
    ck('D: envSampleCore is present', core.length > 0);
    // @assumption the near-base filter's `lod < 1` gate is an acceptable proxy
    // for magnification. It is NOT one: `lod` is `roughness * uEnvMaxMip` and
    // carries no pixel footprint, so the branch also fires on near-mirror
    // reflections (roughness < ~1/uEnvMaxMip), the maximally MINIFIED case.
    // Tolerable only while block A holds. A real fix threads a footprint term
    // through GetEnvMap (or supplies analytic gradients to textureGrad) and
    // would change this assertion — see ADR-0069's 2026-08-31 update.
    ck('D: LOD is still roughness * uEnvMaxMip with no footprint term',
       core.includes('roughness * uEnvMaxMip'));
    ck('D: near-base branch is still gated at lod < 1.0', img.includes('lod < 1.0'));
}

console.log(`\nenv sampling: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
    console.error(fails.map((f) => '  ✗ ' + f).join('\n'));
    process.exit(1);
}
