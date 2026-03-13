
import React, { useEffect, useRef } from 'react';
import { bindStoreToEngine } from '../store/fractalStore';
import { getProxy } from '../engine/worker/WorkerProxy';

/**
 * Initializes the connection between the React Store and the render worker.
 * This component should be mounted ONCE at the root of the application.
 *
 * Sets WorkerProxy to pending mode and binds store subscriptions that
 * forward state changes to the worker via typed messages.
 */
export const EngineBridge: React.FC = () => {
    const isBound = useRef(false);

    useEffect(() => {
        if (!isBound.current) {
            isBound.current = true;
            getProxy().setWorkerModePending();
            bindStoreToEngine();
        }
    }, []);

    return null;
};
