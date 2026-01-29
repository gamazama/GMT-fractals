
import { FractalDefinition } from '../types';
import { JULIA_REPEATER_PIPELINE } from '../data/initialPipelines';

export const Modular: FractalDefinition = {
    id: 'Modular',
    name: 'Modular Builder',
    shortDescription: 'Construct custom fractal equations using a Node Graph.',
    description: 'Construct your own fractal equation by chaining operations together. Combine folds, rotations, and logic via the Graph tab.',
    
    shader: {
        // Placeholders: The ShaderFactory intercepts 'Modular' ID 
        // and injects the dynamically compiled Graph code.
        function: ``,
        loopBody: ``,
        getDist: ``
    },

    parameters: [
        null, null, null, null // Parameters are handled dynamically by the Graph Nodes
    ],

    defaultPreset: {
        formula: 'Modular',
        features: {
            coreMath: { iterations: 16, paramA: 8, paramB: 0, paramC: 0, paramD: 0, paramE: 0, paramF: 0 },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.002 }
        },
        pipeline: JULIA_REPEATER_PIPELINE,
        cameraPos: { x: 0, y: 0, z: 4.0 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 }
    }
};
