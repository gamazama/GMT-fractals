/**
 * engine-gmt/navigation/useInputController.ts - GMT's wrapper over the engine's navigation input.
 *
 * The hook itself moved to `engine/plugins/navigation/useNavigationInput.ts` on 2026-10-08 so a
 * second app can fly with the same hands (ADR-0133). It is renderer-free and store-free now; this
 * wrapper hands it what it used to read for itself, with the values it always had:
 *   - the element            react-three-fiber's canvas (`useThree().gl.domElement`)
 *   - the frame              `useFrame` runs the hook's `frame(delta)` (roll easing, then the session edge)
 *   - the movement lock      `selectMovementLock(store)`
 *   - keys suppressed        while the pointer is over the timeline (`isTimelineHovered`)
 *   - the touch layout       `useMobileLayout()`
 *   - mouse-down exclusions  the HUD refs, or the `.pointer-events-auto` fallback when none are passed
 *   - the wheel in an orthographic view   scales `optics.orthoScale` instead of the fly speed
 *   - the activity session   ADR-0061: begin / poke / end under the `camera` token. This is an
 *     INDEPENDENT, balanced path: Navigation's pointer-drag paths own their own open / close, this
 *     one owns keys, sticks and the fly look-drag. Ref-counting under one token is safe across
 *     paths only because each path balances on its own (the close is frame-edge driven, plus the
 *     unmount cleanup and the 8 s watchdog). Gated on the movement lock inside the engine hook.
 *
 * Guard: `npm run smoke:fly` (app-gmt, real handlers; eleven lines, each seen red against the hook
 * before the move). Roll, Alt, the sticks, invert-Y, the orthographic wheel and the session edges
 * are not opened by any test.
 */
import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CameraMode } from '../types';
import { useEngineStore as useFractalStore, selectMovementLock } from '../../store/engineStore';
import { useMobileLayout } from '../../hooks/useMobileLayout';
import { INTERACTION_SOURCES } from '../interaction/interactionSources';
import { useNavigationInput } from '../../engine/plugins/navigation/useNavigationInput';

export const useInputController = (
    mode: CameraMode,
    speed: number,
    setSpeed: (v: number) => void,
    hudRefs?: Record<string, React.RefObject<HTMLElement | null>> // Optional 4th argument to handle UI exclusions
) => {
    const { gl } = useThree();
    const invertY = useFractalStore(s => s.invertY);
    const { isMobile: isMobileLayout } = useMobileLayout();

    const input = useNavigationInput({
        element: gl.domElement,
        mode,
        invertY,
        speed,
        setSpeed,
        isTouchLayout: isMobileLayout,
        isLocked: () => selectMovementLock(useFractalStore.getState()),
        isSuppressed: () => !!useFractalStore.getState().isTimelineHovered,
        excludeTarget: (target) => {
            if (hudRefs) {
                // If any HUD ref contains the target, ignore
                return Object.values(hudRefs).some((ref) => ref.current && ref.current.contains(target as Node));
            }
            // Fallback: Check for class
            return !!(target as HTMLElement).closest('.pointer-events-auto');
        },
        // ORTHO ZOOM: If in orthographic mode, scrolling MUST adjust orthoScale directly
        onWheel: (e, mod) => {
            const state = useFractalStore.getState();
            const isOrtho = state.optics && Math.abs(state.optics.camType - 1.0) < 0.1;
            if (!isOrtho) return false;
            const dir = e.deltaY > 0 ? 1 : -1;
            const current = state.optics.orthoScale;
            const next = current * (1 + dir * 0.1 * mod);
            state.setOptics({ orthoScale: Math.max(1e-10, Math.min(1000, next)) });
            return true;
        },
        onActivityBegin: () => useFractalStore.getState().beginInteraction(INTERACTION_SOURCES.camera),
        // Keep the watchdog alive on long continuous flights (throttled, ref-only — no store
        // write; the ADR-sanctioned poke exception).
        onActivityPoke: () => useFractalStore.getState().pokeInteraction(INTERACTION_SOURCES.camera),
        onActivityEnd: () => useFractalStore.getState().endInteraction(INTERACTION_SOURCES.camera),
    });

    useFrame((_, delta) => input.frame(delta));

    return input;
};
