
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
            label: 'Droste Effect',
            shortId: 'ac',
            uniform: 'uDrosteActive',
            group: 'main',
            noReset: true,
            description: 'Enable the recursive Droste image-in-image post effect.',
            helpId: 'effect.droste',
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
            ],
            description: 'How sampled coordinates wrap outside the source rectangle.',
            helpId: 'droste.geometry',
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
            noReset: true,
            description: 'Pixel offset of the spiral centre on screen.',
            helpId: 'droste.geometry',
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
            noReset: true,
            description: 'Inner ring radius of the recursion.',
            helpId: 'droste.geometry',
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
            noReset: true,
            description: 'Outer ring radius; ratio with inner controls scaling per loop.',
            helpId: 'droste.geometry',
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
            noReset: true,
            description: 'Number of spiral arms (sign flips chirality).',
            helpId: 'droste.structure',
        },
        strandMirror: {
            type: 'boolean',
            default: false,
            label: 'Mirror Strand',
            shortId: 'sm',
            uniform: 'uDrosteMirror',
            group: 'structure',
            parentId: 'strands',
            condition: { param: 'active', bool: true },
            noReset: true,
            description: 'Mirrors alternating strands for kaleidoscopic symmetry.',
            helpId: 'droste.structure',
        },
        autoPeriodicity: {
            type: 'boolean',
            default: false,
            label: 'Auto Period',
            shortId: 'ap',
            uniform: 'uDrosteAuto',
            group: 'structure',
            condition: { param: 'active', bool: true },
            noReset: true,
            description: 'Solve periodicity automatically from inner/outer radii.',
            helpId: 'droste.structure',
        },
        periodicity: {
            type: 'float',
            default: 2.0,
            label: 'Periodicity',
            shortId: 'p1',
            uniform: 'uDrostePeriodicity',
            min: -10, max: 10, step: 0.1,
            group: 'structure',
            parentId: 'autoPeriodicity',
            condition: [{ param: 'active', bool: true }, { param: 'autoPeriodicity', bool: false }],
            noReset: true,
            description: 'How many recursion loops complete before tiling repeats.',
            helpId: 'droste.structure',
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
            noReset: true,
            description: 'Zoom along the spiral; animate to drive infinite-zoom motion.',
            helpId: 'droste.transform',
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
            noReset: true,
            description: 'Twist of the spiral path in degrees.',
            helpId: 'droste.transform',
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
            noReset: true,
            description: 'Rotates the sampled image content independently of the spiral.',
            helpId: 'droste.transform',
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
            noReset: true,
            description: 'Rotates the polar coordinate map before applying the spiral.',
            helpId: 'droste.transform',
        },
        twist: {
            type: 'boolean',
            default: true,
            label: 'Twist (Conformal)',
            shortId: 'tw',
            uniform: 'uDrosteTwist',
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true,
            description: 'Use the conformal Escher mapping; off gives a non-conformal spiral.',
            helpId: 'droste.transform',
        },
        hyperDroste: {
            type: 'boolean',
            default: false,
            label: 'Hyper Droste',
            shortId: 'hd',
            uniform: 'uDrosteHyper',
            group: 'transform',
            condition: { param: 'active', bool: true },
            noReset: true,
            description: 'Modular multi-point variant of the Droste mapping.',
            helpId: 'droste.transform',
        },
        fractalPoints: {
            type: 'float',
            default: 1.0,
            label: 'Fractal Points',
            shortId: 'fp',
            uniform: 'uDrosteFractal',
            min: 0, max: 10, step: 1,
            group: 'transform',
            parentId: 'hyperDroste',
            condition: [{ param: 'active', bool: true }, { param: 'hyperDroste', bool: true }],
            noReset: true,
            description: 'Number of fractal centres in the Hyper Droste mapping.',
            helpId: 'droste.transform',
        }
    },
    postShader: {
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
