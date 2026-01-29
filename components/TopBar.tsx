
import React, { useState, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { RenderTools } from './topbar/RenderTools';
import { CenterHUD } from './topbar/CenterHUD';
import { CameraTools } from './topbar/CameraTools';
import { SystemMenu } from './topbar/SystemMenu';

const TopBar = () => {
    const state = useFractalStore();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isTouch, setIsTouch] = useState(false);
    
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        const checkTouch = () => setIsTouch(window.matchMedia("(pointer: coarse)").matches);
        window.addEventListener('resize', handleResize);
        checkTouch();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobileMode = state.debugMobileLayout || windowWidth < 768 || isTouch;

    const vibrate = (ms: number | number[] = 10) => {
        if (navigator.vibrate) navigator.vibrate(ms);
    };

    const btnBase = "p-2.5 rounded-lg transition-all active:scale-95 border flex items-center justify-center";
    const btnInactive = "bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10";
    const btnActive = "bg-gray-800 border-gray-600 text-white";

    return (
        <header className="relative shrink-0 w-full h-14 z-[60] bg-black/90 border-b border-white/10 flex items-center justify-between px-6 animate-fade-in-down select-none">
            {/* Left: Logo, Status, Render Controls */}
            <RenderTools isMobileMode={isMobileMode} vibrate={vibrate} />

            {/* Center: Light Studio & Gizmos */}
            <CenterHUD isMobileMode={isMobileMode} vibrate={vibrate} />

            {/* Right: Camera, Presets, System Menu */}
            <div className="flex gap-2 relative items-center">
                <CameraTools 
                    isMobileMode={isMobileMode} 
                    vibrate={vibrate} 
                    btnBase={btnBase} 
                    btnActive={btnActive} 
                    btnInactive={btnInactive} 
                />
                
                <div className="h-6 w-px bg-white/10 mx-1" />
                
                <SystemMenu 
                    isMobileMode={isMobileMode} 
                    vibrate={vibrate} 
                    btnBase={btnBase} 
                    btnActive={btnActive} 
                    btnInactive={btnInactive} 
                />
            </div>
        </header>
    );
};

export default TopBar;
