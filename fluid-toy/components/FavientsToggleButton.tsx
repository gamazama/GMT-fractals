/**
 * FavientsToggleButton — topbar button that shows/hides the floating Favients
 * shelf (the persistent gradient-favourites bar). Picking a favourite applies
 * its gradient to the Palette (which colours both the fractal and the dye).
 * The shelf floats over the viewport and remembers its open-state + position
 * (favientsPanelPersist, per-host key).
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { FavientsIcon, FAVIENTS_ACCENT } from '../../palette/components/FavientsIcon';

export const FavientsToggleButton: React.FC = () => {
    const open = useEngineStore((s) => (s as unknown as { panels?: Record<string, { isOpen?: boolean }> }).panels?.Favients?.isOpen ?? false);
    const togglePanel = useEngineStore((s) => (s as unknown as { togglePanel?: (id: string) => void }).togglePanel);
    return (
        <button
            type="button"
            onClick={() => togglePanel?.('Favients')}
            title="Toggle the Favients shelf (saved gradients)"
            className={`flex items-center gap-1.5 px-2 h-7 rounded text-[12px] transition-colors ${
                open ? `${FAVIENTS_ACCENT.text} bg-white/10` : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
        >
            <FavientsIcon className="text-sm leading-none" />
            <span className="hidden md:inline">Favients</span>
        </button>
    );
};

export default FavientsToggleButton;
