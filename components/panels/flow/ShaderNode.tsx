
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { NodeParams } from '../node-editor/NodeParams';
import { PipelineNode } from '../../../types';
import { nodeRegistry } from '../../../engine/NodeRegistry';
import { CloseIcon } from '../../Icons';

export const ShaderNode = memo(({ data, id, selected }: NodeProps) => {
    const node = data.node as PipelineNode;
    const { updateParams, toggleBinding, updateNode, removeNode } = data.actions;
    const index = data.index;

    const def = nodeRegistry.get(node.type);

    // Determine color based on category/type
    let headerColor = "text-gray-400";
    let borderColor = selected ? "border-cyan-500" : "border-gray-700";
    let headerBg = "";
    
    // Auto-detect inputs (A/B) for handle rendering
    // CSG nodes usually have Input 1 (In) and Input 2 (Operand)
    // We assume anything in 'Combiners' category needs 2 inputs
    const isCSG = def?.category === 'Combiners (CSG)';

    if (node.type === 'Mandelbulb') headerColor = "text-pink-400";
    if (def?.category === 'Folds') headerColor = "text-amber-400";
    if (def?.category === 'Transforms' || def?.category === 'Distortion') headerColor = "text-blue-400";
    if (isCSG) {
        headerColor = "text-green-400";
        headerBg = "bg-green-900/20";
    }

    return (
        <div className={`w-64 bg-gray-900/90 backdrop-blur-md rounded-lg border shadow-xl transition-all ${borderColor}`}>
            
            {/* Input Handles */}
            {isCSG ? (
                <>
                    <div className="absolute -top-3 left-8 text-[9px] text-gray-500 font-bold uppercase">A</div>
                    <Handle 
                        type="target" 
                        position={Position.Top} 
                        id="a"
                        className="!bg-cyan-500 !w-3 !h-3 !border-none -mt-1.5 !left-8" 
                    />
                    
                    <div className="absolute -top-3 right-8 text-[9px] text-gray-500 font-bold uppercase">B</div>
                    <Handle 
                        type="target" 
                        position={Position.Top} 
                        id="b"
                        className="!bg-cyan-500 !w-3 !h-3 !border-none -mt-1.5 !left-auto !right-8" 
                    />
                </>
            ) : (
                <Handle 
                    type="target" 
                    position={Position.Top} 
                    className="!bg-cyan-500 !w-3 !h-3 !border-none -mt-1.5" 
                />
            )}

            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 rounded-t-lg handle cursor-move ${headerBg}`}>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${headerColor}`}>
                        {def?.label || node.type}
                    </span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); removeNode(id); }}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                >
                    <CloseIcon />
                </button>
            </div>

            {/* Body */}
            <div className="p-3">
                <NodeParams 
                    node={node} 
                    index={index} 
                    updateParams={(i, p) => updateParams(id, p)} // Passing ID instead of index for stability
                    toggleBinding={(i, k) => toggleBinding(id, k)}
                    updateNode={(i, u) => updateNode(id, u)}
                />
            </div>

            {/* Output Handle */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!bg-cyan-500 !w-3 !h-3 !border-none -mb-1.5" 
            />
        </div>
    );
});

export const StartNode = memo(() => {
    return (
        <div className="px-4 py-2 bg-green-900/20 border border-green-500/50 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Input (Z)</span>
            <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-none -mb-1.5" />
        </div>
    );
});

export const EndNode = memo(() => {
    return (
        <div className="px-4 py-2 bg-pink-900/20 border border-pink-500/50 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.2)]">
            <Handle type="target" position={Position.Top} className="!bg-pink-500 !w-3 !h-3 !border-none -mt-1.5" />
            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Output (Distance)</span>
        </div>
    );
});
