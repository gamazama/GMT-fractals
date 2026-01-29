
import { useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';

export const useGlobalContextMenu = () => {
    const openMenu = useFractalStore(s => s.openContextMenu);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            // Check if the event was already prevented (handled by a specific component like Canvas)
            if (e.defaultPrevented) return;

            // Traverse DOM to find ALL data-help-ids in ancestry
            const ids = collectHelpIds(e.target);

            if (ids.length > 0) {
                e.preventDefault();
                // Pass empty items list, only help will be shown unless extended later
                openMenu(e.clientX, e.clientY, [], ids);
            }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, [openMenu]);
};
