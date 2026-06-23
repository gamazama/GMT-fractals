import React from 'react';
import { GearIcon } from './Icons';
import { SettingsPanel } from './SettingsPanel';
import { openSettings, closeSettings, useSettingsOpen } from '../store/settingsPanelState';

/**
 * SettingsAccess — the reusable Settings entry point for apps that don't have
 * a bespoke menu for it (fluid-toy, gradient-explorer, …).
 *
 *  • {@link SettingsButton} — a topbar gear; register it into the engine TopBar
 *    (`topbar.register`) so the app gets a "Settings" button.
 *  • {@link SettingsHost} — mounts the {@link SettingsPanel} bound to the shared
 *    open/close slot; mount once alongside the app's other overlays.
 *
 * Pair with `registerCoreSettings()` at boot so the colour-scheme / accent /
 * secondary-hue controls (and autosave) are registered. The colour scheme
 * persists across all same-origin GMT apps via localStorage.
 *
 * @invariant Engine-core (components/) — consumes the settings slot + panel only.
 */
export const SettingsButton: React.FC = () => (
    <button onClick={openSettings} className="icon-btn" title="Settings" aria-label="Settings">
        <GearIcon />
    </button>
);

export const SettingsHost: React.FC = () => {
    const open = useSettingsOpen();
    return <SettingsPanel open={open} onClose={closeSettings} />;
};
