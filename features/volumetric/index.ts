
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { VOLUMETRIC_SCATTER_BODY } from '../../shaders/chunks/lighting/volumetric_scatter';
import * as THREE from 'three';

export interface VolumetricState {
    ptVolumetric: boolean;
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
    groups: {
        density: { label: 'Density & Shadow Rays', collapsible: true },
        emissive: { label: 'Color Scatter', collapsible: true },
        height: { label: 'Height Fog', collapsible: true },
    },
    params: {
        // --- COMPILE-TIME TOGGLE ---
        ptVolumetric: {
            type: 'boolean', default: false, label: 'Volume Scatter', shortId: 'pvs',
            group: 'main', noReset: true,
            onUpdate: 'compile',
            estCompileMs: 5500,
        },

        // --- DENSITY SCATTER (expensive — shadow rays per light) ---
        volDensity: {
            type: 'float', default: 0.01, label: 'Density', shortId: 'vd', uniform: 'uVolDensity',
            min: 0.001, max: 5.0, step: 0.01, scale: 'log', group: 'density',
            condition: { param: 'ptVolumetric', bool: true },
        },
        volAnisotropy: {
            type: 'float', default: 0.3, label: 'Anisotropy (g)', shortId: 'va', uniform: 'uVolAnisotropy',
            min: -0.99, max: 0.99, step: 0.01, group: 'density',
            parentId: 'volDensity', condition: { gt: 0.0 },
            description: '0=isotropic, +0.9=forward (god rays), -0.9=back scatter.'
        },
        volMaxLights: {
            type: 'float', default: 1, label: 'Light Sources', shortId: 'vml', uniform: 'uVolMaxLights',
            min: 1, max: 3, step: 1, group: 'density',
            parentId: 'volDensity', condition: { gt: 0.0 },
            isAdvanced: true,
            description: 'Max lights for shadow rays. More = more expensive.'
        },
        volScatterTint: {
            type: 'color', default: new THREE.Color(1, 1, 1), label: 'Scatter Tint', shortId: 'vst', uniform: 'uVolScatterTint',
            group: 'density',
            parentId: 'volDensity', condition: { gt: 0.0 },
        },

        // --- SURFACE COLOR SCATTER (cheap — no shadow rays) ---
        volEmissive: {
            type: 'float', default: 0.0, label: 'Color Scatter', shortId: 'ves', uniform: 'uVolEmissive',
            min: 0, max: 100.0, step: 0.1, scale: 'log', group: 'emissive',
            condition: { param: 'ptVolumetric', bool: true },
            description: 'Orbit trap color field scattered through the volume. No shadow rays needed.'
        },
        volEmissiveFalloff: {
            type: 'float', default: 0.0, label: 'Surface Falloff', shortId: 'vef', uniform: 'uVolEmissiveFalloff',
            min: 0, max: 5.0, step: 0.01, scale: 'log', group: 'emissive',
            parentId: 'volEmissive', condition: { gt: 0.0 },
            description: 'Concentrate color near fractal surface.'
        },

        // --- HEIGHT FOG ---
        volHeightFalloff: {
            type: 'float', default: 0.0, label: 'Height Falloff', shortId: 'vhf', uniform: 'uVolHeightFalloff',
            min: 0, max: 5.0, step: 0.01, scale: 'log', group: 'height',
            condition: { param: 'ptVolumetric', bool: true },
            description: 'Density varies with Y. Creates ground fog, rising mist.'
        },
        volHeightOrigin: {
            type: 'float', default: 0.0, label: 'Height Origin', shortId: 'vho', uniform: 'uVolHeightOrigin',
            min: -5, max: 5, step: 0.01, group: 'height',
            parentId: 'volHeightFalloff', condition: { gt: 0.0 },
        },
    },

    inject: (builder, config, variant) => {
        if (variant !== 'Main') return;

        const state = config.volumetric as VolumetricState;
        if (state?.ptVolumetric) {
            builder.addDefine('PT_VOLUMETRIC', '1');
            builder.addVolumeLogic(VOLUMETRIC_SCATTER_BODY, '');
        }
    }
};
