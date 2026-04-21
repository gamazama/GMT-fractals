import React from 'react';
import type { ContextMenuItem } from '../../types/help';

export interface StoreCallbacks {
    handleInteractionStart: (mode?: 'camera' | 'param') => void;
    handleInteractionEnd: () => void;
    openContextMenu: (x: number, y: number, items: ContextMenuItem[], helpIds?: string[]) => void;
}

const NOOP_CALLBACKS: StoreCallbacks = {
    handleInteractionStart: () => {},
    handleInteractionEnd: () => {},
    openContextMenu: () => {},
};

const StoreCallbacksContext = React.createContext<StoreCallbacks>(NOOP_CALLBACKS);

export const StoreCallbacksProvider = StoreCallbacksContext.Provider;

export const useStoreCallbacks = (): StoreCallbacks => React.useContext(StoreCallbacksContext);
