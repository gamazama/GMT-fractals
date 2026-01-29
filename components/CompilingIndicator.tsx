
import React, { useEffect, useState } from 'react';
import { FractalEvents } from '../engine/FractalEvents';
import { engine } from '../engine/FractalEngine';
import { SpinnerIcon } from './Icons';

export const CompilingIndicator: React.FC = () => {
    const [status, setStatus] = useState<boolean | string>(engine.isCompiling);

    useEffect(() => {
        const unsub = FractalEvents.on('is_compiling', setStatus);
        return unsub;
    }, []);

    useEffect(() => {
        if (status) {
            const msg = typeof status === 'string' ? status : "Compiling Shaders...";
            console.log(`[System] ${msg}`);
        }
    }, [status]);

    const isVisible = !!status;
    const message = typeof status === 'string' ? status : "Compiling Shaders...";

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-[80] flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full flex items-center gap-3 animate-fade-in shadow-2xl">
                <SpinnerIcon className="animate-spin h-4 w-4 text-cyan-400" />
                <span className="text-[10px] font-black text-cyan-100 uppercase tracking-widest">
                    {message}
                </span>
            </div>
        </div>
    );
};
