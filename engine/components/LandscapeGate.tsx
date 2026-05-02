/**
 * Full-screen "rotate device" overlay shown when a mobile device is
 * held in portrait. Apps target landscape-only on mobile.
 *
 * Caller controls when to mount — typically gated on "loading screen
 * finished" so the prompt doesn't stack over the splash:
 *
 *   {!isLoadingVisible && <LandscapeGate />}
 */

import React from 'react';
import { useMobileLayout } from '../../hooks/useMobileLayout';
import { SmartphoneRotateIcon } from '../../components/Icons';

export const LandscapeGate: React.FC = () => {
    // Real-device only: telling a desktop user with a portrait window
    // to "rotate your device" is nonsensical.
    const { isDeviceMobile, isPortrait } = useMobileLayout();
    if (!isDeviceMobile || !isPortrait) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white">
            <div className="text-cyan-400 mb-6 animate-bounce"><SmartphoneRotateIcon /></div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Landscape Recommended</h2>
            <p className="text-gray-500 text-sm font-mono">Rotate device to access controls.</p>
        </div>
    );
};
