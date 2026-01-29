
import React, { useEffect, useRef } from 'react';
import { bindStoreToEngine } from '../store/fractalStore';

/**
 * Initializes the connection between the React Store and the WebGL Engine.
 * This component should be mounted ONCE at the root of the application.
 */
export const EngineBridge: React.FC = () => {
    const isBound = useRef(false);

    useEffect(() => {
        if (!isBound.current) {
            bindStoreToEngine();
            isBound.current = true;
            console.log("🌉 Engine Bridge: Connected.");
        }
    }, []);

    return null;
};
