/**
 * @engine/animation — install the canonical animation tick.
 *
 * Registers GMT's AnimationSystem.tick(delta) into TickRegistry's
 * ANIMATE phase. This is the SAME tick function GMT uses — it drives:
 *
 *   1. animationEngine.tick(delta)          — keyframe playback
 *   2. modulationEngine.updateOscillators()  — LFO modulation
 *   3. modulation rules (audio, envelope)    — rule-based modulation
 *   4. Writes resolved offsets → store.liveModulations
 *
 * Apps also mount <EngineBridge /> (which calls bindStoreToEngine →
 * animationEngine.connect) so animationEngine has its store handles.
 * Without both, the timeline won't play or scrub.
 *
 * No reinvention — this function is GMT's production logic, just
 * registered into the plugin TickRegistry so the engine fork's apps
 * can drive it without mounting GMT's ViewportArea.
 */

import { registerTick, TICK_PHASE } from '../TickRegistry';
import { tick as animationSystemTick } from './AnimationSystem';
import { animationEngine } from '../AnimationEngine';

if (typeof window !== 'undefined') {
    (window as any).__animEngine = animationEngine;
}

let _unregister: (() => void) | null = null;

let _debugTickCount = 0;

export const installModulation = () => {
    if (_unregister) return;
    _unregister = registerTick('engine.animation', TICK_PHASE.ANIMATE, (delta) => {
        _debugTickCount++;
        animationSystemTick(delta);
    });
    // Expose tick counter for smoke tests.
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, '__animTickCount', { get: () => _debugTickCount, configurable: true });
    }
};

export const uninstallModulation = () => {
    if (_unregister) { _unregister(); _unregister = null; }
};
