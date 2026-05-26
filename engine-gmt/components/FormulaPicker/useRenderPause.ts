/**
 * Pause the engine render loop while the picker is open.
 *
 * Save-and-restore preserves prior pause state — if the user had manually
 * paused before opening, we don't auto-resume on close.
 *
 * @see dev/plans/formula-picker-design.md → "Performance — primary mechanism"
 */

import { useEffect } from 'react';
import { useEngineStore } from '../../../store/engineStore';

export function useRenderPause(active: boolean = true): void {
    useEffect(() => {
        if (!active) return;
        const wasPaused = useEngineStore.getState().isPaused;
        useEngineStore.getState().setIsPaused(true);
        return () => {
            useEngineStore.getState().setIsPaused(wasPaused);
        };
    }, [active]);
}
