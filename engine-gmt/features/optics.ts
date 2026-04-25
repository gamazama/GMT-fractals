
import { FeatureDefinition } from '../engine/FeatureSystem';

export interface OpticsState {
    camType: number;
    camFov: number;
    orthoScale: number;
    dofStrength: number;
    dofFocus: number;
}

export const OpticsFeature: FeatureDefinition = {
    id: 'optics',
    shortId: 'o',
    name: 'Camera Optics',
    category: 'Scene',
    tabConfig: { label: 'Scene' },
    customUI: [
        { componentId: 'optics-controls', group: 'projection', parentId: 'camType', condition: { eq: 0.0 } },
        { componentId: 'optics-dof-controls', group: 'dof', parentId: 'dofStrength', condition: { gt: 0.0 } }
    ],
    params: {
        camType: { type: 'float', default: 0.0, label: 'Projection', shortId: 'ct', uniform: 'uCamType', group: 'projection', options: [{ label: 'Perspective', value: 0.0 }, { label: 'Orthographic', value: 1.0 }, { label: '360° Skybox', value: 2.0 }],
            description: 'Camera projection: perspective, orthographic, or equirectangular skybox.',
            helpId: 'cam.mode',
        },
        // Fov is handled by custom control now, but we keep param for state
        camFov: { type: 'float', default: 60, label: 'Field of View', shortId: 'fv', min: 10, max: 150, step: 1, group: 'projection', hidden: true, condition: { param: 'camType', eq: 0.0 } },
        orthoScale: { type: 'float', default: 2.0, label: 'Ortho Scale', shortId: 'os', min: 0.1, max: 10.0, step: 0.1, scale: 'log', group: 'projection', parentId: 'camType', condition: { param: 'camType', eq: 1.0 },
            description: 'World-space size of the orthographic view rectangle.',
            helpId: 'cam.fov',
        },
        dofStrength: {
            type: 'float', default: 0.0, label: 'Camera Blur', shortId: 'ds', uniform: 'uDOFStrength',
            min: 0.0, max: 1.0, step: 0.0001, scale: 'log', group: 'dof',
            format: (v) => {
                if (v === 0) return "0.0 (off)";
                if (Math.abs(v) < 0.001) return v.toFixed(5);
                if (Math.abs(v) < 10.0) return v.toFixed(4);
                return v.toFixed(2);
            },
            description: 'Aperture strength for depth-of-field blur.',
            helpId: 'dof.settings',
        },
        dofFocus: { type: 'float', default: 10.0, label: 'Focus Distance', shortId: 'df', uniform: 'uDOFFocus', min: 0.000001, max: 10000.0, step: 0.000001, scale: 'log', group: 'dof', parentId: 'dofStrength', condition: { gt: 0.0 },
            description: 'Distance from the camera that stays in sharp focus.',
            helpId: 'dof.settings',
        }
    }
};
