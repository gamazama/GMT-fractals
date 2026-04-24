/**
 * Demo add-on panel wiring.
 *
 * Called after the store exists (i.e. after `App` has been imported).
 * Feature + overlay registration is handled separately in
 * `demo/registerFeatures.ts` so it can run before store creation.
 */

import { useEngineStore } from '../store/engineStore';

export const wireDemoPanel = () => {
    const store = useEngineStore.getState();
    store.movePanel('Demo', 'right', 0);
    store.togglePanel('Demo', true);
};
