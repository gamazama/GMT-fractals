
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { useMobileLayout } from '../hooks/useMobileLayout';

const Joystick = ({ onMove, label, active }: { onMove: (x: number, y: number) => void, label: string, active: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const pointerIdRef = useRef<number | null>(null);
    
    const currentValues = useRef({ x: 0, y: 0 });

    const updateJoystick = useCallback((clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const maxRadius = rect.width / 2;
        let dx = (clientX - centerX) / maxRadius;
        let dy = (clientY - centerY) / maxRadius;
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
            dx /= dist;
            dy /= dist;
        }
        
        const visualRadius = 30;
        const clampedDist = Math.min(1, dist);
        const visualX = (dist > 0 ? dx : 0) * clampedDist * visualRadius;
        const visualY = (dist > 0 ? dy : 0) * clampedDist * visualRadius;
        
        setPos({ x: visualX, y: visualY });
        currentValues.current = { x: dx, y: -dy };
    }, []);

    const handleStart = (e: React.PointerEvent) => {
        if (!active) return;
        e.stopPropagation();
        
        // LOCK to this pointer ID for multi-touch support
        pointerIdRef.current = e.pointerId;
        setIsDragging(true);
        updateJoystick(e.clientX, e.clientY);
        
        if (navigator.vibrate) navigator.vibrate(10);
    };

    useEffect(() => {
        if (!isDragging) return;

        const onPointerMove = (e: PointerEvent) => {
            // IGNORE if this move event is from a different finger
            if (e.pointerId !== pointerIdRef.current) return;
            
            if (e.cancelable) e.preventDefault();
            updateJoystick(e.clientX, e.clientY);
            onMove(currentValues.current.x, currentValues.current.y);
        };

        const onPointerUp = (e: PointerEvent) => {
            if (e.pointerId !== pointerIdRef.current) return;
            
            currentValues.current = { x: 0, y: 0 };
            onMove(0, 0);
            setIsDragging(false);
            setPos({ x: 0, y: 0 });
            pointerIdRef.current = null;
            if (navigator.vibrate) navigator.vibrate(5);
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
        };
    }, [isDragging, updateJoystick, onMove]);

    return (
        <div 
            ref={containerRef}
            className={`w-36 h-36 rounded-full transition-all duration-200 relative flex items-center justify-center touch-none select-none ${
                isDragging ? 'scale-110 shadow-[0_0_30px_rgba(34,211,238,0.1)]' : 'scale-100'
            } ${active ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{ touchAction: 'none' }}
            onPointerDown={handleStart}
        >
            <div className={`w-24 h-24 rounded-full border transition-all duration-500 flex items-center justify-center ${
                 isDragging ? 'bg-cyan-500/10 border-cyan-400' : 'bg-white/5 border-white/10'
            } ${active ? 'opacity-100' : 'opacity-0 scale-50'}`}>
                <div className={`absolute -top-6 text-[8px] font-black uppercase tracking-widest pointer-events-none transition-colors ${isDragging ? 'text-cyan-400' : 'text-white/30'}`}>
                    {label}
                </div>
                <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
                <div 
                    className={`w-10 h-10 rounded-full border shadow-xl transition-transform duration-75 pointer-events-none ${
                        isDragging 
                        ? 'bg-cyan-400 border-white shadow-[0_0_20px_rgba(34,211,238,0.5)]' 
                        : 'bg-white/10 border-white/20'
                    }`}
                    style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                />
            </div>
        </div>
    );
};

const MobileControls: React.FC = () => {
    const { cameraMode, setCameraMode, debugMobileLayout } = useFractalStore();
    const { isMobile: isDeviceMobile } = useMobileLayout();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(isDeviceMobile || debugMobileLayout);
    }, [debugMobileLayout, isDeviceMobile]);

    const handleJoyMove = useCallback((x: number, y: number) => {
        window.dispatchEvent(new CustomEvent('joyMove', { detail: { x, y } }));
    }, []);

    const handleJoyLook = useCallback((x: number, y: number) => {
        window.dispatchEvent(new CustomEvent('joyLook', { detail: { x, y } }));
    }, []);

    if (!visible) return null;

    const isFly = cameraMode === 'Fly';

    // Use absolute positioning inside the sticky container (App.tsx)
    // This ensures it moves with the container when scrolling past the address bar header,
    // keeping alignment with the TopBar.
    return (
        <div className="absolute inset-0 pointer-events-none z-[100] flex flex-col justify-between p-6 pb-10">
            {/* Top Row: Mode Toggle ONLY. 
                pt-16 = 64px. TopBar is h-14 (56px). 
                Resulting gap = 8px below the TopBar.
            */}
            <div className="flex justify-start pt-16">
                <button 
                    onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(20);
                        setCameraMode(isFly ? 'Orbit' : 'Fly');
                    }}
                    className="pointer-events-auto flex items-center gap-2 bg-black/80 border border-white/20 px-4 py-2.5 rounded-full backdrop-blur-xl shadow-2xl active:scale-90 transition-all active:border-cyan-400"
                >
                    <div className={`w-2 h-2 rounded-full ${isFly ? 'bg-cyan-400 animate-pulse shadow-[0_0_5px_cyan]' : 'bg-purple-400'}`} />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {cameraMode} Mode
                    </span>
                </button>
            </div>

            {/* Joystick Footer: Pointer events strictly linked to Mode */}
            <div className={`flex justify-between items-end transition-all duration-500`}>
                <div className={isFly ? 'pointer-events-auto' : 'pointer-events-none'}>
                    <Joystick label="Move" onMove={handleJoyMove} active={isFly} />
                </div>
                
                <div className={isFly ? 'pointer-events-auto' : 'pointer-events-none'}>
                    <Joystick label="Look" onMove={handleJoyLook} active={isFly} />
                </div>
            </div>
        </div>
    );
};

export default MobileControls;
