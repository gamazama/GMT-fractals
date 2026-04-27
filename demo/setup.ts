/**
 * Demo add-on panel wiring + bonus shortcut + hint pill.
 *
 * Called after the store exists (i.e. after `App` has been imported).
 * Feature + overlay registration is handled separately in
 * `demo/registerFeatures.ts` so it can run before store creation.
 *
 * Four steps:
 *  1. applyPanelManifest declares HOW to render the Demo panel —
 *     PanelRouter needs this to know that the 'Demo' panel renders the
 *     `demo` feature's AutoFeaturePanel.
 *  2. movePanel + togglePanel actually open the panel.
 *  3. Register a custom keyboard shortcut (R = randomize colour) — this
 *     is the verification that @engine/shortcuts works for app-level
 *     bindings, not just plugin-internal ones.
 *  4. Register a hint pill (bottom-left) listing the demo's keys —
 *     verification that @engine/help + @engine/hud compose.
 */

import { useEngineStore } from '../store/engineStore';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { applyPanelManifest } from '../engine/PanelManifest';
import { shortcuts } from '../engine/plugins/Shortcuts';
import { help } from '../engine/plugins/Help';
import { DemoOverlay } from './DemoOverlay';

/** Pick a random RGB hex string. Demo-grade — no perceptual weighting. */
const randomHex = (): string => {
    const v = Math.floor(Math.random() * 0xffffff);
    return '#' + v.toString(16).padStart(6, '0');
};

export const wireDemoPanel = () => {
    // Register the overlay component now (post-store-boot — see
    // registerFeatures.ts for why this can't be at registration time).
    componentRegistry.register('overlay-demo', DemoOverlay);

    applyPanelManifest([
        {
            id: 'Demo',
            dock: 'right',
            order: 0,
            features: ['demo'],
        },
        {
            // Demonstrates @engine/components/modulation. The widget
            // reads animations off the engine store directly; the
            // engine's installModulation tick processes them into
            // liveModulations each frame. DemoOverlay then composes
            // base + live mod — see DemoOverlay.tsx.
            id: 'Animation',
            dock: 'right',
            order: 1,
            items: [{ type: 'widget', id: 'lfo-list' }],
        },
    ]);
    const store = useEngineStore.getState();
    store.movePanel('Demo', 'right', 0);
    store.movePanel('Animation', 'right', 1);
    store.togglePanel('Demo', true);

    // R = randomize the demo's color. Goes through the typed setDemo
    // setter so the change captures into history (Ctrl+Z reverts it).
    shortcuts.register({
        id: 'demo.randomize',
        key: 'R',
        description: 'Randomize the demo square color',
        category: 'Demo',
        handler: () => {
            (useEngineStore.getState() as any).setDemo({ color: randomHex() });
        },
    });

    // Bottom-left hint pill. The default `keys[]` form gives a
    // collapsible row of key glyphs + descriptions — no custom
    // component needed.
    help.registerHudHint({
        id: 'demo.hints',
        slot: 'bottom-left',
        order: 0,
        badge: '[Demo]',
        keys: [
            { key: 'R',      label: 'Randomize color' },
            { key: 'Ctrl+Z', label: 'Undo' },
            { key: 'Ctrl+Y', label: 'Redo' },
        ],
    });
};
