import { useEngineStore } from '../store/engineStore';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { applyPanelManifest } from '../engine/PanelManifest';
import { shortcuts } from '../engine/plugins/Shortcuts';
import { help } from '../engine/plugins/Help';
import { DemoOverlay } from './DemoOverlay';

// Panel manifest + custom shortcuts + hint pill. Runs after the store
// exists (registerFeatures runs before, where the freeze happens).

const randomHex = (): string => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
const rand = (min: number, max: number, step = 0.001): number => {
    const v = min + Math.random() * (max - min);
    return Math.round(v / step) * step;
};

const randomLayout = () => {
    (useEngineStore.getState() as any).setDemo({
        count:        Math.round(rand(5, 18, 1)),
        iterOffset:   { x: rand(-0.08, 0.08, 0.005), y: rand(-0.08, 0.08, 0.005) },
        iterRotation: rand(-20, 20, 0.5),
        iterScale:    rand(0.85, 1.05, 0.005),
        iterHueShift: rand(-30, 30, 1),
    });
};

export const wireDemoPanel = () => {
    componentRegistry.register('overlay-demo', DemoOverlay);

    applyPanelManifest([
        { id: 'Demo',      dock: 'right', order: 0, features: ['demo'] },
        { id: 'Animation', dock: 'right', order: 1, items: [{ type: 'widget', id: 'lfo-list' }] },
    ]);
    const store = useEngineStore.getState();
    store.movePanel('Demo', 'right', 0);
    store.movePanel('Animation', 'right', 1);
    store.togglePanel('Demo', true);

    // R = randomize colour, L = randomize layout, S = scramble both.
    // Routed through setDemo so each press is one undo entry.
    shortcuts.register({
        id: 'demo.randomize', key: 'R', description: 'Randomize the demo square color', category: 'Demo',
        handler: () => (useEngineStore.getState() as any).setDemo({ color: randomHex() }),
    });
    shortcuts.register({
        id: 'demo.randomizeLayout', key: 'L', description: 'Randomize the duplicate-stack layout', category: 'Demo',
        handler: randomLayout,
    });
    shortcuts.register({
        id: 'demo.scramble', key: 'S', description: 'Scramble color + layout', category: 'Demo',
        handler: () => {
            (useEngineStore.getState() as any).setDemo({ color: randomHex() });
            randomLayout();
        },
    });

    help.registerHudHint({
        id: 'demo.hints', slot: 'bottom-left', order: 0, badge: '[Demo]',
        keys: [
            { key: 'R',      label: 'Randomize color' },
            { key: 'L',      label: 'Randomize layout' },
            { key: 'S',      label: 'Scramble both' },
            { key: 'Ctrl+Z', label: 'Undo' },
            { key: 'Ctrl+Y', label: 'Redo' },
        ],
    });
};
