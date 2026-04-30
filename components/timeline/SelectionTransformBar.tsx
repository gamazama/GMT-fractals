import React from 'react';

interface SelectionTransformBarProps {
    minFrame: number;
    maxFrame: number;
    frameWidth: number;
    onStart: (e: React.MouseEvent, type: 'move' | 'scale_left' | 'scale_right', minFrame: number, maxFrame: number) => void;
}

export const SelectionTransformBar: React.FC<SelectionTransformBarProps> = ({ minFrame, maxFrame, frameWidth, onStart }) => (
    <div
        className="absolute top-0 bottom-0 z-30 transform-handle group/transform"
        style={{
            left: `${minFrame * frameWidth - 12}px`,
            width: `${(maxFrame - minFrame) * frameWidth + 24}px`,
        }}
    >
        <div
            className="absolute top-1 bottom-1 left-0 right-0 bg-orange-500/20 border border-orange-500/50 rounded-md cursor-grab active:cursor-grabbing hover:bg-orange-500/30 transition-colors"
            onMouseDown={(e) => onStart(e, 'move', minFrame, maxFrame)}
        />
        <div
            className="absolute top-0 bottom-0 left-0 w-3 cursor-ew-resize flex items-center justify-center group/l"
            onMouseDown={(e) => onStart(e, 'scale_left', minFrame, maxFrame)}
        >
            <div className="w-1 h-3 bg-orange-400 rounded-full shadow-sm group-hover/l:bg-white" />
        </div>
        <div
            className="absolute top-0 bottom-0 right-0 w-3 cursor-ew-resize flex items-center justify-center group/r"
            onMouseDown={(e) => onStart(e, 'scale_right', minFrame, maxFrame)}
        >
            <div className="w-1 h-3 bg-orange-400 rounded-full shadow-sm group-hover/r:bg-white" />
        </div>
    </div>
);
