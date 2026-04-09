
import { useEffect, useRef } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { TUTORIAL_LESSONS, TriggerType, TutorialStep } from '../data/tutorialLessons';

function resolveStorePath(state: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], state);
}

function valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(k => valuesEqual(a[k], b[k]));
    }
    return false;
}

function checkTrigger(trigger: TriggerType, state: any, snapshots: Map<string, any>): boolean {
    switch (trigger.kind) {
        case 'value': {
            if (trigger.waitForRelease && state.isUserInteracting) return false;
            let val = resolveStorePath(state, trigger.path);
            if (val == null) return false;
            if (trigger.abs) val = Math.abs(val);
            const tol = trigger.tolerance ?? 0;
            switch (trigger.compare) {
                case 'eq': return Math.abs(val - trigger.value) <= tol;
                case 'lte': return val <= trigger.value;
                case 'gte': return val >= trigger.value;
            }
            return false;
        }
        case 'bool': {
            const val = resolveStorePath(state, trigger.path);
            return val === trigger.value;
        }
        case 'mode': {
            return state[trigger.param] === trigger.value;
        }
        case 'tab': {
            return state.activeRightTab === trigger.tabId;
        }
        case 'delta': {
            if (trigger.waitForRelease && state.isUserInteracting) return false;
            const current = resolveStorePath(state, trigger.path);
            const snapshot = snapshots.get(trigger.path);
            if (snapshot === undefined) return false;
            return !valuesEqual(current, snapshot);
        }
        case 'compound': {
            return trigger.conditions.every(c => checkTrigger(c, state, snapshots));
        }
        case 'delay':
        case 'keypress':
        case 'keypress_all':
        case 'action':
        case 'manual':
            return false; // Handled separately
    }
}

// Track pressed keys for UI display
const pressedKeysListeners = new Set<(key: string) => void>();
export function onKeyPressed(cb: (key: string) => void) {
    pressedKeysListeners.add(cb);
    return () => pressedKeysListeners.delete(cb);
}

export function useTutorialEngine() {
    const tutorialActive = useFractalStore(s => s.tutorialActive);
    const lessonId = useFractalStore(s => s.tutorialLessonId);
    const stepIndex = useFractalStore(s => s.tutorialStepIndex);
    const advanceTutorialStep = useFractalStore(s => s.advanceTutorialStep);
    const completeTutorial = useFractalStore(s => s.completeTutorial);
    const startTutorial = useFractalStore(s => s.startTutorial);

    const snapshotsRef = useRef<Map<string, any>>(new Map());
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const enteredRef = useRef<string | null>(null);
    const actionListenerRef = useRef<string | null>(null);
    const advancingRef = useRef(false);

    const lesson = lessonId != null ? TUTORIAL_LESSONS.find(l => l.id === lessonId) : null;
    const step: TutorialStep | null = lesson && stepIndex < lesson.steps.length ? lesson.steps[stepIndex] : null;

    const safeAdvance = () => {
        if (advancingRef.current) return;
        advancingRef.current = true;
        advanceTutorialStep();
        Promise.resolve().then(() => { advancingRef.current = false; });
    };

    // Handle lesson start
    useEffect(() => {
        if (tutorialActive && lesson?.onStart) {
            const store = useFractalStore.getState() as any;
            lesson.onStart(store);
        }
    }, [tutorialActive, lesson?.id]);

    // Handle step entry/exit and snapshot capture
    useEffect(() => {
        if (!tutorialActive || !step) return;

        const stepId = step.id;
        if (enteredRef.current === stepId) return;

        // Exit previous step
        if (enteredRef.current && lesson) {
            const prevStep = lesson.steps.find(s => s.id === enteredRef.current);
            if (prevStep?.onExit) {
                prevStep.onExit(useFractalStore.getState() as any);
            }
        }

        enteredRef.current = stepId;
        snapshotsRef.current.clear();

        // Capture snapshots for delta triggers
        const state = useFractalStore.getState();
        const captureDeltaSnapshots = (trigger: TriggerType) => {
            if (trigger.kind === 'delta') {
                snapshotsRef.current.set(trigger.path, JSON.parse(JSON.stringify(resolveStorePath(state, trigger.path))));
            } else if (trigger.kind === 'compound') {
                trigger.conditions.forEach(captureDeltaSnapshots);
            }
        };
        captureDeltaSnapshots(step.trigger);

        if (step.forceTab) {
            (useFractalStore.getState() as any).setActiveTab(step.forceTab);
        }

        if (step.onEnter) {
            step.onEnter(useFractalStore.getState() as any);
        }

        // Handle delay trigger
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current);
            delayTimerRef.current = null;
        }
        if (step.trigger.kind === 'delay') {
            delayTimerRef.current = setTimeout(() => {
                safeAdvance();
            }, step.trigger.ms);
        }

        // Handle keypress trigger (any key)
        if (step.trigger.kind === 'keypress') {
            const targetKeys = step.trigger.keys.map(k => k.toLowerCase());
            const handler = (e: KeyboardEvent) => {
                const key = e.key.toLowerCase();
                pressedKeysListeners.forEach(cb => cb(e.key));
                if (targetKeys.includes(key)) {
                    safeAdvance();
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }

        // Handle keypress_all trigger (all keys must be pressed)
        if (step.trigger.kind === 'keypress_all') {
            const targetKeys = new Set(step.trigger.keys.map(k => k.toLowerCase()));
            const seenKeys = new Set<string>();
            const handler = (e: KeyboardEvent) => {
                const key = e.key.toLowerCase();
                pressedKeysListeners.forEach(cb => cb(e.key));
                if (targetKeys.has(key)) {
                    seenKeys.add(key);
                    if (seenKeys.size >= targetKeys.size) {
                        safeAdvance();
                    }
                }
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }

        // Handle action trigger
        if (step.trigger.kind === 'action') {
            actionListenerRef.current = step.trigger.action;
        } else {
            actionListenerRef.current = null;
        }

        return () => {
            if (delayTimerRef.current) {
                clearTimeout(delayTimerRef.current);
                delayTimerRef.current = null;
            }
        };
    }, [tutorialActive, step?.id, lesson?.id]);

    // Subscribe to store for reactive triggers
    useEffect(() => {
        if (!tutorialActive || !step) return;
        if (step.trigger.kind === 'delay' || step.trigger.kind === 'manual' || step.trigger.kind === 'keypress' || step.trigger.kind === 'keypress_all') return;

        const expectedStepIndex = stepIndex;
        const currentTrigger = step.trigger;

        const unsub = useFractalStore.subscribe((state) => {
            if (state.tutorialStepIndex !== expectedStepIndex) return;
            if (!state.tutorialActive) return;
            if (checkTrigger(currentTrigger, state, snapshotsRef.current)) {
                safeAdvance();
            }
        });

        setTimeout(() => {
            const state = useFractalStore.getState();
            if (state.tutorialStepIndex !== expectedStepIndex || !state.tutorialActive) return;
            if (checkTrigger(currentTrigger, state, snapshotsRef.current)) {
                safeAdvance();
            }
        }, 0);

        return unsub;
    }, [tutorialActive, step?.id, stepIndex]);

    // Detect end of lesson — complete or auto-chain
    useEffect(() => {
        if (tutorialActive && lesson && stepIndex >= lesson.steps.length) {
            // Check if the last step wants to auto-chain to another lesson
            const lastStep = lesson.steps[lesson.steps.length - 1];
            if (lastStep?.autoStartLesson) {
                const nextLessonId = lastStep.autoStartLesson;
                completeTutorial();
                // Start next lesson after a brief pause
                setTimeout(() => startTutorial(nextLessonId), 300);
            } else {
                completeTutorial();
            }
        }
    }, [tutorialActive, stepIndex, lesson?.steps.length]);

    // Intercept resetCamera for action trigger
    useEffect(() => {
        if (!tutorialActive || actionListenerRef.current !== 'resetCamera') return;

        const originalReset = useFractalStore.getState().resetCamera;
        const wrappedReset = () => {
            originalReset();
            if (actionListenerRef.current === 'resetCamera') {
                setTimeout(() => safeAdvance(), 100);
            }
        };
        useFractalStore.setState({ resetCamera: wrappedReset } as any);

        return () => {
            useFractalStore.setState({ resetCamera: originalReset } as any);
        };
    }, [tutorialActive, step?.id]);

    return { lesson, step, stepIndex };
}
