/**
 * Camera plugin's preset-field registration — split into its own module
 * so apps can import it as an early side effect before the store is
 * constructed (which freezes the preset-field registry).
 *
 * This file imports only presetFieldRegistry (never the store), so
 * importing it does NOT trigger store construction. The Camera plugin
 * proper (engine/plugins/Camera.ts) pulls in the store and runs at
 * install time.
 *
 * Apps' main.tsx pattern:
 *   import './registerFeatures';
 *   import '../engine/plugins/camera/presetField';  // side effect only
 *   import { FluidToyApp } from './FluidToyApp';    // NOW store constructs
 *   // ... rest
 */

import { presetFieldRegistry } from '../../../utils/PresetFieldRegistry';

presetFieldRegistry.register({
    key: 'cameraSlots',
    serialize: (s: any) => s.cameraSlots,
    deserialize: (p: any, set: any) => {
        if (Array.isArray(p.cameraSlots)) set({ cameraSlots: p.cameraSlots });
    },
});
