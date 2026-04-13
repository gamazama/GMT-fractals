
import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';

/**
 * Returns a right-click handler that opens the global context menu with help IDs
 * collected from the target element's data attributes.
 *
 * @param extraIds - Additional help IDs to prepend (e.g. ['ui.colorpicker'])
 */
export function useHelpContextMenu(extraIds?: string[]) {
    const openContextMenu = useFractalStore(s => s.openContextMenu);
    return React.useCallback((e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (extraIds) ids.unshift(...extraIds);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    }, [openContextMenu, extraIds]);
}
