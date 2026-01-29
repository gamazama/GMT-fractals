
import React, { memo, useState } from 'react';
import { PipelineNode } from '../../../types';
import Slider from '../../Slider';
import { LinkIcon, LogicIcon } from '../../Icons';
import { nodeRegistry } from '../../../engine/NodeRegistry';
import '../../../data/nodes/definitions'; // Load definitions

// Helper to render a slider with a binding button
const BoundSlider = memo(({ 
    label, val, min, max, step, binding, onToggle, onChange, hardMin, hardMax
}: { 
    label: string, 
    val: number, 
    min: number, 
    max: number, 
    step: number, 
    hardMin?: number,
    hardMax?: number,
    binding?: string,
    onToggle: () => void,
    onChange: (v:number)=>void 
}) => {
    return (
        <div className="flex gap-2 items-start mb-1">
            <div className="flex-1">
                <Slider 
                    label={binding ? `${label} (Bound to ${binding})` : label} 
                    value={val} 
                    min={min} max={max} step={step} 
                    hardMin={hardMin} hardMax={hardMax}
                    onChange={onChange}
                    highlight={!!binding}
                />
            </div>
            <button 
                onClick={onToggle}
                className={`mt-6 p-1 rounded border transition-colors ${binding ? 'bg-cyan-900/50 border-cyan-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                title={binding ? `Bound to ${binding}. Click to cycle.` : "Click to link to global parameter"}
            >
                <LinkIcon active={!!binding} />
            </button>
        </div>
    );
});

interface NodeParamsProps {
    node: PipelineNode;
    index: number;
    updateParams: (index: number, params: { [key: string]: number }) => void;
    toggleBinding: (index: number, paramKey: string) => void;
    updateNode: (index: number, updates: Partial<PipelineNode>) => void;
}

export const NodeParams: React.FC<NodeParamsProps> = ({ node, index, updateParams, toggleBinding, updateNode }) => {
    const [showLogic, setShowLogic] = useState(false);

    const toggleCondition = () => {
        const isActive = node.condition?.active;
        if (!isActive) {
            updateNode(index, { condition: { active: true, mod: 2, rem: 0 } });
            setShowLogic(true);
        } else {
            updateNode(index, { condition: { ...node.condition!, active: false } });
        }
    };

    const updateCondition = (key: 'mod' | 'rem', val: number) => {
        if (!node.condition) return;
        updateNode(index, { condition: { ...node.condition, [key]: val } });
    };

    const def = nodeRegistry.get(node.type);

    if (node.type === 'Note') {
        return (
            <textarea 
                className="w-full bg-black/20 text-gray-300 text-xs p-2 rounded border border-white/5 focus:border-cyan-500 outline-none resize-none font-sans leading-relaxed"
                rows={3}
                value={node.text || ""}
                onChange={(e) => updateNode(index, { text: e.target.value })}
                placeholder="Type a note..."
            />
        );
    }

    return (
        <div>
            {def ? (
                def.inputs.map(input => (
                    <BoundSlider 
                        key={input.id}
                        label={input.label}
                        val={node.params[input.id] ?? input.default}
                        min={input.min}
                        max={input.max}
                        step={input.step}
                        hardMin={input.hardMin}
                        hardMax={input.hardMax}
                        binding={node.bindings?.[input.id]}
                        onToggle={() => toggleBinding(index, input.id)}
                        onChange={(v) => updateParams(index, { [input.id]: v })}
                    />
                ))
            ) : (
                <div className="text-red-500 text-[10px]">Unknown Node Type: {node.type}</div>
            )}
            
            {/* Logic Toggle */}
            <div className="mt-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => setShowLogic(!showLogic)}
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white uppercase tracking-widest font-bold"
                    >
                        <LogicIcon active={!!node.condition?.active} />
                        Logic / Condition
                    </button>
                    <input 
                        type="checkbox" 
                        checked={!!node.condition?.active}
                        onChange={toggleCondition}
                        className="cursor-pointer"
                    />
                </div>
                
                {showLogic && node.condition?.active && (
                    <div className="mt-2 bg-amber-900/10 p-2 rounded border border-amber-500/20">
                        <div className="text-[9px] text-amber-200 mb-2">
                            Execute only on specific iterations:
                            <br />
                            <code>if (iter % Mod == Rem)</code>
                        </div>
                        <Slider 
                            label="Modulo (Every N iters)" 
                            value={node.condition.mod} 
                            min={1} max={10} step={1} 
                            onChange={(v) => updateCondition('mod', Math.round(v))} 
                        />
                        <Slider 
                            label="Remainder (On index)" 
                            value={node.condition.rem} 
                            min={0} max={node.condition.mod - 1} step={1} 
                            onChange={(v) => updateCondition('rem', Math.round(v))} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
