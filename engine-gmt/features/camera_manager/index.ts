
import { FeatureDefinition } from '../../engine/FeatureSystem';

// This file registers the tab configuration for the Camera Manager.
// State is handled by cameraSlice, so no params here.

/**
 * @invariant `params: {}` is intentional — Camera Manager state lives in
 * `engine-gmt/store/cameraSlice.ts`, NOT in the DDFS feature slice. Adding
 * params here without considering the duplication WILL create a shadow
 * store. `tabConfig.label` 'Camera Manager' must match the `panelId` passed
 * to `installStateLibrary` (see ADR-0056). The bespoke `CameraManagerPanel`
 * is registered separately as `'panel-cameramanager'` in
 * `engine-gmt/features/ui.tsx`.
 */
export const CameraManagerFeature: FeatureDefinition = {
    id: 'cameraManager',
    name: 'Camera Manager',
    category: 'Scene',
    tabConfig: {
        label: 'Camera Manager', // Matches PanelId
        condition: { bool: true } // Always available
    },
    params: {} // State managed in root store
};
