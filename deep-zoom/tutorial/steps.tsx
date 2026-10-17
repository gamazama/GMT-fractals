/**
 * deep-zoom/tutorial/steps.tsx - this app's own tutorial card: `dz-dive`, a step with a button
 * that starts a dive.
 *
 * PURPOSE
 *   The engine's tutorial card (engine/plugins/tutorial/Overlay.tsx) draws a step's `text` and
 *   `subtext` and waits. The first-dive lesson opens with a card that also DOES something: one
 *   button that runs the starter dive "Surface" (the jump to its start view, then the dive to its
 *   depth: `runStarter`, from the starter's own data). The card of that name on the Places tab
 *   jumps to where this dive arrives since 2026-10-17 (F6: every card jumps); the lesson's dive
 *   stays, it is how diving is taught. The step itself still advances on the deed, not on the
 *   click: its trigger waits for `dz.dive.ended` (./hostEvents.ts), so a dive started from the
 *   Dive field advances it too.
 *
 * THE SEAM
 *   `registerDeepZoomStepKinds()` once, from ./firstDive.ts: it registers the kind with the
 *   engine's `stepRenderers`. A step asks for it with `kind: 'dz-dive'`; the card's frame, its
 *   counter and its "Skip Tutorial" stay the engine's.
 *   `FIRST_DIVE_STARTER` is the card the button runs, and the button's words are made from it
 *   (`Dive to 1e-6`), so the words cannot name another depth than the dive's.
 *
 * NO `dz-record-dive`. The plan's row for this file (S4-3) names a second kind, a card that
 * recorded a dive. The recorder it stood on was never built into this app: the route took its
 * place, and its steps (K, fly on, K, Play) are plain text cards that wait for an action each.
 *
 * PITFALLS
 *   - THE BUTTON IS OFF UNTIL THE DEEP RENDERER IS READY, and while a dive is in flight. A
 *     starter's dive waits for the renderer by itself, but a button that does nothing visible for
 *     seconds reads as broken. (At first run the lesson is started at ready, so this shows only
 *     when the intro is asked for again in the first seconds after a reload.)
 *   - A CLICK ON THE BUTTON LEAVES THE KEYBOARD WITH THE PICTURE: the dive itself hands the focus
 *     to the picture (`host.focus()` in deep-zoom/diveControl.ts), and the fly keys are heard on
 *     the window whatever has focus.
 */
import React from 'react';
import { stepRenderers } from '../../engine/plugins/Tutorial';
import type { TutorialStep } from '../../engine/plugins/Tutorial';
import { STARTERS } from '../data/starters';
import { runStarter } from '../components/StarterDives';
import { useDive } from '../diveControl';
import { useDzTelemetry } from '../host/telemetry';
import { formatDepthCompact } from '../components/depthFormat';

/** The step kind's name, for a lesson's `kind`. */
export const DZ_STEP_DIVE = 'dz-dive';

/** The starter the card's button runs: "Surface", six decades down ("Try this first", its own card says). */
export const FIRST_DIVE_STARTER = STARTERS.find((s) => s.depth === 1e-6) ?? STARTERS[0];

/** The button's words: the depth the dive really goes to. */
export const FIRST_DIVE_LABEL = `Dive to ${formatDepthCompact(FIRST_DIVE_STARTER.depth)}`;

const DiveStep: React.FC<{ step: TutorialStep }> = ({ step }) => {
    const ready = useDzTelemetry((t) => t.live && t.ready);
    const diving = useDive((s) => s.dive !== null);
    return (
        <>
            {step.text && <p className="m-0 text-xs leading-normal text-fg/90">{step.text}</p>}
            {step.subtext && <p className="m-0 mt-1 text-xs leading-normal text-accent-300/75">{step.subtext}</p>}
            <button
                type="button"
                data-dz-lesson-dive
                disabled={!ready || diving}
                title={ready ? 'Jumps to the start of the "Surface" starter dive and flies straight ahead. A fly key or Esc stops it.' : 'The deep renderer is still starting'}
                onClick={() => { void runStarter(FIRST_DIVE_STARTER); }}
                className="mt-2 px-3 py-1 rounded border border-accent-500/30 bg-accent-900/40 hover:bg-accent-800 text-accent-300 text-[10px] font-bold disabled:opacity-40"
            >
                {FIRST_DIVE_LABEL}
            </button>
        </>
    );
};

/** Call once, before a lesson that uses the kind can start. */
export function registerDeepZoomStepKinds(): void {
    stepRenderers.register({ kind: DZ_STEP_DIVE, render: (step) => <DiveStep step={step} /> });
}
