
import { FeatureDefinition } from '../../engine/FeatureSystem';

// This file registers the tab configuration for the Camera Manager.
// State is handled by cameraSlice, so no params here.

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
