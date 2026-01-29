
import { FeatureDefinition } from '../../engine/FeatureSystem';

export interface WebcamState {
    isEnabled: boolean;
    opacity: number;
    posX: number;
    posY: number;
    width: number;
    height: number;
    cropL: number;
    cropR: number;
    cropT: number;
    cropB: number;
    blendMode: number;
    crtMode: boolean;
    tilt: number;
    fontSize: number;
}

export const WebcamFeature: FeatureDefinition = {
    id: 'webcam',
    shortId: 'wc',
    name: 'Webcam Overlay',
    category: 'Tools',
    viewportConfig: {
        componentId: 'overlay-webcam',
        type: 'dom'
    },
    menuConfig: {
        label: 'Webcam Overlay',
        toggleParam: 'isEnabled',
        advancedOnly: true // Only show in Advanced Mode
    },
    params: {
        isEnabled: { type: 'boolean', default: false, label: 'Enabled', shortId: 'en', group: 'system', noReset: true },
        opacity: { type: 'float', default: 1.0, label: 'Opacity', shortId: 'op', min: 0, max: 3, step: 0.05, group: 'visual', noReset: true },
        posX: { type: 'float', default: 20, label: 'Position X', shortId: 'px', min: 0, max: 2000, step: 1, group: 'transform', noReset: true, hidden: true },
        posY: { type: 'float', default: 80, label: 'Position Y', shortId: 'py', min: 0, max: 2000, step: 1, group: 'transform', noReset: true, hidden: true },
        width: { type: 'float', default: 320, label: 'Width', shortId: 'w', min: 50, max: 1200, step: 1, group: 'transform', noReset: true, hidden: true },
        height: { type: 'float', default: 240, label: 'Height', shortId: 'h', min: 50, max: 1200, step: 1, group: 'transform', noReset: true, hidden: true },
        cropL: { type: 'float', default: 0, label: 'Crop Left', shortId: 'cl', min: 0, max: 0.45, step: 0.01, group: 'crop', noReset: true, hidden: true },
        cropR: { type: 'float', default: 0, label: 'Crop Right', shortId: 'cr', min: 0, max: 0.45, step: 0.01, group: 'crop', noReset: true, hidden: true },
        cropT: { type: 'float', default: 0, label: 'Crop Top', shortId: 'ct', min: 0, max: 0.45, step: 0.01, group: 'crop', noReset: true, hidden: true },
        cropB: { type: 'float', default: 0, label: 'Crop Bottom', shortId: 'cb', min: 0, max: 0.45, step: 0.01, group: 'crop', noReset: true, hidden: true },
        blendMode: { 
            type: 'float', 
            default: 0, 
            label: 'Blend Mode', 
            shortId: 'bm', 
            group: 'visual', 
            noReset: true,
            options: [
                { label: 'Normal', value: 0 },
                { label: 'Screen', value: 1 },
                { label: 'Overlay', value: 2 },
                { label: 'Lighten', value: 3 },
                { label: 'Difference', value: 4 }
            ]
        },
        crtMode: { type: 'boolean', default: false, label: 'CRT Scanlines', shortId: 'sc', group: 'visual', noReset: true },
        tilt: { type: 'float', default: 0, label: '3D Tilt', shortId: 'tl', min: -45, max: 45, step: 1, group: 'transform', noReset: true },
        fontSize: { type: 'float', default: 12, label: 'Overlay Font Size', shortId: 'fs', min: 8, max: 32, step: 1, group: 'visual', noReset: true }
    }
};
