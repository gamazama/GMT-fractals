/**
 * NumberDragFeel — how much slower a dragged number field moves than its slider track, chosen by
 * CONTEXT so an app sets it once at its root and every ScalarInput under it follows (portals
 * included). The maths and the rule live in ./numberDragRate.ts; this only carries the numbers.
 *
 * Omitted → `DEFAULT_NUMBER_DRAG_FEEL` (GMT's 2×–10×). Gradient Explorer v2 provides 2×–2.5×.
 * A behaviour, deliberately NOT folded into the input SKIN (./skin.tsx): the skin is a look, and
 * the fullscreen overlay wears the soft skin in both GE shells.
 */
import React, { createContext, useContext } from 'react';
import { DEFAULT_NUMBER_DRAG_FEEL, type NumberDragFeel } from './numberDragRate';

const NumberDragFeelContext = createContext<NumberDragFeel>(DEFAULT_NUMBER_DRAG_FEEL);

export const NumberDragFeelProvider: React.FC<{ feel: Partial<NumberDragFeel>; children: React.ReactNode }> = ({ feel, children }) => {
    const value = React.useMemo(
        () => ({ ...DEFAULT_NUMBER_DRAG_FEEL, ...feel }),
        [feel.minSlowdown, feel.maxSlowdown],
    );
    return <NumberDragFeelContext.Provider value={value}>{children}</NumberDragFeelContext.Provider>;
};

export const useNumberDragFeel = (): NumberDragFeel => useContext(NumberDragFeelContext);
