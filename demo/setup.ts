/**
 * Demo add-on panel wiring.
 *
 * Called after the store exists (i.e. after `App` has been imported).
 * Feature + overlay registration is handled separately in
 * `demo/registerFeatures.ts` so it can run before store creation.
 *
 * Two steps:
 *  1. applyPanelManifest declares HOW to render the Demo panel —
 *     PanelRouter needs this to know that the 'Demo' panel renders the
 *     `demo` feature's AutoFeaturePanel. Without it, opening the panel
 *     produces an empty body ("Select a module").
 *  2. movePanel + togglePanel actually open the panel in the right dock.
 */

import { useEngineStore } from '../store/engineStore';
import { applyPanelManifest } from '../engine/PanelManifest';

export const wireDemoPanel = () => {
    applyPanelManifest([
        {
            id: 'Demo',
            dock: 'right',
            order: 0,
            features: ['demo'],
        },
    ]);
    const store = useEngineStore.getState();
    store.movePanel('Demo', 'right', 0);
    store.togglePanel('Demo', true);
};
