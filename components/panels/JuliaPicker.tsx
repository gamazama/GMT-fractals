
import React from 'react';
import Button from '../Button';
import { useFractalStore } from '../../store/fractalStore';

export const JuliaPicker = () => {
    const isPicking = useFractalStore(s => s.isPickingJulia);
    const setPicking = useFractalStore(s => s.setIsPickingJulia);

    const handlePick = () => {
        setPicking(!isPicking);
    };

    return (
        <div className="flex flex-col mb-2">
             {isPicking && (
                 <div className="mb-2 p-2 bg-green-900/30 border border-green-500/30 rounded text-[9px] text-green-200 animate-pulse text-center">
                     Click any point on the fractal surface to set Julia coordinates.
                 </div>
             )}
             <Button 
                onClick={handlePick}
                label={isPicking ? "Cancel Picking" : "Pick Coordinate"}
                variant={isPicking ? "success" : "primary"}
                fullWidth
             />
             <div className="h-px bg-white/10 my-2" />
        </div>
    );
};
