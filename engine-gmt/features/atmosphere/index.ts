
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
    // Per-direction in-scatter (aerial perspective) — falls back to the flat
    // authored colour at uFogEnvTint 0. @see fogRadiance (env.ts), ADR-0097.
    vec3 fogColor = fogRadiance(rd);

    // Volumetric fog absorption
    if (uFogDensity > 0.0001) {
        float volAlpha = clamp(volumetric * uFogIntensity, 0.0, 1.0);
        col = mix(col, fogColor, volAlpha);
    }

    // Distance fog
    if (uEnvBackgroundStrength > 0.001) {
        // Background visible: only fog geometry, preserve env map on miss
        if (d < MISS_DIST - 10.0) {
            col = mix(col, fogColor, fogFactor);
        }
    } else {
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
    fogColor: THREE.Color; // UI label 'Background Color' — doubles as the no-sky backdrop
    fogEnvTint: number; // 'Sky Tint' — per-direction fog radiance from the sky (ADR-0097)
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
        background: {
            label: 'Background',
            description: 'The backdrop colour shown when the sky is not visible.',
            helpId: 'fog.settings',
        },
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

        // --- BACKGROUND ---
        fogColor: {
            // Own group so the Scene panel renders it at the TOP of the
            // 'Background & Sky' section (groups are UI filters only — the
            // stored key stays fogColor, no preset migration). ALWAYS visible:
            // this colour IS the background whenever the sky isn't shown
            // (main.ts bgCol falls back to uFogColorLinear regardless of fog
            // intensity), and fog fades toward the same colour.
            type: 'color', default: new THREE.Color(0,0,0), label: 'Background Color', shortId: 'fc', uniform: 'uFogColor',
            group: 'background',
            description: 'The background colour whenever the sky is not visible — even with fog off. Fog fades distant geometry toward this same colour.',
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
        fogEnvTint: {
            // Back in the FOG group (moved to materials/env earlier today, then
            // fogRadiance was DECOUPLED from the env-light strength — the fog
            // follows the VISIBLE sky definition regardless of how strongly it
            // lights the scene, so this is purely a fog property again).
            type: 'float', default: 0.0, label: 'Sky Tint', shortId: 'fet', uniform: 'uFogEnvTint',
            min: 0.0, max: 1.0, step: 0.01, group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            description: 'Tints the fog with the sky per direction (aerial perspective) — fog brightens toward the bright side of the sky. 0 = flat Background Color, 1 = the sky itself.',
            helpId: 'fog.settings',
        },
        fogDensity: {
            type: 'float', default: 0.01, label: 'Fog Density', shortId: 'fd', uniform: 'uFogDensity',
            min: 0.001, max: 5.0, step: 0.01, scale: 'log', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
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
