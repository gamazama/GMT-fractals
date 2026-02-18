
import React, { useEffect, useState } from 'react';
import { FractalEvents } from '../engine/FractalEvents';
import { engine } from '../engine/FractalEngine';
import { SpinnerIcon } from './Icons';

export const CompilingIndicator: React.FC = () => {
    const [status, setStatus] = useState<boolean | string>(false);

    useEffect(() => {
        // Initialize with engine state
        if (engine.isCompiling) setStatus(true);

        const handler = (val: boolean | string) => {
            setStatus(val);
        };
        const unsub = FractalEvents.on('is_compiling', handler);
        return unsub;
    }, []);

    const isVisible = !!status;
    const message = typeof status === 'string' ? status : "Compiling...";

    // Removed animate-fade-in to prevent missing class issues
    // Using standard transition logic instead
    // z-index 99999 to be above all floating windows
    return (
        <div 
            className={`fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="bg-black/90 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                <SpinnerIcon className="animate-spin h-4 w-4 text-cyan-400" />
                <span className="text-[10px] font-black text-cyan-100 uppercase tracking-widest">
                    {message}
                </span>
            </div>
        </div>
    );
};
