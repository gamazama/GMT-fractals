
import React, { useEffect, useRef } from 'react';
import { bindStoreToEngine } from '../store/engineStore';

/**
 * Initializes the connection between the React Store and the render worker.
 * This component should be mounted ONCE at the root of the application.
 *
 * Binds store subscriptions that forward state changes to the worker via typed messages.
 */
export const EngineBridge: React.FC = () => {
    const isBound = useRef(false);

    useEffect(() => {
        if (!isBound.current) {
            isBound.current = true;
            bindStoreToEngine();
        }
    }, []);

    return null;
};
