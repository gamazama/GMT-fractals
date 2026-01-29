
import React, { useRef, useEffect } from 'react';
import { drawGraph } from '../../utils/GraphRenderer';
import { GraphViewTransform } from '../../utils/GraphUtils';
import { AnimationSequence } from '../../types';

interface GraphCanvasProps {
    width: number;
    height: number;
    view: GraphViewTransform;
    sequence: AnimationSequence;
    trackIds: string[];
    currentFrame: number;
    durationFrames: number;
    selectedKeyframeIds: string[];
    selectionBox: { x: number, y: number, w: number, h: number } | null;
    normalized: boolean;
    trackRanges: Record<string, { min: number, max: number, span: number }>;
    softSelectionEnabled: boolean;
    softSelectionRadius: number;
    softSelectionType: any;
    softInteraction: { isAdjusting: boolean, anchorKey: string | null };
    highlightedTracks: Set<string>;
    
    // Event Forwarding
    onMouseDown: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawGraph({
            ctx,
            width: props.width,
            height: props.height,
            view: props.view,
            sequence: props.sequence,
            trackIds: props.trackIds,
            currentFrame: props.currentFrame,
            durationFrames: props.durationFrames,
            selectedKeyframeIds: props.selectedKeyframeIds,
            selectionBox: props.selectionBox,
            normalized: props.normalized,
            trackRanges: props.trackRanges,
            softSelectionEnabled: props.softSelectionEnabled,
            softSelectionRadius: props.softSelectionRadius,
            softSelectionType: props.softSelectionType,
            softInteraction: props.softInteraction,
            highlightedTracks: props.highlightedTracks
        });

    }, [
        props.width, props.height, props.view, props.sequence, props.trackIds, 
        props.currentFrame, props.durationFrames, props.selectedKeyframeIds, 
        props.selectionBox, props.normalized, props.trackRanges, 
        props.softSelectionEnabled, props.softSelectionRadius, props.softSelectionType, 
        props.softInteraction, props.highlightedTracks
    ]);

    return (
        <canvas 
            ref={canvasRef}
            width={props.width}
            height={props.height}
            className="block cursor-crosshair"
            onMouseDown={props.onMouseDown}
            onContextMenu={props.onContextMenu}
            onDoubleClick={props.onDoubleClick}
        />
    );
};
