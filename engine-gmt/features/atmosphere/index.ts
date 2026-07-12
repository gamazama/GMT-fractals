
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { ATMOSPHERE_VOLUME_BODY, ATMOSPHERE_VOLUME_FINALIZE } from './shader';

// ---------------------------------------------------------------------------
// POST-PROCESSING GLSL — injected via addPostProcessLogic()
// Variables in scope: col, d, glow, volumetric, fogScatter
// ---------------------------------------------------------------------------

/** Distance fog + volumetric density fog. Always injected (fog is independent of glow toggle). */
const FOG_POST_PROCESS = `
    // --- FOG (Atmosphere Feature) ---
    float fogFactor = smoothstep(uFogNear, uFogFar, d) * uFogIntensity;
    // Per-direction in-scatter (aerial perspective) — follows the sky by
    // default, blends to the custom Fog Color as uFogTint rises.
    // @see fogRadiance (env.ts), ADR-0097 (+ update #4).
    vec3 fogColor = fogRadiance(rd);

    // Volumetric fog absorption
    if (uFogDensity > 0.0001) {
        float volAlpha = clamp(volumetric * uFogIntensity, 0.0, 1.0);
        col = mix(col, fogColor, volAlpha);
    }

    // Distance fog — geometry only. Miss pixels (the sky) are fogged ONCE at
    // bgCol composition (main.ts mixes toward fogRadiance by intensity); the
    // old visibility-0 else-branch is gone with the flat-backdrop fallback
    // (ADR-0098 — the backdrop is always the sky now).
    if (d < MISS_DIST - 10.0) {
        col = mix(col, fogColor, fogFactor);
    }
`;

/** Glow compositing. Always injected — guarded by uGlowIntensity uniform at runtime. */
const GLOW_POST_PROCESS = `
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`;

export interface AtmosphereState {
    fogIntensity: number;
    fogNear: number;
    fogFar: number;
    fogColor: THREE.Color; // 'Fog Color' / 'Sky Color' (Solid) — one param, two homes (ADR-0098)
    fogTint: number; // 'Fog Tint' — 0 = fog follows the sky, 1 = custom Fog Color (ADR-0097 #4)
    fogDensity: number;
    glowEnabled: boolean; // Compile-Time Switch
    glowQuality: number;
    glowIntensity: number;
    glowSharpness: number;
    glowMode: boolean;
    glowColor: THREE.Color;
}

export const AtmosphereFeature: FeatureDefinition = {
    id: 'atmosphere',
    shortId: 'at',
    name: 'Atmosphere',
    category: 'Rendering',
    engineConfig: {
        toggleParam: 'glowEnabled',
        mode: 'compile',
        label: 'Volumetric Glow',
        groupFilter: 'engine_settings'
    },
    groups: {
        fog: {
            label: 'Fog',
            description: 'Distance-based fog that fades the scene toward a colour.',
            helpId: 'fog.settings',
        },
        glow: {
            label: 'Glow',
            description: 'Soft halo emitted around bright surfaces.',
            helpId: 'mat.glow',
        },
    },
    params: {
        // --- MASTER SWITCH (Compile Time) ---
        glowEnabled: {
            type: 'boolean', default: true, label: 'Enable Glow', shortId: 'ge', group: 'main',
            hidden: true, noAccumReset: true,
            onUpdate: 'compile',
            estCompileMs: 200  // base glow compile (= Accurate quality). Measured §2.6 (Color/Accurate +205/198). The Fast EXTRA lives on the glowQuality option below. (Restored to the estimate after ADR-0079 Stage 4 moved costs onto per-param annotations; glow had none.)
        },

        // --- ENGINE SETTINGS (Compile Time) ---
        glowQuality: {
            type: 'float', default: 0.0, label: 'Glow Algo', shortId: 'gq',
            group: 'engine_settings',
            options: [
                { label: 'Accurate (Vector)', value: 0.0, estCompileMs: 0 },
                // Counter-intuitively the scalar path compiles SLOWER (§2.6: Fast Glow
                // +635/774 vs Color +205/198). This is the EXTRA over glowEnabled's
                // base; it only adds up when glow is on (the Accurate default is 0, so
                // a glow-off config with default quality contributes nothing).
                { label: 'Fast (Scalar)', value: 1.0, estCompileMs: 450 },
            ],
            description: 'Vector accumulates color per-step. Scalar accumulates intensity only (faster).',
            onUpdate: 'compile',
            noAccumReset: true
        },

        // --- SKY / FOG COLOUR ---
        fogColor: {
            // ONE param, two contextual homes (ADR-0098 + 0097 update #4):
            //  - SOLID sky (materials.envSource 2): this IS the sky — GetEnvMap
            //    returns uFogColorLinear — surfaced as 'Sky Color' at the top of
            //    Background & Sky (manifest whitelist item lifts it out of its
            //    fogTint nesting via liftChildrenOf + relabels it).
            //  - Gradient/Image sky: nests as 'Fog Color' UNDER the Fog Tint
            //    slider, revealed when tint > 0 — the colour appears exactly
            //    when something uses it. Stored key + uniform never changed.
            type: 'color', default: new THREE.Color(0,0,0), label: 'Fog Color', shortId: 'fc', uniform: 'uFogColor',
            group: 'fog',
            parentId: 'fogTint',
            condition: { or: [
                { param: '$materials.envSource', gt: 1.5 },  // Solid: always live (it IS the sky)
                { gt: 0.0 },                                 // else: only while Fog Tint uses it
            ] },
            description: 'The custom fog colour (and the Solid sky colour). Fog fades toward this when Fog Tint is above 0.',
            helpId: 'fog.settings',
        },

        // --- FOG (Runtime) ---
        fogIntensity: {
            type: 'float', default: 0.0, label: 'Fog Intensity', shortId: 'fi', uniform: 'uFogIntensity',
            min: 0.0, max: 1.0, step: 0.01, group: 'fog',
            description: 'Master fog amount; fades distant geometry toward the fog colour.',
            helpId: 'fog.settings',
        },
        fogNear: {
            // rangePairWith: Start + End render as ONE dual-thumb RangeSlider
            // ('Fog Range') — first consumer of the generic pairing.
            type: 'float', default: 0.0, label: 'Fog Start', shortId: 'fn', uniform: 'uFogNear',
            min: 0, max: 10, step: 0.1, scale: 'square', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            rangePairWith: 'fogFar', rangeLabel: 'Fog Range',
            description: 'Distance where fog begins to appear.',
            helpId: 'fog.settings',
        },
        fogFar: {
            type: 'float', default: 5.0, label: 'Fog End', shortId: 'ff', uniform: 'uFogFar',
            min: 0, max: 10, step: 0.1, scale: 'square', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            description: 'Distance where fog reaches full opacity.',
            helpId: 'fog.settings',
        },
        fogTint: {
            // INVERTED from the former fogEnvTint 'Sky Tint' (ADR-0097 update
            // #4, owner design): fog follows the SKY by default (aerial
            // perspective — for Solid skies that IS the colour), and this dial
            // blends toward the custom Fog Color, which reveals beneath it
            // while > 0. Hidden for Solid skies (nothing to tint away from —
            // the sky already equals the colour). Migration v6 pins old scenes
            // to 1 (their flat-colour look).
            type: 'float', default: 0.0, label: 'Fog Tint', shortId: 'ftn', uniform: 'uFogTint',
            min: 0.0, max: 1.0, step: 0.01, group: 'fog', parentId: 'fogIntensity',
            condition: [
                { gt: 0.0 },                                  // fog is on (parent)
                { param: '$materials.envSource', lt: 1.5 },   // not a Solid sky
            ],
            description: 'Blends the fog colour away from the sky toward the custom Fog Color below. 0 = fog matches the sky (aerial perspective); 1 = fully the custom colour.',
            helpId: 'fog.settings',
        },
        fogDensity: {
            type: 'float', default: 0.01, label: 'Fog Density', shortId: 'fd', uniform: 'uFogDensity',
            min: 0.001, max: 5.0, step: 0.05, group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            description: 'Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine.',
            helpId: 'fog.settings',
        },

        // --- GLOW (Runtime) ---
        // Note: These sliders are only visible if the feature is compiled (handled by UI visibility logic)
        glowIntensity: {
            type: 'float', default: 0.0, label: 'Glow Strength', shortId: 'gi', uniform: 'uGlowIntensity',
            min: 0, max: 5, step: 0.01, scale: 'log', group: 'glow',
            condition: { param: 'glowEnabled', bool: true },
            description: 'Brightness of the volumetric glow accumulated along each ray.',
            helpId: 'mat.glow',
        },
        glowSharpness: {
            type: 'float', default: 50.0, label: 'Tightness', shortId: 'gs', uniform: 'uGlowSharpness',
            min: 0.1, max: 1000, step: 0.1, scale: 'log', group: 'glow', parentId: 'glowIntensity', condition: [{ gt: 0.0 }, { param: 'glowEnabled', bool: true }],
            description: 'Low values give a wide haze; high values hug the surface like neon outlines.',
            helpId: 'mat.glow',
        },
        glowMode: {
            type: 'boolean', default: true, label: 'Glow Source', shortId: 'gm', uniform: 'uGlowMode',
            group: 'glow', parentId: 'glowIntensity', condition: [{ gt: 0.0 }, { param: 'glowEnabled', bool: true }],
            options: [{ label: 'Surface', value: false }, { label: 'Color', value: true }],
            description: 'Whether the glow inherits the surface colour or uses a fixed tint.',
            helpId: 'mat.glow',
        },
        glowColor: {
            type: 'color', default: new THREE.Color(1,1,1), label: 'Glow Color', shortId: 'gl', uniform: 'uGlowColor',
            group: 'glow', parentId: 'glowMode', condition: [{ bool: true }, { param: 'glowEnabled', bool: true }],
            description: 'Tint applied to the glow when Glow Source is Color.',
            helpId: 'mat.glow',
        }
    },
    inject: (builder, config, variant) => {
        // OPTIMIZATION: Only inject for Main Render
        if (variant !== 'Main') return;

        // Fog post-processing: always injected (independent of glow toggle)
        builder.addPostProcessLogic(FOG_POST_PROCESS);
        builder.addPostProcessLogic(GLOW_POST_PROCESS);

        const state = config.atmosphere as AtmosphereState;

        // Glow volume tracing: conditionally compiled
        if (state && state.glowEnabled) {
            if (state.glowQuality > 0.5) {
                builder.addDefine('GLOW_FAST', '1');
                // GLOW_FAST needs finalize code (tints accumulated scalar glow using hit color)
                builder.addVolumeTracing(ATMOSPHERE_VOLUME_BODY, ATMOSPHERE_VOLUME_FINALIZE);
            } else {
                // Quality mode: finalize is dead code (#ifdef GLOW_FAST won't fire).
                // Pass empty string so Phase 4.1 miss optimization (skip map() on miss) activates.
                builder.addVolumeTracing(ATMOSPHERE_VOLUME_BODY, '');
            }
        }
        // If glow disabled, no volume tracing. The 'accColor' variables in traceScene default to 0.0.
    }
};
