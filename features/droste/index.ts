
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { DROSTE_MATH } from './shader';

export interface DrosteState {
    active: boolean;
    tiling: number;
    center: THREE.Vector2;
    radiusInside: number;
    radiusOutside: number;
    periodicity: number;
    strands: number;
    autoPeriodicity: boolean;
    strandMirror: boolean;
    zoom: number;
    rotate: number;
    rotateSpin: number;
    rotatePolar: number;
    twist: boolean;
    hyperDroste: boolean;
    fractalPoints: number;
}

export const DrosteFeature: FeatureDefinition = {
    id: 'droste',
    shortId: 'dr',
    name: 'Droste Effect',
    category: 'Effects',
    params: {
        active: {
            type: 'boolean',
            default: false,
            label: 'Enable Droste',
            shortId: 'ac',
            uniform: 'uDrosteActive',
            group: 'main', 
            noReset: true
        },
        tiling: {
            type: 'float', 
            default: 1.0, 
            label: 'Tiling Mode',
            shortId: 'tm',
            uniform: 'uDrosteTiling',
            group: 'geometry',
            noReset: true,
            condition: { param: 'active', bool: true },
            options: [
                { label: 'Repeat', value: 0.0 },
                { label: 'Mirror', value: 1.0 },
                { label: 'Clamp', value: 2.0 },
                { label: 'Transparent', value: 3.0 }
            ]
        },
        center: {
            type: 'vec2',
            default: new THREE.Vector2(0, 0),
            label: 'Center Shift',
            shortId: 'cs',
            uniform: 'uDrosteCenter',
            min: -100, max: 100, step: 0.1,
            group: 'geometry',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        radiusInside: {
            type: 'float',
            default: 5.0,
            label: 'Inner Rad',
            shortId: 'r1',
            uniform: 'uDrosteR1',
            min: 0.1, max: 100, step: 0.1,
            group: 'geometry',
            layout: 'half',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        radiusOutside: {
            type: 'float',
            default: 100.0,
            label: 'Outer Rad',
            shortId: 'r2',
            uniform: 'uDrosteR2',
            min: 1.0, max: 200, step: 0.1,
            group: 'geometry',
            layout: 'half',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        periodicity: {
            type: 'float',
            default: 2.0,
            label: 'Periodicity',
            shortId: 'p1',
            uniform: 'uDrostePeriodicity',
            min: -10, max: 10, step: 0.1,
            group: 'structure',
            condition: [{ param: 'active', bool: true }, { param: 'autoPeriodicity', bool: false }], 
            noReset: true
        },
        strands: {
            type: 'float',
            default: 2.0,
            label: 'Strands',
            shortId: 'p2',
            uniform: 'uDrosteStrands',
            min: -12, max: 12, step: 1,
            group: 'structure',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        autoPeriodicity: {
            type: 'boolean',
            default: false,
            label: 'Auto Period',
            shortId: 'ap',
            uniform: 'uDrosteAuto',
            group: 'structure',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        strandMirror: {
            type: 'boolean',
            default: false,
            label: 'Mirror Strand',
            shortId: 'sm',
            uniform: 'uDrosteMirror',
            group: 'structure',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        zoom: {
            type: 'float',
            default: 0.0,
            label: 'Zoom',
            shortId: 'zm',
            uniform: 'uDrosteZoom',
            min: -10, max: 10, step: 0.1,
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        rotate: {
            type: 'float',
            default: 0.0,
            label: 'Spiral Rotate',
            shortId: 'ro',
            uniform: 'uDrosteRotate',
            min: -360, max: 360, step: 1,
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        rotateSpin: {
            type: 'float',
            default: 0.0,
            label: 'Image Spin',
            shortId: 'sp',
            uniform: 'uDrosteSpin',
            min: -360, max: 360, step: 1,
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        rotatePolar: {
            type: 'float',
            default: 0.0,
            label: 'Polar Rotate',
            shortId: 'pr',
            uniform: 'uDrostePolar',
            min: -360, max: 360, step: 1,
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        twist: {
            type: 'boolean',
            default: true,
            label: 'Twist (Conformal)',
            shortId: 'tw',
            uniform: 'uDrosteTwist',
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        hyperDroste: {
            type: 'boolean',
            default: false,
            label: 'Hyper Droste',
            shortId: 'hd',
            uniform: 'uDrosteHyper',
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true
        },
        fractalPoints: {
            type: 'float',
            default: 1.0,
            label: 'Fractal Points',
            shortId: 'fp',
            uniform: 'uDrosteFractal',
            min: 0, max: 10, step: 1,
            group: 'transform',
            condition: [{ param: 'active', bool: true }, { param: 'hyperDroste', bool: true }],
            noReset: true
        }
    },
    shader: {
        functions: DROSTE_MATH,
        mainUV: `
            if (uDrosteActive > 0.5) {
                vec3 res = applyDroste(
                    sampleUV, 
                    uDrosteCenter, 
                    uDrosteR1, 
                    uDrosteR2, 
                    uDrostePeriodicity, 
                    uDrosteStrands, 
                    uDrosteZoom, 
                    uDrosteRotate, 
                    uDrosteTwist > 0.5,
                    uDrosteTiling,
                    uDrosteSpin,
                    uDrosteHyper > 0.5,
                    (uDrosteHyper > 0.5 ? uDrosteFractal : 0.0),
                    uDrosteAuto > 0.5,
                    uDrosteMirror > 0.5,
                    uDrostePolar
                );
                sampleUV = res.xy;
                mask = res.z;
            }
        `
    }
};
