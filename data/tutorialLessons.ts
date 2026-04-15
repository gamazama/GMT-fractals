
import type { FractalStoreState, FractalActions } from '../types';
import { registry } from '../engine/FractalRegistry';
import type { Preset } from '../types/fractal';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';

// --- Trigger Types ---

export type TriggerType =
    | { kind: 'value'; path: string; compare: 'eq' | 'lte' | 'gte'; value: number; tolerance?: number; waitForRelease?: boolean; abs?: boolean; settleMs?: number }
    | { kind: 'bool'; path: string; value: boolean | string | null }
    | { kind: 'mode'; param: 'cameraMode'; value: string }
    | { kind: 'tab'; tabId: string }
    | { kind: 'delay'; ms: number }
    | { kind: 'delta'; path: string; waitForRelease?: boolean; settleMs?: number }
    | { kind: 'compound'; conditions: TriggerType[] }  // ALL must be true
    | { kind: 'or'; conditions: TriggerType[] }        // ANY must be true
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
    positionOffset?: { x?: number; y?: number };  // Offset applied to computed panel position
    positionTarget?: string | string[];  // data-tut key(s) for card placement — first found wins (overrides highlightTargets)
    positionSide?: 'below';     // Force card below the target (skips left/right preference)
    positionAlign?: 'start';    // Left-align card to target's left edge (below placement only)
    buttonLabel?: string;       // Custom label for the manual-advance button
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
            text: 'Sliders in GMT have no min or max \u2014 drag on the textured area to set any value.',
            subtext: 'Set some Z Twist and enable Radiolaria.',
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
            subtext: 'Set it to around 0.05.',
            highlightTargets: ['fudgeFactor'],
            trigger: { kind: 'value', path: 'quality.fudgeFactor', compare: 'lte', value: 0.1, waitForRelease: true },
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
            text: 'These settings can slow things down. I\'ve reset to reasonable defaults.',
            subtext: 'Let\'s move on.',
            positionTarget: 'maxSteps',
            trigger: { kind: 'manual' },
            onEnter: (store) => {
                store.setQuality({ stepJitter: 0.15, fudgeFactor: 0.5, maxSteps: 300 } as any);
                store.setCoreMath({ iterations: 7, paramA: 8, paramD: 0, vec2B: { x: 0, y: 0.5 } } as any);
            },
        },
        {
            id: 'l1-julia-toggle',
            text: 'Julia mode is available for some fractals. It uses a static coordinate in the calculation.',
            subtext: 'Toggle it on.',
            forceTab: 'Formula',
            highlightTargets: ['juliaMode'],
            trigger: { kind: 'bool', path: 'geometry.juliaMode', value: true },
        },
        {
            id: 'l1-julia-pick',
            text: 'Now pick a coordinate.',
            subtext: 'Click this button, then drag over the fractal.',
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
            positionTarget: 'right-dock',
            trigger: { kind: 'manual' },
        },
        {
            id: 'l2-next-steps',
            text: 'Next steps:',
            nextStepsMode: true,
            trigger: { kind: 'manual' },
            buttonLabel: 'Continue to Lesson 3 \u2014 The Light Studio',
            autoStartLesson: 3,
        },
    ],
};

const lesson3: TutorialLesson = {
    id: 3,
    title: 'The Light Studio',
    subtitle: 'Lights, gizmos & camera attachment',
    lockNavigation: false,
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
            id: 'l3-intro',
            text: "Let\u2019s start with an interesting shape.",
            subtext: "Click the hamburger menu \u2630 next to the formula name.",
            highlightTargets: ['formula-hamburger'],
            positionTarget: 'right-dock',
            trigger: { kind: 'bool', path: 'contextMenu.visible', value: true },
        },
        {
            id: 'l3-randomize',
            text: 'Click Parameters in the Randomize section to get a random Mandelbulb shape.',
            subtext: 'You can undo / redo this with Ctrl+Z / Ctrl+Y.\nClick Ok when you have a shape you like.',
            highlightTargets: ['formula-hamburger'],
            positionTarget: 'right-dock',
            trigger: { kind: 'manual' },
            buttonLabel: "Ok, let's go",
        },
        {
            id: 'l3-add-light',
            text: "It\u2019s dark in here.",
            subtext: "Drag one of the three colored circles from the top bar onto the canvas to bring in a light.",
            highlightTargets: ['light-orbs'],
            positionOffset: { y: 40 },
            onEnter: (store) => {
                // Darken the scene — turn off all lights and ensure light 0 is a Point type
                const lights: any[] = (store as any).lighting?.lights ?? [];
                const reset = lights.map((l: any, i: number) => ({
                    ...l,
                    visible: false,
                    type: i === 0 ? 'Point' : l.type,
                    fixed: false,
                    intensity: i === 0 ? l.intensity : 1.5,
                }));
                (store as any).setLighting({ lights: reset });
                // Force the renderer to pick up the lighting change immediately
                FractalEvents.emit(FRACTAL_EVENTS.RESET_ACCUM, undefined);
            },
            trigger: {
                kind: 'compound',
                conditions: [
                    { kind: 'delta', path: 'lighting.lights', settleMs: 200 },
                    { kind: 'bool', path: 'draggedLightIndex', value: null },
                ],
            },
        },
        {
            id: 'l3-gizmo',
            text: 'The gizmo! Move it around.',
            subtext: '1. Arrows \u2014 drag along one axis\n2. Squares \u2014 drag along two axes\n3. White circle \u2014 drag relative to the camera',
            positionTarget: ['light-gizmo-label-0', 'light-gizmo-label-1', 'light-gizmo-label-2'],
            positionSide: 'below',
            trigger: { kind: 'delta', path: 'lighting.lights', settleMs: 800, waitForRelease: true },
            allowManual: true,
        },
        {
            id: 'l3-anchor',
            text: 'The light is world-anchored.',
            subtext: 'Click the anchor icon to attach it to the camera instead.',
            highlightTargets: ['gizmo-anchor-0', 'gizmo-anchor-1', 'gizmo-anchor-2'],
            positionTarget: ['gizmo-anchor-0', 'gizmo-anchor-1', 'gizmo-anchor-2'],
            positionSide: 'below',
            trigger: { kind: 'delta', path: 'lighting.lights', settleMs: 400 },
        },
        {
            id: 'l3-hide-gizmo',
            text: 'When anchored, the gizmo axis becomes relative to the camera.\nIt\u2019s often easier to adjust light position this way.',
            subtext: 'Hide the gizmos with this button.',
            highlightTargets: ['light-gizmo-btn'],
            onEnter: (store) => {
                (store as any).setShowLightGizmo(true);
            },
            trigger: { kind: 'bool', path: 'showLightGizmo', value: false },
        },
        {
            id: 'l3-popup',
            text: 'Hover over an active light orb to open its settings — power, colour, range, and cast shadows.',
            highlightTargets: ['light-orbs'],
            positionOffset: { y: 40 },
            trigger: { kind: 'value', path: 'openLightPopupIndex', compare: 'gte', value: 0 },
        },
        {
            id: 'l3-directional',
            text: "Most of these settings are straightforward. Let\u2019s look at directional lights.",
            subtext: 'Select Directional (Sun) from the menu.',
            highlightTargets: ['light-popup-menu'],
            positionTarget: 'light-orbs',
            positionOffset: { y: 360 },
            trigger: {
                kind: 'or',
                conditions: [
                    { kind: 'bool', path: 'lighting.lights.0.type', value: 'Directional' },
                    { kind: 'bool', path: 'lighting.lights.1.type', value: 'Directional' },
                    { kind: 'bool', path: 'lighting.lights.2.type', value: 'Directional' },
                ],
            },
        },
        {
            id: 'l3-direction-pad',
            text: 'The directional controls are relative to the camera, with light coming from behind the camera in the centre, and behind the fractal at the edges.',
            positionTarget: 'light-orbs',
            positionOffset: { y: 360 },
            trigger: { kind: 'manual' },
        },
        {
            id: 'l3-expand',
            text: 'GMT supports up to 8 lights. You can access them from here.',
            highlightTargets: ['lights-expand'],
            positionTarget: 'lights-expand',
            positionSide: 'below',
            positionAlign: 'start',
            trigger: { kind: 'manual' },
            buttonLabel: 'Continue to Lesson 4 \u2014 Shadows',
            autoStartLesson: 4,
        },
    ],
};

const lesson4: TutorialLesson = {
    id: 4,
    title: 'Shadows',
    subtitle: 'Hard shadows, steps & area lights',
    lockNavigation: false,
    onStart: (store) => {
        // Keep whatever shape is loaded (may be chaining from lesson 3)
        // Ensure at least one visible Point light
        const lights: any[] = (store as any).lighting?.lights ?? [];
        if (!lights.some((l: any) => l.visible)) {
            (store as any).setLighting({
                lights: lights.map((l: any, i: number) =>
                    i === 0 ? { ...l, visible: true, type: 'Point' } : l
                ),
            });
        }
        // Shadows on, reset to soft defaults, area lights off, disable stochastic shadows
        (store as any).setLighting({
            shadows: true,
            shadowsCompile: true,
            shadowSoftness: 16.0,
            shadowSteps: 128,
            areaLights: false,
            ptStochasticShadows: false,
        });
        // Reset shadows subsystem to Medium so l4-vp-apply trigger (gte 3 = Full) doesn't fire immediately
        (store as any).setSubsystemTier?.('shadows', 2);
        if (store.cameraMode !== 'Orbit') store.setCameraMode('Orbit');
    },
    steps: [
        {
            id: 'l4-open',
            text: 'Open the shadow panel to see the controls.',
            subtext: 'Click the shadow icon in the light bar above.',
            highlightTargets: ['shadow-btn'],
            trigger: { kind: 'bool', path: 'shadowPanelOpen', value: true },
            positionOffset: { y: 40 },
        },
        {
            id: 'l4-hardness',
            text: "Let's get some hard shadows. Crank the Hardness slider all the way up.",
            highlightTargets: ['ss'],
            positionTarget: 'shadow-panel',
            trigger: { kind: 'value', path: 'lighting.shadowSoftness', compare: 'gte', value: 1800, waitForRelease: true },
        },
        {
            id: 'l4-steps',
            text: "It doesn't look quite right yet. Hard shadows need more ray steps to reach the surface.",
            subtext: 'Increase Shadow Steps, but stop when the shadows look fully formed — steps are expensive.',
            highlightTargets: ['st'],
            positionTarget: 'shadow-panel',
            trigger: { kind: 'value', path: 'lighting.shadowSteps', compare: 'gte', value: 200, waitForRelease: true, settleMs: 300 },
            allowManual: true,
        },
        {
            id: 'l4-vp-intro',
            text: "GMT also has area light shadows, but they\u2019re disabled by default. Open Viewport Quality to enable them.",
            highlightTargets: ['viewport-quality-btn'],
            trigger: { kind: 'bool', path: 'vpQualityOpen', value: true },
            positionOffset: { y: 40 },
        },
        {
            id: 'l4-vp-apply',
            text: 'Set Shadows to Full and click Apply.',
            subtext: 'Full mode compiles in area light shadows and takes a few seconds.',
            highlightTargets: ['viewport-quality-btn'],
            positionOffset: { y: 40 },
            trigger: { kind: 'value', path: 'scalability.subsystems.shadows', compare: 'gte', value: 3 },
        },
        {
            id: 'l4-area-toggle',
            text: 'Area light shadows are now compiled in.',
            subtext: 'Enable them with the Area button.',
            highlightTargets: ['shadow-area-btn'],
            positionTarget: 'shadow-panel',
            onEnter: (store) => {
                (store as any).setShadowPanelOpen(true);
            },
            trigger: { kind: 'bool', path: 'lighting.areaLights', value: true },
        },
        {
            id: 'l4-accumulate',
            text: 'Area shadows render as noisy at first and get smoother as samples accumulate. Watch the image converge.',
            trigger: { kind: 'delay', ms: 3500 },
        },
        {
            id: 'l4-softness',
            text: 'They look more realistic when soft, especially for ambient scenes. Open the shadow panel and reduce the Hardness.',
            highlightTargets: ['ss'],
            positionTarget: 'shadow-panel',
            trigger: { kind: 'value', path: 'lighting.shadowSoftness', compare: 'lte', value: 50, waitForRelease: true },
            allowManual: true,
        },
        {
            id: 'l4-done',
            text: 'Next steps:',
            nextStepsMode: true,
            trigger: { kind: 'manual' },
        },
    ],
};

export const TUTORIAL_LESSONS: TutorialLesson[] = [lesson1, lesson2, lesson3, lesson4];

export const NEXT_STEPS_ITEMS = [
    { label: 'Save a snapshot', target: 'snapshot-btn' },
    { label: 'Do a hi-res render', target: 'bucket-btn' },
    { label: 'Adjust camera, colour, effects and fog', target: 'tab-Scene' },
    { label: 'Change the look of the material', target: 'tab-Shader' },
    { label: 'Adjust surface colours', target: 'tab-Gradient' },
    { label: 'Change quality parameters and resolution', target: 'tab-Quality' },
];
