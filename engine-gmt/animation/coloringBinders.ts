/**
 * GMT animation coloring binders.
 *
 * The gradient knobs the user actually animates — `coloring.phase`,
 * `coloring.repeats` (+ their layer-2 twins) — are NOT shader uniforms.
 * They're user-facing controls; the shader reads the derived
 * `uColorScale` / `uColorOffset`. That phase→offset / repeats→scale
 * conversion normally happens inside the gradient panel
 * (`ColoringHistogram`'s sync effect) — which only runs while the panel
 * is mounted.
 *
 * Consequence: a keyframed `coloring.phase` track would write `phase`
 * into the store via the convention-derived DDFS binder, but since
 * `phase` has no `uniform` mapping nothing reached the shader unless the
 * gradient tab happened to be open (its effect did the conversion). The
 * gradient only animated with the panel open.
 *
 * These binders close that gap: they own the same conversion the panel
 * does and write the DERIVED `offset` / `scale` (which DO carry
 * uniforms) alongside the base knob — so `setColoring` emits
 * `uColorOffset` / `uColorScale` to the worker every frame regardless of
 * panel mount. The math mirrors AnimationSystem's LFO special-case
 * (the always-on modulation path) so keyframe and LFO playback agree.
 *
 * Registered binders win over the DDFS convention fallback
 * (AnimationEngine.getBinder consults binderRegistry first), so this
 * cleanly overrides the bare `setColoring({phase})` writer.
 */

import { binderRegistry } from '../../engine/animation/binderRegistry';
import { useEngineStore } from '../../store/engineStore';
import type { ColoringState } from '../features/coloring';

const EPS = 0.0001;

const getColoring = () => (useEngineStore.getState() as any).coloring as ColoringState | undefined;
const setColoring = (updates: Partial<ColoringState>) => {
    const action = (useEngineStore.getState() as any).setColoring as
        | ((u: Partial<ColoringState>) => void)
        | undefined;
    action?.(updates);
};

/** Register the four gradient knob binders (phase/repeats × layer 1/2).
 *  Idempotent — re-registering an id replaces the previous entry. Returns
 *  a teardown that unregisters all four. */
export const installGmtColoringBinders = (): (() => void) => {
    // phase → offset. With scale fixed, d(offset)/d(phase) = 1, so the
    // derived offset tracks the phase delta. Keeps `phase` in the store
    // too (slider stays live), but the visible scroll comes from offset.
    const bindPhase = (
        id: string,
        kPhase: keyof ColoringState,
        kOffset: keyof ColoringState,
    ) =>
        binderRegistry.register({
            id,
            category: 'Coloring',
            label: id === 'coloring.phase' ? 'Gradient Phase' : 'Gradient Phase 2',
            write: (v) => {
                const c = getColoring();
                if (!c) return;
                const newOffset = ((c[kOffset] as number) ?? 0) + (v - ((c[kPhase] as number) ?? 0));
                setColoring({ [kPhase]: v, [kOffset]: newOffset } as Partial<ColoringState>);
            },
        });

    // repeats → scale, preserving the histogram range ratio (scale/repeats).
    const bindRepeats = (
        id: string,
        kRepeats: keyof ColoringState,
        kScale: keyof ColoringState,
    ) =>
        binderRegistry.register({
            id,
            category: 'Coloring',
            label: id === 'coloring.repeats' ? 'Gradient Repeats' : 'Gradient Repeats 2',
            write: (v) => {
                const c = getColoring();
                if (!c) return;
                const repeats = (c[kRepeats] as number) ?? 1;
                if (Math.abs(repeats) < EPS) return;
                const ratio = ((c[kScale] as number) ?? 1) / repeats;
                setColoring({ [kRepeats]: v, [kScale]: v * ratio } as Partial<ColoringState>);
            },
        });

    const offs = [
        bindPhase('coloring.phase', 'phase', 'offset'),
        bindPhase('coloring.phase2', 'phase2', 'offset2'),
        bindRepeats('coloring.repeats', 'repeats', 'scale'),
        bindRepeats('coloring.repeats2', 'repeats2', 'scale2'),
    ];

    return () => offs.forEach((off) => off());
};
