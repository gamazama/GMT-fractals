/**
 * Tutorial state-machine runner. One hook, mounted once via <TutorialRunner />.
 *
 * On every step entry it:
 *   1. Calls `lesson.onStart` (first step only)
 *   2. Calls `step.onEnter`
 *   3. Calls `forceTab` if set (delegated to host store via setActiveTab)
 *   4. Builds a TriggerSetupCtx (snapshot map, advance fn, action bus)
 *   5. Resolves the evaluator for `step.trigger.kind`
 *   6. Subscribes to the engine store; on every change, runs `evaluate(state)`
 *      and advances if true
 *
 * On step exit / unmount it cleans up timers + listeners and runs `step.onExit`.
 */

import React, { useEffect, useRef } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { tutorTriggers, resolveStorePath, type TriggerSetupCtx } from './triggers';
import { getLesson } from './lessons';
import { actionBus } from './actionBus';
import type { TutorialStep } from './types';

export const TutorialRunner: React.FC = () => {
    const tutorialActive = useEngineStore((s: any) => s.tutorialActive);
    const lessonId = useEngineStore((s: any) => s.tutorialLessonId);
    const stepIndex = useEngineStore((s: any) => s.tutorialStepIndex);
    const advanceTutorialStep = useEngineStore((s: any) => s.advanceTutorialStep);
    const completeTutorial = useEngineStore((s: any) => s.completeTutorial);
    const startTutorial = useEngineStore((s: any) => s.startTutorial);

    const enteredRef = useRef<string | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const advancingRef = useRef(false);

    // Lesson onStart — runs once per lesson activation.
    useEffect(() => {
        if (!tutorialActive || lessonId == null) return;
        const lesson = getLesson(lessonId);
        if (lesson?.onStart) {
            try { lesson.onStart(useEngineStore.getState()); } catch (e) { console.error('[tutorial] onStart', e); }
        }
    }, [tutorialActive, lessonId]);

    // Step entry / exit / trigger wiring.
    useEffect(() => {
        if (!tutorialActive || lessonId == null) {
            enteredRef.current = null;
            cleanupRef.current?.();
            cleanupRef.current = null;
            return;
        }
        const lesson = getLesson(lessonId);
        if (!lesson) return;
        const step: TutorialStep | undefined = lesson.steps[stepIndex];
        if (!step) return;

        if (enteredRef.current === step.id) return;

        // Exit previous step.
        if (enteredRef.current) {
            const prev = lesson.steps.find((s) => s.id === enteredRef.current);
            if (prev?.onExit) {
                try { prev.onExit(useEngineStore.getState()); } catch (e) { console.error('[tutorial] onExit', e); }
            }
            cleanupRef.current?.();
            cleanupRef.current = null;
        }

        enteredRef.current = step.id;

        // forceTab — delegate to host store.
        if (step.forceTab) {
            const setActiveTab = (useEngineStore.getState() as any).setActiveTab;
            if (typeof setActiveTab === 'function') setActiveTab(step.forceTab);
        }

        if (step.onEnter) {
            try { step.onEnter(useEngineStore.getState()); } catch (e) { console.error('[tutorial] onEnter', e); }
        }

        // Build trigger setup context.
        const snapshots = new Map<string, any>();
        const expectedStepIndex = stepIndex;

        const safeAdvance = () => {
            if (advancingRef.current) return;
            const cur = useEngineStore.getState() as any;
            if (!cur.tutorialActive || cur.tutorialStepIndex !== expectedStepIndex) return;
            advancingRef.current = true;
            advanceTutorialStep();
            queueMicrotask(() => { advancingRef.current = false; });
        };

        const ctx: TriggerSetupCtx = {
            getState: () => useEngineStore.getState(),
            subscribe: (fn) => useEngineStore.subscribe(fn as any),
            advance: safeAdvance,
            onAction: (name, fn) => actionBus.on(name, fn),
            snapshots,
            resolvePath: resolveStorePath,
        };

        const evaluator = tutorTriggers.get(step.trigger.kind);
        if (!evaluator) {
            console.warn(`[tutorial] no evaluator for trigger kind '${step.trigger.kind}' in step '${step.id}'`);
            return;
        }
        const built = evaluator.setup(step.trigger, ctx);

        let unsubStore: (() => void) | null = null;
        if (built.evaluate) {
            const onChange = (state: any) => {
                if (state.tutorialStepIndex !== expectedStepIndex || !state.tutorialActive) return;
                if (built.evaluate!(state)) safeAdvance();
            };
            unsubStore = useEngineStore.subscribe(onChange as any);
            // Initial check (queue to next tick so any sync onEnter writes settle first).
            setTimeout(() => {
                const s = useEngineStore.getState() as any;
                if (s.tutorialStepIndex !== expectedStepIndex || !s.tutorialActive) return;
                if (built.evaluate!(s)) safeAdvance();
            }, 0);
        }

        cleanupRef.current = () => {
            built.cleanup?.();
            unsubStore?.();
        };

        return () => {
            // React strict-mode / re-runs: don't actually exit here — the
            // entry effect handles transitions. Only the unmount branch
            // (when tutorialActive flips false) fires cleanupRef explicitly.
        };
    }, [tutorialActive, lessonId, stepIndex]);

    // End-of-lesson detection (complete or auto-chain).
    useEffect(() => {
        if (!tutorialActive || lessonId == null) return;
        const lesson = getLesson(lessonId);
        if (!lesson || stepIndex < lesson.steps.length) return;

        const lastStep = lesson.steps[lesson.steps.length - 1];
        if (lastStep?.autoStartLesson != null) {
            const next = lastStep.autoStartLesson;
            completeTutorial();
            setTimeout(() => startTutorial(next), 300);
        } else {
            completeTutorial();
        }
    }, [tutorialActive, lessonId, stepIndex]);

    // Cleanup on full deactivation.
    useEffect(() => {
        if (!tutorialActive) {
            enteredRef.current = null;
            cleanupRef.current?.();
            cleanupRef.current = null;
        }
    }, [tutorialActive]);

    return null;
};
