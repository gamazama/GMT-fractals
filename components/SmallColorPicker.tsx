
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import EmbeddedColorPicker from './EmbeddedColorPicker';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';

interface SmallColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
}

const PickerPortal = ({ 
    targetRef, 
    color, 
    onChange, 
    onClose, 
    label 
}: { 
    targetRef: React.RefObject<HTMLButtonElement>, 
    color: string, 
    onChange: (c: string) => void, 
    onClose: () => void,
    label?: string
}) => {
    const [coords, setCoords] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const popupW = 240; // Approx width
            const popupH = 150; // Approx height

            let x = rect.right + 5;
            let y = rect.top;

            // Flip to left if offscreen right
            if (x + popupW > winW) {
                x = rect.left - popupW - 5;
            }

            // Flip up if offscreen bottom
            if (y + popupH > winH) {
                y = rect.bottom - popupH;
            }

            setCoords({ x, y });
        }
    }, [targetRef]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (targetRef.current && !targetRef.current.contains(e.target as Node)) {
                // Check if click is inside the portal (we rely on event bubbling stopping or checking portal ref, 
                // but since portal is at body, we check if click target is closest to .picker-popup)
                if (!(e.target as HTMLElement).closest('.picker-popup')) {
                    onClose();
                }
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, targetRef]);

    return createPortal(
        <div 
            className="picker-popup fixed z-[9999] bg-black border border-white/20 p-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-56 animate-fade-in"
            style={{ left: coords.x, top: coords.y }}
            onMouseDown={(e) => e.stopPropagation()} 
        >
            {label && <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest text-center">{label}</div>}
            <EmbeddedColorPicker color={color} onColorChange={onChange} />
        </div>,
        document.body
    );
};

export const SmallColorPicker: React.FC<SmallColorPickerProps> = ({ color, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        ids.unshift('ui.colorpicker');
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={() => setIsOpen(!isOpen)}
                onContextMenu={handleContextMenu}
                className="w-16 h-6 rounded border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: color }}
                title={label || "Pick Color"}
            >
                <div className="text-[8px] font-mono font-black mix-blend-difference text-white uppercase">{color}</div>
            </button>
            
            {isOpen && (
                <PickerPortal 
                    targetRef={btnRef} 
                    color={color} 
                    onChange={onChange} 
                    onClose={() => setIsOpen(false)}
                    label={label}
                />
            )}
        </>
    );
};

export default SmallColorPicker;
