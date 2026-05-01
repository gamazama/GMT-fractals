/**
 * Step renderer registry — pluggable card kinds. The default 'text'
 * renderer (defined in Overlay.tsx) renders the step's `text` + `subtext`
 * + `showKeys` + advance buttons. Apps register additional kinds (e.g.
 * GMT's "next-steps" list at the end of lesson 2 + 4).
 *
 * A renderer receives the step plus a context with helpers for advancing,
 * skipping, completing, and access to the lesson + index. It returns the
 * card body (the chrome — title, step counter, panel — is owned by Overlay).
 */

import React from 'react';
import type { TutorialStep, TutorialLesson } from './types';

export interface StepRenderContext {
    lesson: TutorialLesson;
    stepIndex: number;
    isLastStep: boolean;
    advance: () => void;
    skip: () => void;
    complete: () => void;
    /** Pressed-key set (for 'showKeys' visualisation). */
    pressedKeys: Set<string>;
}

export interface StepRenderer {
    kind: string;
    render(step: TutorialStep, ctx: StepRenderContext): React.ReactNode;
}

const _renderers = new Map<string, StepRenderer>();

export const stepRenderers = {
    register(r: StepRenderer): void { _renderers.set(r.kind, r); },
    unregister(kind: string): void { _renderers.delete(kind); },
    get(kind: string): StepRenderer | undefined { return _renderers.get(kind); },
    listKinds(): string[] { return Array.from(_renderers.keys()); },
};
