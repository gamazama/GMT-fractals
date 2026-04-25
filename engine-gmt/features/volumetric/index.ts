
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { VOLUMETRIC_SCATTER_BODY } from '../../shaders/chunks/lighting/volumetric_scatter';
import * as THREE from 'three';

/** Volumetric scatter compositing — injected via addPostProcessLogic().
 *  Adds accumulated god ray scatter to the final color. */
const VOLUMETRIC_SCATTER_POST = `
    // --- VOLUMETRIC SCATTER (God Rays) ---
    col += fogScatter;
`;

export interface VolumetricState {
    ptVolumetric: boolean;
    volEnabled: boolean;
    volDensity: number;
    volAnisotropy: number;
    volMaxLights: number;
    volScatterTint: THREE.Color;
    volEmissive: number;
    volEmissiveFalloff: number;
    volHeightFalloff: number;
    volHeightOrigin: number;
}

export const VolumetricFeature: FeatureDefinition = {
    id: 'volumetric',
    shortId: 'vol',
    name: 'Volumetric Scatter',
    category: 'Rendering',
    engineConfig: {
        toggleParam: 'ptVolumetric',
        mode: 'compile',
        label: 'Volumetric Scattering',
        description: 'Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.',
        groupFilter: 'engine_settings'
    },
    panelConfig: {
        compileParam: 'ptVolumetric',
        runtimeToggleParam: 'volEnabled',
        label: 'Volumetric Scatter',
        compileMessage: 'Compiling Volumetric Shader...',
        helpId: 'render.volumetric',
    },
    groups: {
        density: { label: 'Density & Shadow Rays', collapsible: true },
        emissive: { label: 'Color Scatter', collapsible: true },
        height: { label: 'Height Fog', collapsible: true },
    },
    params: {
        // --- COMPILE-TIME TOGGLE ---
        ptVolumetric: {
            type: 'boolean', default: false, label: 'Volume Scatter', shortId: 'pvs',
            group: 'engine_settings', noReset: true,
            onUpdate: 'compile',
            estCompileMs: 5500,
        },

        // --- RUNTIME TOGGLE (instant on/off, hidden — controlled by CompilableFeatureSection) ---
        volEnabled: {
            type: 'boolean', default: false, label: 'Enabled', shortId: 'ven', uniform: 'uVolEnabled',
            hidden: true,
        },

        // --- DENSITY SCATTER (expensive — shadow rays per light) ---
        volDensity: {
            type: 'float', default: 0.01, label: 'Density', shortId: 'vd', uniform: 'uVolDensity',
            min: 0.001, max: 5.0, step: 0.01, scale: 'log', group: 'density',
            condition: { param: 'ptVolumetric', bool: true },
            description: 'How thick the participating medium is along each ray.',
            helpId: 'render.volumetric',
        },
        volAnisotropy: {
            type: 'float', default: 0.3, label: 'Anisotropy (g)', shortId: 'va', uniform: 'uVolAnisotropy',
            min: -0.99, max: 0.99, step: 0.01, group: 'density',
            parentId: 'volDensity', condition: { gt: 0.0 },
            description: '0=isotropic, +0.9=forward (god rays), -0.9=back scatter.',
            helpId: 'render.volumetric',
        },
        volMaxLights: {
            type: 'float', default: 1, label: 'Light Sources', shortId: 'vml', uniform: 'uVolMaxLights',
            min: 1, max: 3, step: 1, group: 'density',
            parentId: 'volDensity', condition: { gt: 0.0 },
            isAdvanced: true,
            description: 'Max lights for shadow rays. More = more expensive.',
            helpId: 'render.volumetric',
        },
        volScatterTint: {
            type: 'color', default: new THREE.Color(1, 1, 1), label: 'Scatter Tint', shortId: 'vst', uniform: 'uVolScatterTint',
            group: 'density',
            parentId: 'volDensity', condition: { gt: 0.0 },
            description: 'Tint applied to scattered light along each ray.',
            helpId: 'render.volumetric',
        },

        // --- SURFACE COLOR SCATTER (cheap — no shadow rays) ---
        volEmissive: {
            type: 'float', default: 0.0, label: 'Color Scatter', shortId: 'ves', uniform: 'uVolEmissive',
            min: 0, max: 100.0, step: 0.1, scale: 'log', group: 'emissive',
            condition: { param: 'ptVolumetric', bool: true },
            description: 'Orbit trap color field scattered through the volume. No shadow rays needed.',
            helpId: 'render.volumetric',
        },
        volStepJitter: {
            type: 'float', default: 1.0, label: 'Step Jitter', shortId: 'vsj', uniform: 'uVolStepJitter',
            min: 0.0, max: 1.0, step: 0.01, group: 'density',
            parentId: 'volDensity', condition: { gt: 0.0 },
            description: '1 = smooth (temporal accumulation removes noise). 0 = fixed slicing pattern (artistic, broken fog look).',
            helpId: 'render.volumetric',
        },
        volEmissiveFalloff: {
            type: 'float', default: 0.0, label: 'Surface Falloff', shortId: 'vef', uniform: 'uVolEmissiveFalloff',
            min: 0, max: 5.0, step: 0.01, scale: 'log', group: 'emissive',
            parentId: 'volEmissive', condition: { gt: 0.0 },
            description: 'Concentrate color near fractal surface.',
            helpId: 'render.volumetric',
        },

        // --- HEIGHT FOG ---
        volHeightFalloff: {
            type: 'float', default: 0.0, label: 'Height Falloff', shortId: 'vhf', uniform: 'uVolHeightFalloff',
            min: 0, max: 5.0, step: 0.01, scale: 'log', group: 'height',
            condition: { param: 'ptVolumetric', bool: true },
            description: 'Density varies with Y. Creates ground fog, rising mist.',
            helpId: 'render.volumetric',
        },
        volHeightOrigin: {
            type: 'float', default: 0.0, label: 'Height Origin', shortId: 'vho', uniform: 'uVolHeightOrigin',
            min: -5, max: 5, step: 0.01, group: 'height',
            parentId: 'volHeightFalloff', condition: { gt: 0.0 },
            description: 'Y level where height-based fog density peaks.',
            helpId: 'render.volumetric',
        },
    },

    inject: (builder, config, variant) => {
        if (variant !== 'Main') return;

        const state = config.volumetric as VolumetricState;
        if (state?.ptVolumetric) {
            builder.addDefine('PT_VOLUMETRIC', '1');
            builder.addVolumeTracing(VOLUMETRIC_SCATTER_BODY, '');
            // Compositing: add accumulated scatter to final color in post-processing
            builder.addPostProcessLogic(VOLUMETRIC_SCATTER_POST);
        }
    }
};
