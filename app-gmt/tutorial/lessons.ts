/**
 * GMT tutorial lessons — ported from stable's data/tutorialLessons.ts with
 * mechanical updates:
 *   - Anchor IDs come from ANCHOR catalog, not free strings.
 *   - `nextStepsMode: true` → `kind: 'next-steps'` (custom step renderer).
 *   - `positionTarget/Side/Align/Offset` → unified `position` config.
 *   - `action: 'resetCamera'` triggers replaced by `actionBus.fire(name)`
 *     at the call site. Lessons subscribe via `kind: 'action', name: ...`.
 *   - `lockNavigation` field dropped — it was declared but never consumed
 *     in stable.
 */

import { registry } from '../../engine-gmt/engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import type { TutorialLesson } from '../../engine/plugins/Tutorial';
import { ANCHOR } from './anchors';
import { asOneEdit } from './effects';
import type { Preset, EngineStoreState, EngineActions } from '../../types';

// Side-effect import: declaration-merges GMT's DDFS feature state types
// into FeatureStateMap, so `Store` exposes typed `coreMath`, `lighting`,
// `quality`, `geometry`, etc. instead of `any`. The augmentation lives in
// engine-gmt/storeTypes.ts and is also imported by registerFeatures.ts.
import '../../engine-gmt/storeTypes';

type Store = EngineStoreState & EngineActions;

const seedMandelbulb = (store: Store) => {
    const def = registry.get('Mandelbulb' as any);
    if (!def?.defaultPreset) return;
    if (store.formula !== 'Mandelbulb') {
        store.setFormula('Mandelbulb');
    } else {
        store.loadPreset(JSON.parse(JSON.stringify(def.defaultPreset)) as Preset);
        store.resetCamera();
    }
};

const lesson1: TutorialLesson = {
    id: 1,
    title: 'The Mandelbulb',
    subtitle: 'Slider controls & quality',
    onStart: (store: Store) => asOneEdit(store, () => {
        seedMandelbulb(store);
        if (store.cameraMode !== 'Orbit') store.setCameraMode('Orbit');
        store.setActiveTab('Formula');
    }),
    steps: [
        {
            id: 'l1-intro',
            text: 'The Mandelbulb',
            subtext: 'Once thought to be the holy grail of the Mandelbrot set in 3D.',
            highlightTargets: [ANCHOR.tabFormula],
            trigger: { kind: 'manual' },
            beginButton: true,
        },
        {
            id: 'l1-iterations',
            text: 'Fractals are recursive mathematical structures. Try decreasing Iterations to see how this one forms.',
            subtext: 'Set it all the way down to 1.',
            highlightTargets: [ANCHOR.iterations],
            forceTab: 'Formula',
            trigger: { kind: 'value', path: 'coreMath.iterations', compare: 'eq', value: 1, waitForRelease: true },
        },
        {
            id: 'l1-power',
            text: 'Power is a variable in the formula that creates this shape (Zⁿ). Set it to 5.',
            subtext: 'Hold Alt or Shift while dragging for 10× or 0.1× precision.',
            highlightTargets: [ANCHOR.paramA],
            trigger: { kind: 'value', path: 'coreMath.paramA', compare: 'eq', value: 5, tolerance: 0.5, waitForRelease: true },
        },
        {
            id: 'l1-phase',
            text: 'Phase controls the position of the mathematical landscape relative to the sphere.',
            subtext: 'Try the dual-axis pad. Alt and Shift work here too.',
            highlightTargets: [ANCHOR.vec2A],
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
            text: 'Sliders in GMT have no min or max — drag on the textured area to set any value.',
            subtext: 'Set some Z Twist and enable Radiolaria.',
            highlightTargets: [ANCHOR.paramD, ANCHOR.vec2B],
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
            text: "See those slicing artifacts? Rendering fractals fast means estimating depth from the camera. When the estimate can't account for twist and radiolaria, we need the Quality tab.",
            highlightTargets: [ANCHOR.tabQuality],
            trigger: { kind: 'tab', tabId: 'Quality' },
        },
        {
            id: 'l1-step-jitter',
            text: 'Step Jitter blends those slices smoothly. Turn it off to see the raw slicing.',
            highlightTargets: [ANCHOR.stepJitter],
            forceTab: 'Quality',
            trigger: { kind: 'value', path: 'quality.stepJitter', compare: 'eq', value: 0, tolerance: 0.01, waitForRelease: true },
        },
        {
            id: 'l1-slice-opt',
            text: 'The ray is overshooting the fractal surface, causing the slicing. Reduce Slice Optimization to take smaller steps.',
            subtext: 'Set it to around 0.05.',
            highlightTargets: [ANCHOR.fudgeFactor],
            trigger: { kind: 'value', path: 'quality.fudgeFactor', compare: 'lte', value: 0.1, waitForRelease: true },
        },
        {
            id: 'l1-max-steps',
            text: "Now there aren't enough ray steps to reach the fractal with such small slices. Increase Max Ray Steps.",
            highlightTargets: [ANCHOR.maxSteps],
            trigger: { kind: 'value', path: 'quality.maxSteps', compare: 'gte', value: 200, waitForRelease: true },
            onEnter: (store: Store) => { store.setQuality({ maxSteps: 64 }); },
        },
        {
            id: 'l1-reset',
            text: "These settings can slow things down. I've reset to reasonable defaults.",
            subtext: "Let's move on.",
            position: { target: ANCHOR.maxSteps },
            trigger: { kind: 'manual' },
            onEnter: (store: Store) => asOneEdit(store, () => {
                store.setQuality({ stepJitter: 0.15, fudgeFactor: 0.5, maxSteps: 300 });
                store.setCoreMath({ iterations: 7, paramA: 8, paramD: 0, vec2B: { x: 0, y: 0.5 } });
            }),
        },
        {
            id: 'l1-julia-toggle',
            text: 'Julia mode is available for some fractals. It uses a static coordinate in the calculation.',
            subtext: 'Toggle it on.',
            forceTab: 'Formula',
            highlightTargets: [ANCHOR.juliaMode],
            trigger: { kind: 'bool', path: 'geometry.juliaMode', value: true },
        },
        {
            id: 'l1-julia-pick',
            text: 'Now pick a coordinate.',
            subtext: 'Click this button, then drag over the fractal.',
            highlightTargets: [ANCHOR.pickJulia],
            trigger: { kind: 'delta', path: 'geometry.juliaX' },
        },
        {
            id: 'l1-julia-drag',
            text: 'Drag around to explore different Julia sets...',
            trigger: { kind: 'delay', ms: 5000 },
            autoStartLesson: 2,
        },
    ],
};

const lesson2: TutorialLesson = {
    id: 2,
    title: "It's Time to Fly",
    subtitle: 'Navigation & camera controls',
    onStart: (store: Store) => asOneEdit(store, () => {
        // Only reset if NOT chaining from lesson 1 (julia is active = came from lesson 1).
        const fromLesson1 = store.formula === 'Mandelbulb' && store.geometry?.juliaMode;
        if (!fromLesson1) seedMandelbulb(store);
        if (store.cameraMode !== 'Orbit') store.setCameraMode('Orbit');
    }),
    steps: [
        { id: 'l2-fly',  text: 'Press Tab to enter Fly mode.', showKeys: ['Tab'], trigger: { kind: 'mode', param: 'cameraMode', value: 'Fly' } },
        { id: 'l2-look', text: 'Drag the mouse to look around.', trigger: { kind: 'delta', path: 'cameraRot', waitForRelease: true }, allowManual: true },
        { id: 'l2-wasd', text: 'Use WASD to fly forward, back, and strafe. Try each key.', showKeys: ['W', 'A', 'S', 'D'], trigger: { kind: 'keypress_all', keys: ['w', 'a', 's', 'd'], waitForRelease: true } },
        { id: 'l2-boost', text: 'Hold Shift while moving to boost your speed.', showKeys: ['Shift'], trigger: { kind: 'keypress_all', keys: ['shift'], waitForRelease: true } },
        { id: 'l2-vertical', text: 'Space to move up, C to move down. Try both.', showKeys: ['Space', 'C'], trigger: { kind: 'keypress_all', keys: [' ', 'c'], waitForRelease: true } },
        { id: 'l2-roll', text: 'Q and E to roll the camera. Try both.', showKeys: ['Q', 'E'], trigger: { kind: 'keypress_all', keys: ['q', 'e'], waitForRelease: true } },
        {
            id: 'l2-speed',
            text: 'Fine-tune your movement by adjusting the speed slider. You can also use the scroll wheel.',
            highlightTargets: [ANCHOR.speedSlider],
            trigger: { kind: 'delta', path: 'navigation.flySpeed', waitForRelease: true },
            allowManual: true,
        },
        {
            id: 'l2-reset',
            text: 'The Reset Camera button appears when you get too close or too far. You can also reset from the Camera menu.',
            highlightTargets: [ANCHOR.resetCamera],
            trigger: { kind: 'manual' },
        },
        { id: 'l2-orbit', text: 'Press Tab to switch back to Orbit mode.', showKeys: ['Tab'], trigger: { kind: 'mode', param: 'cameraMode', value: 'Orbit' } },
        {
            id: 'l2-orbit-controls',
            text: 'Now perfect your shot. Left-click to orbit, right-click to pan, scroll or middle-click to zoom.',
            subtext: 'The distance to the surface is shown at the bottom.',
            position: { target: ANCHOR.rightDock },
            trigger: { kind: 'manual' },
        },
        {
            id: 'l2-next-steps',
            text: 'Next steps:',
            kind: 'next-steps',
            trigger: { kind: 'manual' },
            buttonLabel: 'Continue to Lesson 3 — The Light Studio',
            autoStartLesson: 3,
        },
    ],
};

const lesson3: TutorialLesson = {
    id: 3,
    title: 'The Light Studio',
    subtitle: 'Lights, gizmos & camera attachment',
    onStart: (store: Store) => asOneEdit(store, () => {
        seedMandelbulb(store);
        if (store.cameraMode !== 'Orbit') store.setCameraMode('Orbit');
        store.setActiveTab('Formula');
    }),
    steps: [
        {
            id: 'l3-intro',
            text: "Let’s start with an interesting shape.",
            subtext: "Click the hamburger menu ☰ next to the formula name.",
            highlightTargets: [ANCHOR.formulaHamburger],
            position: { target: ANCHOR.rightDock },
            trigger: { kind: 'bool', path: 'contextMenu.visible', value: true },
        },
        {
            id: 'l3-randomize',
            text: 'Click Parameters in the Randomize section to get a random Mandelbulb shape.',
            subtext: 'You can undo / redo this with Ctrl+Z / Ctrl+Y.\nClick Ok when you have a shape you like.',
            highlightTargets: [ANCHOR.formulaHamburger],
            position: { target: ANCHOR.rightDock },
            trigger: { kind: 'manual' },
            buttonLabel: "Ok, let's go",
        },
        {
            id: 'l3-add-light',
            text: "It’s dark in here.",
            subtext: "Drag one of the three colored circles from the top bar onto the canvas to bring in a light.",
            highlightTargets: [ANCHOR.lightOrbs],
            position: { offset: { y: 40 } },
            onEnter: (store: Store) => {
                const lights = store.lighting?.lights ?? [];
                const reset = lights.map((l, i) => ({
                    ...l,
                    visible: false,
                    type: i === 0 ? 'Point' as const : l.type,
                    fixed: false,
                    intensity: i === 0 ? l.intensity : 1.5,
                }));
                store.setLighting({ lights: reset });
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
            subtext: '1. Arrows — drag along one axis\n2. Squares — drag along two axes\n3. White circle — drag relative to the camera',
            position: { target: [ANCHOR.lightGizmoLabel(0), ANCHOR.lightGizmoLabel(1), ANCHOR.lightGizmoLabel(2)], side: 'below' },
            trigger: { kind: 'delta', path: 'lighting.lights', settleMs: 800, waitForRelease: true },
            allowManual: true,
        },
        {
            id: 'l3-anchor',
            text: 'The light is world-anchored.',
            subtext: 'Click the anchor icon to attach it to the camera instead.',
            highlightTargets: [ANCHOR.gizmoAnchor(0), ANCHOR.gizmoAnchor(1), ANCHOR.gizmoAnchor(2)],
            position: { target: [ANCHOR.gizmoAnchor(0), ANCHOR.gizmoAnchor(1), ANCHOR.gizmoAnchor(2)], side: 'below' },
            trigger: { kind: 'delta', path: 'lighting.lights', settleMs: 400 },
        },
        {
            id: 'l3-hide-gizmo',
            text: 'When anchored, the gizmo axis becomes relative to the camera.\nIt’s often easier to adjust light position this way.',
            subtext: 'Hide the gizmos with this button.',
            highlightTargets: [ANCHOR.lightGizmoBtn],
            onEnter: (store: Store) => { store.setShowLightGizmo(true); },
            trigger: { kind: 'bool', path: 'showLightGizmo', value: false },
        },
        {
            id: 'l3-popup',
            text: 'Hover over an active light orb to open its settings — power, colour, range, and cast shadows.',
            highlightTargets: [ANCHOR.lightOrbs],
            position: { offset: { y: 40 } },
            trigger: { kind: 'value', path: 'openLightPopupIndex', compare: 'gte', value: 0 },
        },
        {
            id: 'l3-directional',
            text: "Most of these settings are straightforward. Let’s look at directional lights.",
            subtext: 'Select Directional (Sun) from the menu.',
            highlightTargets: [ANCHOR.lightPopupMenu],
            position: { target: ANCHOR.lightOrbs, offset: { y: 360 } },
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
            position: { target: ANCHOR.lightOrbs, offset: { y: 360 } },
            trigger: { kind: 'manual' },
        },
        {
            id: 'l3-expand',
            text: 'GMT supports up to 8 lights. You can access them from here.',
            highlightTargets: [ANCHOR.lightsExpand],
            position: { target: ANCHOR.lightsExpand, side: 'below', align: 'start' },
            trigger: { kind: 'manual' },
            buttonLabel: 'Continue to Lesson 4 — Shadows',
            autoStartLesson: 4,
        },
    ],
};

const lesson4: TutorialLesson = {
    id: 4,
    title: 'Shadows',
    subtitle: 'Hard shadows, steps & area lights',
    onStart: (store: Store) => asOneEdit(store, () => {
        const lights = store.lighting?.lights ?? [];
        if (!lights.some((l) => l.visible)) {
            store.setLighting({
                lights: lights.map((l, i) =>
                    i === 0 ? { ...l, visible: true, type: 'Point' } : l,
                ),
            });
        }
        store.setLighting({
            shadows: true, shadowsCompile: true, shadowSoftness: 16.0,
            shadowSteps: 128, areaLights: false, ptStochasticShadows: false,
        });
        store.setSubsystemTier?.('shadows', 2);
        if (store.cameraMode !== 'Orbit') store.setCameraMode('Orbit');
    }),
    steps: [
        {
            id: 'l4-open',
            text: 'Open the shadow panel to see the controls.',
            subtext: 'Click the shadow icon in the light bar above.',
            highlightTargets: [ANCHOR.shadowBtn],
            trigger: { kind: 'bool', path: 'shadowPanelOpen', value: true },
            position: { offset: { y: 40 } },
        },
        {
            id: 'l4-hardness',
            text: "Let's get some hard shadows. Crank the Hardness slider all the way up.",
            highlightTargets: [ANCHOR.shadowSoftness],
            position: { target: ANCHOR.shadowPanel },
            trigger: { kind: 'value', path: 'lighting.shadowSoftness', compare: 'gte', value: 1800, waitForRelease: true },
        },
        {
            id: 'l4-steps',
            text: "It doesn't look quite right yet. Hard shadows need more ray steps to reach the surface.",
            subtext: 'Increase Shadow Steps, but stop when the shadows look fully formed — steps are expensive.',
            highlightTargets: [ANCHOR.shadowSteps],
            position: { target: ANCHOR.shadowPanel },
            trigger: { kind: 'value', path: 'lighting.shadowSteps', compare: 'gte', value: 200, waitForRelease: true, settleMs: 300 },
            allowManual: true,
        },
        {
            id: 'l4-vp-intro',
            text: "GMT also has area light shadows, but they’re disabled by default. Open Viewport Quality to enable them.",
            highlightTargets: [ANCHOR.viewportQualityBtn],
            trigger: { kind: 'bool', path: 'vpQualityOpen', value: true },
            position: { offset: { y: 40 } },
        },
        {
            id: 'l4-vp-apply',
            text: 'Set Shadows to Full and click Apply.',
            subtext: 'Full mode compiles in area light shadows and takes a few seconds.',
            highlightTargets: [ANCHOR.vpQualityRow('shadows'), ANCHOR.viewportQualityBtn],
            position: { target: ANCHOR.vpQualityRow('shadows') },
            trigger: { kind: 'value', path: 'scalability.subsystems.shadows', compare: 'gte', value: 3 },
        },
        {
            id: 'l4-area-toggle',
            text: 'Area light shadows are now compiled in.',
            subtext: 'Enable them with the Area button.',
            highlightTargets: [ANCHOR.shadowAreaBtn],
            position: { target: ANCHOR.shadowPanel },
            onEnter: (store: Store) => { store.setShadowPanelOpen(true); },
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
            highlightTargets: [ANCHOR.shadowSoftness],
            position: { target: ANCHOR.shadowPanel },
            trigger: { kind: 'value', path: 'lighting.shadowSoftness', compare: 'lte', value: 50, waitForRelease: true },
            allowManual: true,
        },
        {
            id: 'l4-done',
            text: 'Next steps:',
            kind: 'next-steps',
            trigger: { kind: 'manual' },
        },
    ],
};

export const GMT_LESSONS: TutorialLesson[] = [lesson1, lesson2, lesson3, lesson4];
