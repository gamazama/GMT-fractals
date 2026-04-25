
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { GradientStop, GradientConfig } from '../../types/graphics';
import { MAPPING_MODES, generateMappingShader } from './MappingModes';

export interface ColoringState {
    gradient: GradientStop[] | GradientConfig;
    mode: number;
    scale: number;
    offset: number;
    repeats: number;
    phase: number;
    bias: number;
    twist: number;
    escape: number;
    colorIter: number;
    gradient2: GradientStop[] | GradientConfig;
    mode2: number;
    scale2: number;
    offset2: number;
    repeats2: number;
    phase2: number;
    bias2: number;
    twist2: number;
    blendMode: number;
    blendOpacity: number;
    layer3Color: THREE.Color;
    layer3Scale: number;
    layer3Strength: number;
    layer3Bump: number;
    layer3Turbulence: number;
    layer3Enabled: boolean;
}

const mappingOptions = MAPPING_MODES.map(m => ({ label: m.label, value: m.value }));

export const ColoringFeature: FeatureDefinition = {
    id: 'coloring',
    shortId: 'cl',
    name: 'Coloring',
    category: 'Visuals',
    tabConfig: {
        label: 'Gradient', // Renamed from Gradients
    },
    groups: {
        layer1_top:    { label: 'Mapping',     description: 'How fractal data feeds the gradient lookup.', helpId: 'grad.mapping' },
        layer1_grad:   { label: 'Gradient',                                                                helpId: 'grad.editor'  },
        layer1_hist:   { label: 'Histogram',                                                               helpId: 'grad.params'  },
        layer1_bottom: { label: 'Output',      description: 'Final adjustments applied after the gradient lookup.', helpId: 'grad.escape' },
        layer2_top:    { label: 'Mapping',     description: 'Layer 2 mapping mode and blend.',             helpId: 'grad.mapping' },
        layer2_grad:   { label: 'Gradient',                                                                helpId: 'grad.editor'  },
        layer2_hist:   { label: 'Histogram',                                                               helpId: 'grad.params'  },
        layer2_bottom: { label: 'Output',                                                                  helpId: 'grad.escape'  },
        noise:         { label: 'Noise',       description: 'High-frequency noise mixed into the surface colour.',  helpId: 'grad.noise'  },
    },
    customUI: [
        {
            componentId: 'coloring-histogram',
            group: 'layer1_hist',
            props: { layer: 1 }
        },
        {
            componentId: 'coloring-histogram',
            group: 'layer2_hist',
            props: { layer: 2 }
        }
    ],
    params: {
        // --- LAYER 1 ---
        gradient: {
            type: 'gradient',
            default: [{ id: '2', position: 1.0, color: '#ffffff', bias: 0.5, interpolation: 'linear' }],
            label: 'Gradient',
            shortId: 'g1',
            uniform: 'uGradientTexture',
            group: 'layer1_grad',
            description: 'Colour ramp sampled by Layer 1 mapping values.',
            helpId: 'grad.editor',
        },
        mode: {
            type: 'float',
            default: 0.0,
            label: 'Mapping',
            shortId: 'm1',
            uniform: 'uColorMode',
            group: 'layer1_top',
            options: mappingOptions, // Dynamic options from Registry
            description: 'Which fractal quantity drives the gradient lookup.',
            helpId: 'grad.mapping',
        },
        scale: { type: 'float', default: 1.0, label: 'Scale', shortId: 's1', uniform: 'uColorScale', group: 'layer1_hist', hidden: true },
        offset: { type: 'float', default: 0.0, label: 'Offset', shortId: 'o1', uniform: 'uColorOffset', group: 'layer1_hist', hidden: true },
        
        repeats: { type: 'float', default: 1.0, label: 'Repeats', shortId: 'r1', min: 0.1, max: 100, step: 0.1, group: 'layer1_hist', hidden: true },
        phase: { type: 'float', default: 0.0, label: 'Phase', shortId: 'p1', min: -1.0, max: 1.0, step: 0.01, group: 'layer1_hist', hidden: true },
        
        bias: { type: 'float', default: 1.0, label: 'Gamma', shortId: 'b1', uniform: 'uGradientBias', min: 0.1, max: 10.0, step: 0.01, group: 'layer1_hist', hidden: true },
        colorIter: {
            type: 'float',
            default: 0.0,
            label: 'Color Iterations',
            shortId: 'ci',
            uniform: 'uColorIter',
            min: 0, max: 24, step: 1,
            group: 'layer1_bottom',
            description: 'Stop orbit trap capture at this iteration (0 = use all iterations)',
            helpId: 'grad.escape',
            condition: {
                or: [
                    { param: 'mode', eq: 0.0 },   // Orbit Trap
                    { param: 'mode', eq: 1.0 },   // Iterations
                    { param: 'mode', eq: 7.0 },   // Raw Iterations
                    { param: 'mode', eq: 8.0 },   // Potential
                    { param: 'mode', eq: 9.0 },   // Flow
                    { param: 'mode', eq: 10.0 },  // Orbit X
                    { param: 'mode', eq: 11.0 },  // Orbit Y
                    { param: 'mode', eq: 12.0 },  // Orbit Z
                    { param: 'mode', eq: 13.0 },  // Orbit W
                    { param: 'mode2', eq: 0.0 },
                    { param: 'mode2', eq: 1.0 },
                    { param: 'mode2', eq: 7.0 },
                    { param: 'mode2', eq: 8.0 },
                    { param: 'mode2', eq: 9.0 },
                    { param: 'mode2', eq: 10.0 },
                    { param: 'mode2', eq: 11.0 },
                    { param: 'mode2', eq: 12.0 },
                    { param: 'mode2', eq: 13.0 }
                ]
            }
        },
        twist: {
            type: 'float',
            default: 0.0,
            label: 'Twist',
            shortId: 'w1',
            uniform: 'uColorTwist',
            min: -5, max: 5, step: 0.1,
            group: 'layer1_bottom',
            description: 'Rotates hues across the gradient as the lookup value grows.',
            helpId: 'grad.escape',
        },
        escape: {
            type: 'float',
            default: 4.0,
            label: 'Escape Radius',
            shortId: 'e1',
            uniform: 'uEscapeThresh',
            min: 1, max: 1000, step: 0.1,
            scale: 'log',
            group: 'layer1_bottom',
            description: 'Threshold past which the orbit is considered escaped (used by Potential, Decomposition, Flow).',
            helpId: 'grad.escape',
            condition: {
                or: [
                    { param: 'mode', eq: 6.0 }, // Decomposition
                    { param: 'mode', eq: 8.0 }, // Potential
                    { param: 'mode', eq: 9.0 }, // Green's Flow
                    { param: 'mode2', eq: 6.0 }, 
                    { param: 'mode2', eq: 8.0 },
                    { param: 'mode2', eq: 9.0 },
                    // Check Texture Mapping Modes ONLY if Texture is Active
                    {
                        and: [
                            { param: '$texturing.active', bool: true },
                            {
                                or: [
                                     { param: '$texturing.mapU', eq: 6.0 },
                                     { param: '$texturing.mapU', eq: 8.0 },
                                     { param: '$texturing.mapU', eq: 9.0 },
                                     { param: '$texturing.mapV', eq: 6.0 },
                                     { param: '$texturing.mapV', eq: 8.0 },
                                     { param: '$texturing.mapV', eq: 9.0 }
                                ]
                            }
                        ]
                    }
                ]
            }
        },

        // --- LAYER 2 ---
        gradient2: {
            type: 'gradient',
            default: [{ id: '1', position: 0.0, color: '#000000' }, { id: '2', position: 1.0, color: '#ffffff' }],
            label: 'Gradient 2',
            shortId: 'g2',
            uniform: 'uGradientTexture2',
            group: 'layer2_grad',
            description: 'Colour ramp sampled by Layer 2 mapping values, blended over Layer 1.',
            helpId: 'grad.editor',
        },
        mode2: {
            type: 'float',
            default: 4.0,
            label: 'Mapping',
            shortId: 'm2',
            uniform: 'uColorMode2',
            group: 'layer2_top',
            options: mappingOptions,
            description: 'Which fractal quantity drives the Layer 2 gradient lookup.',
            helpId: 'grad.mapping',
        },
        scale2: { type: 'float', default: 1.0, label: 'Scale 2', shortId: 's2', uniform: 'uColorScale2', group: 'layer2_hist', hidden: true },
        offset2: { type: 'float', default: 0.0, label: 'Offset 2', shortId: 'o2', uniform: 'uColorOffset2', group: 'layer2_hist', hidden: true },
        
        repeats2: { type: 'float', default: 1.0, label: 'Repeats', shortId: 'r2', min: 0.1, max: 100, step: 0.1, group: 'layer2_hist', hidden: true },
        phase2: { type: 'float', default: 0.0, label: 'Phase', shortId: 'p2', min: -1.0, max: 1.0, step: 0.01, group: 'layer2_hist', hidden: true },
        
        bias2: { type: 'float', default: 1.0, label: 'Gamma', shortId: 'b2', uniform: 'uGradientBias2', min: 0.1, max: 10.0, step: 0.01, group: 'layer2_hist', hidden: true },
        twist2: { type: 'float', default: 0.0, label: 'Twist', shortId: 'w2', uniform: 'uColorTwist2', min: -5, max: 5, step: 0.1, group: 'layer2_bottom',
            description: 'Rotates hues across Layer 2 as the lookup value grows.',
            helpId: 'grad.escape',
        },
        blendMode: {
            type: 'float',
            default: 0.0,
            label: 'Blend Mode',
            shortId: 'bm',
            uniform: 'uBlendMode',
            group: 'layer2_bottom',
            options: [
                { label: 'Mix', value: 0.0 },
                { label: 'Add', value: 1.0 },
                { label: 'Multiply', value: 2.0 },
                { label: 'Overlay', value: 3.0 },
                { label: 'Screen', value: 4.0 },
                { label: 'Bump (Normal)', value: 6.0 }
            ],
            description: 'How Layer 2 combines with Layer 1 (mix, add, multiply, overlay, screen, bump).',
            helpId: 'grad.escape',
        },
        blendOpacity: {
            type: 'float',
            default: 0.0,
            label: 'Blend Amount',
            shortId: 'bo',
            uniform: 'uBlendOpacity',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'layer2_bottom',
            description: 'Strength of the Layer 2 blend over Layer 1.',
            helpId: 'grad.escape',
        },

        // --- LAYER 3 (NOISE) ---
        layer3Color: {
            type: 'color',
            default: new THREE.Color(1,1,1),
            label: 'Noise Color',
            shortId: 'n3c',
            uniform: 'uLayer3Color',
            group: 'noise',
            layout: 'embedded',
            description: 'Tint of the procedural noise overlay.',
            helpId: 'grad.noise',
        },
        layer3Scale: { type: 'float', default: 2.0, label: 'Noise Scale', shortId: 'n3s', uniform: 'uLayer3Scale', min: 0.1, max: 2000, step: 0.1, scale: 'log', group: 'noise',
            description: 'Frequency of the noise pattern; higher = finer detail.',
            helpId: 'grad.noise',
        },
        layer3Strength: { type: 'float', default: 0.0, label: 'Mix Strength', shortId: 'n3a', uniform: 'uLayer3Strength', min: 0, max: 1, step: 0.01, group: 'noise',
            description: 'How strongly the noise tint mixes into the surface colour.',
            helpId: 'grad.noise',
        },
        layer3Bump: { type: 'float', default: 0.0, label: 'Bump', shortId: 'n3b', uniform: 'uLayer3Bump', min: -1, max: 1, step: 0.01, group: 'noise',
            description: 'Perturbs surface normals with the noise pattern for fake displacement.',
            helpId: 'grad.noise',
        },
        layer3Turbulence: { type: 'float', default: 0.0, label: 'Turbulence', shortId: 'n3t', uniform: 'uLayer3Turbulence', min: 0, max: 2, step: 0.01, group: 'noise',
            description: 'Adds higher-frequency octaves on top of the base noise.',
            helpId: 'grad.noise',
        },

        // --- ENGINE (Compile-time) ---
        layer3Enabled: {
            type: 'boolean', default: true, label: 'Load Noise (Layer 3)', shortId: 'l3e',
            group: 'engine_settings',
            ui: 'checkbox',
            description: 'Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.',
            onUpdate: 'compile',
            noReset: true
        }
    },
    inject: (builder, config, variant) => {
        const state = config.coloring as ColoringState;
        if (state?.layer3Enabled !== false) {
            builder.addDefine('LAYER3_ENABLED', '1');
        }

        // Per-component orbit trap global — must be declared before getMappingValue (which reads it)
        // and before DE_MASTER (which writes it). Preambles come before both.
        builder.addPreamble('vec4 g_orbitTrap = vec4(1e10);');
        // Float accumulator used by some imported DEC formulas for orbit trap coloring
        builder.addPreamble('float escape = 0.0;');

        // Histogram variant needs the mapping logic to show meaningful data distributions
        if (variant === 'Main' || variant === 'Histogram') {
            builder.addFunction(generateMappingShader());
        } else {
            // Physics probe only needs distance/depth, so we can stub mapping
            builder.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `);
        }
    }
};
