/**
 * @engine/components/modulation — generic LFO modulator UI.
 *
 * `installModulationUI()` is the recommended entry: registers
 * `'lfo-list'` in componentRegistry so apps reference it from a panel
 * manifest item. Pair with `installModulation()` (which registers the
 * tick that processes `state.animations` into `state.liveModulations`)
 * for the full keyframe-free modulation story.
 *
 * Direct exports are provided for apps that want to compose differently.
 */

export { LfoList } from './LfoList';
export { WaveformPreview } from './WaveformPreview';
export { setLfoListConfig, getLfoListConfig, type LfoListConfig } from './lfoListConfig';

import { componentRegistry } from '../../../components/registry/ComponentRegistry';
import { LfoList } from './LfoList';

let _installed = false;

/** Register the LFO panel widget under id `'lfo-list'`. Idempotent.
 *  Call once at boot, after `installModulation()`. App's panel manifest
 *  references the widget via `{ type: 'widget', id: 'lfo-list' }`. */
export const installModulationUI = (): void => {
    if (_installed) return;
    _installed = true;
    componentRegistry.register('lfo-list', LfoList);
};
