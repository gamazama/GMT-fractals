/**
 * Host + imperative toggle for the Hardware Preferences modal.
 *
 * Keeps open-state as local React state (modals don't belong in the
 * engine store — they're pure UI). `toggleHardwarePrefs()` lets the
 * topbar System menu open the modal without a prop-drilled callback.
 * If multiple hosts mount (shouldn't happen), the last one wins.
 */

import React, { useEffect, useState } from 'react';
import { HardwarePreferences } from './panels/HardwarePreferences';

let _open: ((next?: boolean) => void) | null = null;

/** Topbar menu / shortcut entry-point. Toggles the modal. */
export const toggleHardwarePrefs = () => _open?.();

/** Mount once in the app root. */
export const HardwarePrefsHost: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        _open = (next) => setIsOpen((cur) => (typeof next === 'boolean' ? next : !cur));
        return () => { _open = null; };
    }, []);
    if (!isOpen) return null;
    return <HardwarePreferences onClose={() => setIsOpen(false)} />;
};
