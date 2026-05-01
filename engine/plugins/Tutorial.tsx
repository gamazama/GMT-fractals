/**
 * @engine/tutorial — guided lesson plugin.
 *
 * Apps install once at boot, register triggers / step kinds / lessons, and
 * mount <TutorialOverlay /> + <TutorialRunner /> somewhere in their tree
 * (typically next to <HelpOverlay />).
 *
 *   installTutorial();
 *   registerLessons([lesson1, lesson2]);
 *   tutorTriggers.register({ kind: 'tab', setup: ... });    // app-specific
 *   stepRenderers.register({ kind: 'next-steps', render: ... });
 *
 *   <App>
 *     ...
 *     <TutorialRunner />
 *     <TutorialOverlay />
 *   </App>
 *
 * Help-menu integration is automatic when `installHelp({ tutorials: ... })`
 * is also passed — see Help.tsx.
 */

import { registerBuiltinTriggers } from './tutorial/triggers';
import { setTutorialStorageKey } from '../../store/slices/uiSlice';
import { useEngineStore } from '../../store/engineStore';

let _installed = false;

export interface InstallTutorialOptions {
    /** localStorage namespace for completion persistence. Default 'gmt'
     *  (matches existing key) — change for non-GMT apps. */
    storageKey?: string;
}

export function installTutorial(options: InstallTutorialOptions = {}): void {
    if (_installed) return;
    _installed = true;
    registerBuiltinTriggers();

    if (options.storageKey) {
        // Re-key the completion persistence and reload from the new key
        // so a freshly-namespaced app picks up its own history.
        setTutorialStorageKey(`${options.storageKey}-tutorials`, (completed) => {
            useEngineStore.setState({ tutorialCompleted: completed } as any);
        });
    }
}

// Re-exports — public API surface.
export { TutorialRunner } from './tutorial/runner';
export { TutorialOverlay } from './tutorial/Overlay';
export { TutorialHighlight } from './tutorial/Highlight';
export { tutorAnchors, useTutorAnchor, tutorAnchorRef, type AnchorEntry } from './tutorial/anchors';
export { mergeRefs } from '../utils/refs';
export { tutorTriggers, onKeyPressed, resolveStorePath, type TriggerSetupCtx, type TriggerEvaluator } from './tutorial/triggers';
export { stepRenderers, type StepRenderer, type StepRenderContext } from './tutorial/stepRenderers';
export { actionBus } from './tutorial/actionBus';
export { registerLesson, registerLessons, listLessons, getLesson, subscribeLessons } from './tutorial/lessons';
export type { TutorialStep, TutorialLesson, TriggerSpec, PositionConfig } from './tutorial/types';
