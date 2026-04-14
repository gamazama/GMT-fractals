
import React, { useEffect, useState, useRef } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { registry } from '../engine/FractalRegistry';
import Slider from './Slider';
import { LfoTarget } from '../types';

interface ActivePopup {
    id: number; // 1-6
    paramKey: LfoTarget;
    label: string;
    def: { min: number, max: number, step: number };
    x: number;
    y: number;
}

const WIDTH = 300;
const HEIGHT = 60;
// Distance from top of popup to vertical center of slider track (Header ~26px + Padding)
const TRACK_Y_OFFSET = 38;

export const PopupSliderSystem: React.FC = () => {
    const [activePopup, setActivePopup] = useState<ActivePopup | null>(null);
    const mousePos = useRef({ x: 0, y: 0 });
    
    // Access core math slice and actions
    const state = useFractalStore();
    const coreMath = state.coreMath;
    const { formula, setCoreMath } = state;

    if (!coreMath) return null;

    // Map keys 1-6 to params and setters
    const paramMap: Record<string, { key: string; setter: (v: number) => void; val: number }> = {
        '1': { key: 'paramA', setter: (v: number) => setCoreMath({ paramA: v }), val: coreMath.paramA },
        '2': { key: 'paramB', setter: (v: number) => setCoreMath({ paramB: v }), val: coreMath.paramB },
        '3': { key: 'paramC', setter: (v: number) => setCoreMath({ paramC: v }), val: coreMath.paramC },
        '4': { key: 'paramD', setter: (v: number) => setCoreMath({ paramD: v }), val: coreMath.paramD },
        '5': { key: 'paramE', setter: (v: number) => setCoreMath({ paramE: v }), val: coreMath.paramE },
        '6': { key: 'paramF', setter: (v: number) => setCoreMath({ paramF: v }), val: coreMath.paramF },
    };

    // Keys 1-6 are repurposed as camera slot shortcuts (handled by useKeyboardShortcuts).
    // This component is kept but no longer opens on keypress.
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    if (!activePopup) return null;

    const currentMap = paramMap[String(activePopup.id)];

    return (
        <div 
            className="fixed z-[9999] bg-black/80 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-center px-3 animate-pop-in"
            style={{ 
                left: activePopup.x, 
                top: activePopup.y, 
                width: WIDTH, 
                height: HEIGHT 
            }}
        >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-900 rounded text-[9px] font-bold text-cyan-200 border border-cyan-700 shadow-sm">
                Quick Edit ({activePopup.id})
            </div>
            
            <Slider 
                label={activePopup.label}
                value={currentMap.val}
                min={activePopup.def.min}
                max={activePopup.def.max}
                step={activePopup.def.step}
                onChange={currentMap.setter}
                highlight
                trackId={activePopup.paramKey}
            />
        </div>
    );
};
