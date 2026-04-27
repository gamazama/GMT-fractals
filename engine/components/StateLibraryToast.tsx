/**
 * StateLibraryToast — generic floating pill that pops below the topbar
 * when a state-library slot is saved (or rejected). Reads the transient
 * `${arrayKey}_savedToast` field that `installStateLibrarySlice` writes
 * after each saveToSlot call. Cleared automatically by the slice's timer.
 *
 * Mount via the topbar plugin so it lives near the menu it relates to:
 *
 *   topbar.register({
 *       id: 'gmt-camera-slot-toast',
 *       slot: 'right',
 *       order: 28.5,
 *       component: () => <StateLibraryToast arrayKey="savedCameras" />,
 *   });
 *
 * Visuals: dark pill with cyan dot for success, amber for warning. Matches
 * stable's CameraTools toast (success branch) and adds a warning branch
 * for rejected over-range saves.
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { toastFieldKey, type StateLibrarySavedToast } from '../store/createStateLibrarySlice';

interface StateLibraryToastProps {
    /** Same value passed to installStateLibrary's `arrayKey` — picks the
     *  right transient field on the store. */
    arrayKey: string;
}

export const StateLibraryToast: React.FC<StateLibraryToastProps> = ({ arrayKey }) => {
    const toast = useEngineStore((s) => (s as any)[toastFieldKey(arrayKey)] as StateLibrarySavedToast | null);

    if (!toast) return null;

    const isWarning = toast.tone === 'warning';
    const borderClass = isWarning ? 'border-amber-500/50' : 'border-cyan-500/40';
    const dotClass = isWarning ? 'bg-amber-400' : 'bg-cyan-400';
    const textClass = isWarning ? 'text-amber-200' : 'text-cyan-300';

    return (
        <div className="relative pointer-events-none">
            <div className="absolute right-0 top-full mt-2 z-[600] whitespace-nowrap">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/95 border ${borderClass} rounded-lg shadow-lg`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${dotClass} shrink-0`} />
                    <span className={`text-[10px] font-bold ${textClass}`}>{toast.message}</span>
                    <kbd className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded ml-0.5">{toast.slot}</kbd>
                </div>
            </div>
        </div>
    );
};
