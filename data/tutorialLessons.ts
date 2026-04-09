
import type { FractalStoreState, FractalActions } from '../types';
import { registry } from '../engine/FractalRegistry';
import type { Preset } from '../types/fractal';

// --- Trigger Types ---

export type TriggerType =
    | { kind: 'value'; path: string; compare: 'eq' | 'lte' | 'gte'; value: number; tolerance?: number; waitForRelease?: boolean; abs?: boolean }
    | { kind: 'bool'; path: string; value: boolean }
    | { kind: 'mode'; param: 'cameraMode'; value: string }
    | { kind: 'tab'; tabId: string }
    | { kind: 'delay'; ms: number }
    | { kind: 'delta'; path: string; waitForRelease?: boolean }
    | { kind: 'compound'; conditions: TriggerType[] }
    | { kind: 'keypress'; keys: string[] }
    | { kind: 'keypress_all'; keys: string[] }
    | { kind: 'action'; action: string }
    | { kind: 'manual' };

export interface TutorialStep {
    id: string;
    text: string;
    subtext?: string;
    highlightTargets?: string[];
    trigger: TriggerType;
    forceTab?: string;
    onEnter?: (store: FractalStoreState & FractalActions) => void;
    onExit?: (store: FractalStoreState & FractalActions) => void;
    beginButton?: boolean;
    allowManual?: boolean;     // Show Next button even for non-manual triggers
    showKeys?: string[];       // Key caps to display and highlight on press
    nextStepsMode?: boolean;
    autoStartLesson?: number;  // Auto-chain to this lesson on completion
}

export interface TutorialLesson {
    id: number;
    title: string;
    subtitle: string;
    lockNavigation: boolean;
    onStart?: (store: FractalStoreState & FractalActions) => void;
    steps: TutorialStep[];
}

// --- Lesson Definitions ---

const lesson1: TutorialLesson = {
    id: 1,
    title: 'The Mandelbulb',
    subtitle: 'Slider controls & quality',
    lockNavigation: true,
    onStart: (store) => {
        const def = registry.get('Mandelbulb');
        if (def?.defaultPreset) {
            if (store.formula !== 'Mandelbulb') {
                store.setFormula('Mandelbulb' as any);
            } else {
                store.loadPreset(JSON.parse(JSON.stringify(def.defaultPreset)) as Preset);
                store.resetCamera();
            }
        }
        if (store.cameraMode !== 'Orbit') store.setCameraMode('Orbit');
        store.setActiveTab('Formula');
    },
    steps: [
        {
            id: 'l1-intro',
            text: 'The Mandelbulb',
            subtext: 'Once thought to be the holy grail of the Mandelbrot set in 3D.',
            highlightTargets: ['tab-Formula'],
            trigger: { kind: 'manual' },
            beginButton: true,
        },
        {
            id: 'l1-iterations',
            text: 'Fractals are recursive mathematical structures. Try decreasing Iterations to see how this one forms.',
            subtext: 'Set it all the way down to 1.',
            highlightTargets: ['iterations'],
            forceTab: 'Formula',
            trigger: { kind: 'value', path: 'coreMath.iterations', compare: 'eq', value: 1, waitForRelease: true },
        },
        {
            id: 'l1-power',
            text: 'Power is a variable in the formula that creates this shape (Z\u207F). Set it to 5.',
            subtext: 'Hold Alt or Shift while dragging for 10\u00D7 or 0.1\u00D7 precision.',
            highlightTargets: ['paramA'],
            trigger: { kind: 'value', path: 'coreMath.paramA', compare: 'eq', value: 5, tolerance: 0.5, waitForRelease: true },
        },
        {
            id: 'l1-phase',
            text: 'Phase controls the position of the mathematical landscape relative to the sphere.',
            subtext: 'Try the dual-axis pad. Alt and Shift work here too.',
            highlightTargets: ['vec2A'],
            trigger: {
                kind: 'compound',
                conditions: [
                    { kind: 'delta', path: 'coreMath.vec2A.x', waitForRelease: true },
                    { kind: 'delta', path: 'coreMath.vec2A.y', waitForRelease: true },
                ],
            },
        },
        {
            id: 'l1-twist-radiolaria',
            text: 'Sliders in GMT have no min or max \u2014 drag on the textured area to set any value. Set some Z Twist and enable Radiolaria.',
            highlightTargets: ['paramD', 'vec2B'],
            trigger: {
                kind: 'compound',
                conditions: [
                    { kind: 'value', path: 'coreMath.paramD', compare: 'gte', value: 0.01, waitForRelease: true, abs: true },
                    { kind: 'value', path: 'coreMath.vec2B.x', compare: 'gte', value: 0.5, waitForRelease: true },
                ],
            },
        },
        {
            id: 'l1-artifacts',
            text: 'See those slicing artifacts? Rendering fractals fast means estimating depth from the camera. When the estimate can\'t account for twist and radiolaria, we need the Quality tab.',
            highlightTargets: ['tab-Quality'],
            trigger: { kind: 'tab', tabId: 'Quality' },
        },
        {
            id: 'l1-step-jitter',
            text: 'Step Jitter blends those slices smoothly. Turn it off to see the raw slicing.',
            highlightTargets: ['stepJitter'],
            forceTab: 'Quality',
            trigger: { kind: 'value', path: 'quality.stepJitter', compare: 'eq', value: 0, tolerance: 0.01, waitForRelease: true },
        },
        {
            id: 'l1-slice-opt',
            text: 'The ray is overshooting the fractal surface, causing the slicing. Reduce Slice Optimization to take smaller steps.',
            highlightTargets: ['fudgeFactor'],
            trigger: { kind: 'value', path: 'quality.fudgeFactor', compare: 'lte', value: 0.05, waitForRelease: true },
        },
        {
            id: 'l1-max-steps',
            text: 'Now there aren\'t enough ray steps to reach the fractal with such small slices. Increase Max Ray Steps.',
            highlightTargets: ['maxSteps'],
            trigger: { kind: 'value', path: 'quality.maxSteps', compare: 'gte', value: 200, waitForRelease: true },
            onEnter: (store) => {
                store.setQuality({ maxSteps: 64 } as any);
            },
        },
        {
            id: 'l1-reset',
            text: 'Things will run slowly with these settings. Let\'s reset to reasonable defaults and move on.',
            trigger: { kind: 'manual' },
            onEnter: (store) => {
                store.setQuality({ stepJitter: 0.15, fudgeFactor: 0.5, maxSteps: 300 } as any);
                store.setCoreMath({ iterations: 7, paramA: 8, paramD: 0, vec2B: { x: 0, y: 0.5 } } as any);
            },
        },
        {
            id: 'l1-julia-toggle',
            text: 'Julia mode is available for some fractals. It uses a static coordinate in the calculation. Toggle it on.',
            forceTab: 'Formula',
            highlightTargets: ['juliaMode'],
            trigger: { kind: 'bool', path: 'geometry.juliaMode', value: true },
        },
        {
            id: 'l1-julia-pick',
            text: 'Now pick a coordinate by clicking this button, then drag over the fractal.',
            highlightTargets: ['pick-julia'],
            trigger: { kind: 'delta', path: 'geometry.juliaX' },
        },
        {
            id: 'l1-julia-drag',
            text: 'Drag around to explore different Julia sets...',
            trigger: { kind: 'delay', ms: 2000 },
            autoStartLesson: 2,
        },
    ],
};

const lesson2: TutorialLesson = {
    id: 2,
    title: "It's Time to Fly",
    subtitle: 'Navigation & camera controls',
    lockNavigation: false,
    onStart: (store) => {
        // Only reset if NOT chaining from lesson 1 (check if julia is active = came from lesson 1)
        const comingFromLesson1 = store.formula === 'Mandelbulb' && (store as any).geometry?.juliaMode;
        if (!comingFromLesson1) {
            const def = registry.get('Mandelbulb');
            if (def?.defaultPreset) {
                if (store.formula !== 'Mandelbulb') {
                    store.setFormula('Mandelbulb' as any);
                } else {
                    store.loadPreset(JSON.parse(JSON.stringify(def.defaultPreset)) as Preset);
                    store.resetCamera();
                }
            }
        }
        if (store.cameraMode !== 'Orbit') store.setCameraMode('Orbit');
    },
    steps: [
        {
            id: 'l2-fly',
            text: 'Press Tab to enter Fly mode.',
            showKeys: ['Tab'],
            trigger: { kind: 'mode', param: 'cameraMode', value: 'Fly' },
        },
        {
            id: 'l2-look',
            text: 'Drag the mouse to look around.',
            trigger: { kind: 'delta', path: 'cameraRot' },
        },
        {
            id: 'l2-wasd',
            text: 'Use WASD to fly forward, back, and strafe. Try each key.',
            showKeys: ['W', 'A', 'S', 'D'],
            trigger: { kind: 'keypress_all', keys: ['w', 'a', 's', 'd'] },
        },
        {
            id: 'l2-boost',
            text: 'Hold Shift to boost your speed.',
            showKeys: ['Shift'],
            trigger: { kind: 'keypress_all', keys: ['shift'] },
        },
        {
            id: 'l2-vertical',
            text: 'Space to move up, C to move down. Try both.',
            showKeys: ['Space', 'C'],
            trigger: { kind: 'keypress_all', keys: [' ', 'c'] },
        },
        {
            id: 'l2-roll',
            text: 'Q and E to roll the camera. Try both.',
            showKeys: ['Q', 'E'],
            trigger: { kind: 'keypress_all', keys: ['q', 'e'] },
        },
        {
            id: 'l2-speed',
            text: 'Fine-tune your movement by adjusting the speed slider. You can also use the scroll wheel.',
            highlightTargets: ['speed-slider'],
            trigger: { kind: 'delta', path: 'navigation.flySpeed', waitForRelease: true },
            allowManual: true,
        },
        {
            id: 'l2-reset',
            text: 'The Reset Camera button appears when you get too close or too far. You can also reset from the Camera menu.',
            highlightTargets: ['reset-camera'],
            trigger: { kind: 'manual' },
        },
        {
            id: 'l2-orbit',
            text: 'Press Tab to switch back to Orbit mode.',
            showKeys: ['Tab'],
            trigger: { kind: 'mode', param: 'cameraMode', value: 'Orbit' },
        },
        {
            id: 'l2-orbit-controls',
            text: 'Now perfect your shot. Left-click to orbit, right-click to pan, scroll to zoom.',
            subtext: 'The distance to the surface is shown at the bottom.',
            trigger: { kind: 'manual' },
        },
        {
            id: 'l2-next-steps',
            text: 'Next steps:',
            nextStepsMode: true,
            trigger: { kind: 'manual' },
        },
    ],
};

export const TUTORIAL_LESSONS: TutorialLesson[] = [lesson1, lesson2];

export const NEXT_STEPS_ITEMS = [
    { label: 'Save a snapshot', target: 'snapshot-btn' },
    { label: 'Do a hi-res render', target: 'bucket-btn' },
    { label: 'Adjust camera, colour, effects and fog', target: 'tab-Scene' },
    { label: 'Change the look of the material', target: 'tab-Shader' },
    { label: 'Adjust surface colours', target: 'tab-Gradient' },
    { label: 'Change quality parameters and resolution', target: 'tab-Quality' },
];
