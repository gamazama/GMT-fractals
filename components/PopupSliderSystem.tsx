
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
    const paramMap = {
        '1': { key: 'paramA', setter: (v: number) => setCoreMath({ paramA: v }), val: coreMath.paramA },
        '2': { key: 'paramB', setter: (v: number) => setCoreMath({ paramB: v }), val: coreMath.paramB },
        '3': { key: 'paramC', setter: (v: number) => setCoreMath({ paramC: v }), val: coreMath.paramC },
        '4': { key: 'paramD', setter: (v: number) => setCoreMath({ paramD: v }), val: coreMath.paramD },
        '5': { key: 'paramE', setter: (v: number) => setCoreMath({ paramE: v }), val: coreMath.paramE },
        '6': { key: 'paramF', setter: (v: number) => setCoreMath({ paramF: v }), val: coreMath.paramF },
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            
            const key = e.key;
            // @ts-ignore
            const map = paramMap[key];
            
            if (map && !activePopup) {
                // Get definition
                const def = registry.get(formula);
                const idx = parseInt(key) - 1;
                
                // Fallback def if formula doesn't specify (e.g. Modular or sparse definition)
                let paramDef = def?.parameters[idx];
                
                // If Modular, provide generic defs
                if (formula === 'Modular') {
                    paramDef = { label: `Param ${String.fromCharCode(65 + idx)}`, id: map.key as any, min: -5, max: 5, step: 0.01, default: 0 };
                }

                if (paramDef) {
                    // Calculate alignment
                    // We want the current value on the slider to be exactly at mousePos.x
                    const range = paramDef.max - paramDef.min;
                    const pct = (map.val - paramDef.min) / range;
                    
                    const effectiveWidth = WIDTH - 24; // Padding compensation
                    const pixelOffset = 12 + (pct * effectiveWidth);
                    
                    let left = mousePos.current.x - pixelOffset;
                    // Align the slider track (not the container top) with the cursor Y
                    let top = mousePos.current.y - TRACK_Y_OFFSET;

                    // Clamp to screen
                    left = Math.max(10, Math.min(window.innerWidth - WIDTH - 10, left));
                    top = Math.max(10, Math.min(window.innerHeight - HEIGHT - 10, top));

                    setActivePopup({
                        id: parseInt(key),
                        paramKey: map.key as LfoTarget,
                        label: paramDef.label,
                        def: { min: paramDef.min, max: paramDef.max, step: paramDef.step },
                        x: left,
                        y: top
                    });
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (activePopup && e.key === String(activePopup.id)) {
                setActivePopup(null);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activePopup, formula, coreMath]);

    if (!activePopup) return null;

    // @ts-ignore
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
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-900 rounded text-[9px] font-bold text-cyan-200 uppercase tracking-widest border border-cyan-700 shadow-sm">
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
