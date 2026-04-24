/**
 * RegionOverlay — the visual crop-region rectangle + drag/resize/move
 * handles. Extracted from `h:/GMT/gmt-0.8.5/components/ViewportArea.tsx`
 * (which defined it inline).
 *
 * Mouse events are handled by the `useRegionSelection` hook on the
 * parent container. This component renders the visible rectangle,
 * header bar (dimensions + sample count + convergence + clear ×),
 * and the 8 resize handles. `isDrawing` = live preview while the user
 * drags a new region; `isGhostDragging` = mid-move/resize; otherwise
 * the region is idle and fully opaque.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useEngineStore, getCanvasPhysicalPixelSize } from '../../../store/engineStore';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();

const HANDLE_DIRS = ['n','s','e','w','ne','nw','se','sw'] as const;
const HANDLE_STYLES: Record<string, string> = {
    n:  'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    s:  'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    e:  'top-1/2 right-0 -translate-y-1/2 translate-x-1/2 cursor-ew-resize',
    w:  'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 cursor-ew-resize',
    ne: 'top-0 right-0 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize',
    nw: 'top-0 left-0 -translate-y-1/2 -translate-x-1/2 cursor-nwse-resize',
    se: 'bottom-0 right-0 translate-y-1/2 translate-x-1/2 cursor-nwse-resize',
    sw: 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2 cursor-nesw-resize',
};

export const RegionOverlay: React.FC<{
    region: { minX: number; minY: number; maxX: number; maxY: number };
    isGhostDragging: boolean;
    isDrawing: boolean;
    onClear: () => void;
}> = ({ region, isGhostDragging, isDrawing, onClear }) => {
    const sampleCap = useEngineStore((s) => s.sampleCap);
    const setSampleCap = useEngineStore((s) => s.setSampleCap);
    const convergenceThreshold = useEngineStore((s) => s.convergenceThreshold);

    const [samples, setSamples] = useState(0);
    const [convergence, setConvergence] = useState(1.0);

    useEffect(() => {
        const id = setInterval(() => {
            setSamples((engine as any).accumulationCount ?? 0);
            setConvergence((engine as any).convergenceValue ?? 1);
        }, 100);
        return () => clearInterval(id);
    }, []);

    const [canvasW, canvasH] = getCanvasPhysicalPixelSize(useEngineStore.getState());
    const regionW = Math.round((region.maxX - region.minX) * canvasW);
    const regionH = Math.round((region.maxY - region.minY) * canvasH);

    const capReached = sampleCap > 0 && samples >= sampleCap;
    const thresholdRaw = convergenceThreshold / 100.0;
    const isConverged = convergence < thresholdRaw && samples > 2;

    const cycleSampleCap = useCallback(() => {
        const caps = [0, 64, 128, 256, 512, 1024, 2048, 4096];
        const idx = caps.indexOf(sampleCap);
        const next = idx >= 0 ? caps[(idx + 1) % caps.length] : 256;
        setSampleCap(next);
    }, [sampleCap, setSampleCap]);

    const borderClass = isDrawing
        ? 'border-cyan-400 border-dashed opacity-70'
        : isGhostDragging
            ? 'border-cyan-400 border-dashed opacity-80'
            : 'border-cyan-500 opacity-100';

    return (
        <div
            className={`absolute border-2 z-40 group/box region-box cursor-move transition-opacity duration-75 ${borderClass}`}
            style={{
                left: `${region.minX * 100}%`,
                bottom: `${region.minY * 100}%`,
                right: `${(1 - region.maxX) * 100}%`,
                top: `${(1 - region.maxY) * 100}%`,
            }}
        >
            {!isDrawing && (
                <div className="absolute top-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1.5 pointer-events-auto shadow-md select-none" style={{ backdropFilter: 'blur(4px)' }}>
                    <span className="text-gray-400">{regionW}×{regionH}</span>
                    <div className="w-px h-2.5 bg-white/10" />
                    <span className={capReached ? 'text-green-400' : 'text-cyan-300'}>{samples}</span>
                    <span className="text-gray-500">/ {sampleCap === 0 ? '∞' : sampleCap}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); cycleSampleCap(); }}
                        className="text-gray-500 hover:text-cyan-300 transition-colors px-0.5"
                        title={`Sample cap: ${sampleCap === 0 ? 'Infinite' : sampleCap}. Click to cycle.`}
                    >
                        ⟳
                    </button>
                    <div className="w-px h-2.5 bg-white/10" />
                    <span className={isConverged ? 'text-green-400' : 'text-gray-400'} title={`Convergence: ${(convergence * 100).toFixed(3)}% (threshold: ${convergenceThreshold.toFixed(2)}%)`}>
                        {(convergence * 100).toFixed(2)}%
                    </span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-500">{convergenceThreshold.toFixed(2)}%</span>
                    <div className="w-px h-2.5 bg-white/10" />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Clear Region"
                    >✕</button>
                </div>
            )}

            {!isDrawing && !isGhostDragging && HANDLE_DIRS.map((dir) => (
                <div
                    key={dir}
                    data-handle={dir}
                    className={`absolute w-2.5 h-2.5 bg-cyan-500 border border-cyan-300 rounded-sm pointer-events-auto opacity-0 group-hover/box:opacity-100 transition-opacity ${HANDLE_STYLES[dir]}`}
                />
            ))}
        </div>
    );
};
