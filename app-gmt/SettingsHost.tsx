import React from 'react';
import { SettingsPanel } from '../components/SettingsPanel';
import { useSettingsOpen, closeSettings } from '../store/settingsPanelState';
import { registerCoreSettings } from '../store/coreSettings';
import { registerGmtSettings } from '../engine-gmt/installGmtSettings';

// Register prefs once, at module load — before the panel can open.
registerCoreSettings();
registerGmtSettings();

/** Mounted once in AppGmt; renders the Settings modal while it's open. */
export const SettingsHost: React.FC = () => {
    const open = useSettingsOpen();
    return <SettingsPanel open={open} onClose={closeSettings} />;
};

export default SettingsHost;
