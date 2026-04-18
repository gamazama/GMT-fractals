/**
 * V4 Stage 1 — Fragmentarium .frag ingest.
 *
 * Classifies render model by inspecting #include / #camera / #donotrun /
 * #buffershader directives, per docs/26b_Fragmentarium_Spec.md §5.
 *
 * Returns a RawSource with renderModel='de3d' (accept) or 'unsupported'
 * (accompanied by a structured Rejection).
 */

import type { RawSource, Rejection, RejectionKind } from '../types';

/** Render-model classification by #include filename. See docs/26b §5. */
const INCLUDE_MODEL: Record<string, 'de3d' | 'reject-2d' | 'reject-buffer' | 'builtin' | 'ignore'> = {
    // Accept: 3D raytracers
    'DE-Raytracer.frag':           'de3d',
    'DE-Raytracer-v0.9.1.frag':    'de3d',
    'DE-Raytracer-v0.9.10.frag':   'de3d',
    'DE-Raytracer-Slicer.frag':    'de3d',
    'DE-RaytracerX.frag':          'de3d',
    '3D.frag':                     'de3d',
    'Brute3D.frag':                'de3d',
    'IBL-Pathtracer.frag':         'de3d',
    'Sky-Pathtracer.frag':         'de3d',
    'IBL-Raytracer.frag':          'de3d',
    'Path-Raytracer.frag':         'de3d',
    'Soft-Raytracer.frag':         'de3d',
    'Subblue-Raytracer.frag':      'de3d',
    'Fast-Raytracer.frag':         'de3d',

    // Reject: 2D / progressive / brute (no DE)
    '2D.frag':                     'reject-2d',
    '2DJulia.frag':                'reject-2d',
    '2D-HP.frag':                  'reject-2d',
    'Progressive2D.frag':          'reject-2d',
    'Progressive2DJulia.frag':     'reject-2d',
    'Brute-Raytracer.frag':        'reject-2d',

    // Reject: multi-pass / buffers
    'BufferShader.frag':           'reject-buffer',
    'BufferShaderIFS.frag':        'reject-buffer',
    'BufferShaderRD.frag':         'reject-buffer',
    'BufferShaderX.frag':          'reject-buffer',
    'DepthBufferShader.frag':      'reject-buffer',
    'ZBuffer3D.frag':              'reject-buffer',
    'ZBufferShader.frag':          'reject-buffer',

    // Inline as builtin GLSL during preprocess; don't affect render-model
    'MathUtils.frag':              'builtin',
    'Complex.frag':                'builtin',
    'EmulatedDouble.frag':         'builtin',
    'Classic-Noise.frag':          'builtin',
    'Ashima-Noise.frag':           'builtin',
    'QuilezLib.frag':              'builtin',
    'Shadertoy.frag':              'builtin',

    // Environment — engine handles its own; don't inline, don't reject
    'Sunsky.frag':                 'ignore',
};

function reject(source: string, filename: string, error: Rejection): RawSource {
    return { format: 'frag', source, filename, renderModel: 'unsupported', rejectReason: error };
}

export function ingestFrag(source: string, filename: string): RawSource {
    // ── #donotrun: library file, not a formula ──────────────────────────────
    if (/^\s*#donotrun\b/m.test(source)) {
        return reject(source, filename, {
            kind: 'donotrun',
            message: `${filename}: marked #donotrun (library file, not a standalone formula).`,
            hint: 'Library files provide shared functions to other formulas and cannot run on their own.',
        });
    }

    // ── #buffershader: multi-pass setup ─────────────────────────────────────
    const bs = source.match(/^\s*#buffershader\s+"([^"]+)"/m);
    if (bs) {
        return reject(source, filename, {
            kind: 'buffer_shader',
            message: `${filename}: uses #buffershader "${bs[1]}" (multi-pass rendering, not supported by V4).`,
        });
    }

    // ── #camera "2D*": 2D render model ──────────────────────────────────────
    const cam = source.match(/^\s*#camera\s+"?([^"\n]+?)"?\s*$/m);
    if (cam) {
        const c = cam[1].trim().toLowerCase();
        if (c.startsWith('2d') || c.includes('progressive 2d')) {
            return reject(source, filename, {
                kind: 'unsupported_render_model',
                message: `${filename}: uses #camera "${cam[1]}" (2D render model, not supported).`,
                hint: 'GMT requires 3D distance-estimator formulas.',
            });
        }
    }

    // ── #define providesColor / providesBackground: deferred ────────────────
    if (/^\s*#define\s+providesColor\b/m.test(source)) {
        return reject(source, filename, {
            kind: 'provides_color',
            message: `${filename}: #define providesColor (custom color pipeline, deferred from V4).`,
            hint: 'This formula overrides GMT\'s color handling. Support is deferred to a future version.',
        });
    }
    if (/^\s*#define\s+providesBackground\b/m.test(source)) {
        return reject(source, filename, {
            kind: 'provides_background',
            message: `${filename}: #define providesBackground (custom background, deferred from V4).`,
        });
    }

    // ── Scan includes ───────────────────────────────────────────────────────
    const includes = [...source.matchAll(/^\s*#include\s+"([^"]+)"/gm)].map(m => m[1]);

    let de3dFound = false;
    for (const inc of includes) {
        const model = INCLUDE_MODEL[inc];
        if (model === 'de3d') { de3dFound = true; continue; }

        if (model === 'reject-2d' || model === 'reject-buffer') {
            const kind: RejectionKind = model === 'reject-2d'
                ? 'unsupported_render_model' : 'buffer_shader';
            return reject(source, filename, {
                kind,
                message: `${filename}: #include "${inc}" indicates ${
                    model === 'reject-2d' ? 'a 2D render model' : 'multi-pass buffer rendering'
                } (not supported).`,
                include: inc,
            });
        }
        // 'builtin', 'ignore', or undefined → don't classify yet
    }

    // ── Accept: 3D include present, or a float DE(vec3) signature exists ────
    const hasDEFunction = /\bfloat\s+DE\s*\(\s*vec3\b/.test(source);
    if (de3dFound || hasDEFunction) {
        return { format: 'frag', source, filename, renderModel: 'de3d' };
    }

    // ── Ambiguous: no 3D include, no DE function ────────────────────────────
    return reject(source, filename, {
        kind: 'no_de_function',
        message: `${filename}: no DE function found and no recognised 3D-raytracer include.`,
        hint: 'V4 requires either a `float DE(vec3)` function or a 3D #include directive.',
    });
}
