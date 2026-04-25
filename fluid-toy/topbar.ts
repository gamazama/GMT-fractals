/**
 * fluid-toy topbar — Camera menu host. Mirrors GMT's pattern (icon
 * menu in the right slot) but with fluid-toy-appropriate items: just
 * "Views" for now. Reset / undo are handled elsewhere.
 *
 * Called from main.tsx after installMenu() and installCamera() so the
 * registries the menu plugin reads exist.
 */

import { menu } from '../engine/plugins/Menu';
import { CameraIcon } from '../components/Icons';
import { useEngineStore } from '../store/engineStore';

export const registerFluidToyTopbar = () => {
    menu.register({
        id: 'camera',
        slot: 'right',
        order: 29,
        icon: CameraIcon,
        title: 'Camera',
        align: 'end',
        width: 'w-48',
    });

    menu.registerItem('camera', {
        id: 'camera-views',
        type: 'button',
        label: 'Views…',
        title: 'Open the saved-views library',
        onSelect: () => {
            (useEngineStore.getState() as any).togglePanel?.('Views', true);
        },
    });

    menu.registerItem('camera', {
        id: 'camera-reset',
        type: 'button',
        label: 'Reset View',
        title: 'Reset to default fractal view',
        onSelect: () => {
            (useEngineStore.getState() as any).resetView?.();
        },
    });
};
