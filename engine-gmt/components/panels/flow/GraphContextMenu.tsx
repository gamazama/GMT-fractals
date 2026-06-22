
import React, { useRef, useEffect, useState } from 'react';
import { NodeType } from '../../../types';
import { nodeRegistry } from '../../../engine/NodeRegistry';
import { AnchoredMenu, stopNavKeys } from '../../../../components/ui';

export interface GraphMenuState {
    type: 'pane';
    x: number;
    y: number;
    paneX: number; 
    paneY: number; 
}

interface GraphContextMenuProps {
    menu: GraphMenuState;
    onClose: () => void;
    onAdd: (type: NodeType, pos: {x: number, y: number}) => void;
    // Legacy props kept for compatibility
    onDeleteNode?: (id: string) => void;
    onDeleteEdge?: (id: string) => void;
}

export const GraphContextMenu: React.FC<GraphContextMenuProps> = ({
    menu, onClose, onAdd
}) => {
    const [filter, setFilter] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const id = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(id);
    }, []);

    // Use Registry to build dynamic groups
    const groups = nodeRegistry.getGrouped();
    const allDefs = nodeRegistry.getAll();

    // Filter logic
    const filteredDefs = filter
        ? allDefs.filter(d => d.id.toLowerCase().includes(filter.toLowerCase()) || d.label.toLowerCase().includes(filter.toLowerCase()))
        : null;

    return (
        <AnchoredMenu anchor={{ x: menu.x, y: menu.y }} onClose={onClose} padding={10}>
        <div
            className="w-48 bg-surface-raised border border-line/20 rounded-lg shadow-2xl flex flex-col text-xs overflow-hidden animate-pop-in"
            {...stopNavKeys({ allowEscape: true })}
        >
            <div className="p-2 border-b border-line/10 bg-surface-header">
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Search node..." 
                    className="w-full bg-surface-sunken border border-line/20 rounded px-2 py-1 text-fg-secondary outline-none focus:border-accent-500"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const first = filteredDefs ? filteredDefs[0] : allDefs[0];
                            if (first) {
                                onAdd(first.id as NodeType, { x: menu.paneX, y: menu.paneY });
                                onClose();
                            }
                        }
                    }}
                />
            </div>

            <div className="max-h-64 overflow-y-auto custom-scroll py-1">
                {filteredDefs ? (
                    filteredDefs.map(def => (
                        <ContextMenuItem 
                            key={def.id} 
                            type={def.id} 
                            label={def.label}
                            desc={def.description}
                            onClick={() => { onAdd(def.id as NodeType, { x: menu.paneX, y: menu.paneY }); onClose(); }} 
                        />
                    ))
                ) : (
                    Object.entries(groups).map(([category, ids]) => (
                        <div key={category} className="mb-1">
                            <div className="px-3 py-1 text-[9px] font-bold text-fg-dim bg-line/5">{category}</div>
                            {ids.map(id => {
                                const def = nodeRegistry.get(id);
                                return (
                                    <ContextMenuItem 
                                        key={id} 
                                        type={id as NodeType} 
                                        label={def?.label || id}
                                        desc={def?.description}
                                        onClick={() => { onAdd(id as NodeType, { x: menu.paneX, y: menu.paneY }); onClose(); }} 
                                    />
                                );
                            })}
                        </div>
                    ))
                )}
                {filteredDefs && filteredDefs.length === 0 && <div className="p-3 text-fg-dim text-center italic">No matches</div>}
            </div>
        </div>
        </AnchoredMenu>
    );
};

const ContextMenuItem: React.FC<{ type: NodeType, label: string, desc?: string, onClick: () => void }> = ({ type, label, desc, onClick }) => {
    return (
        <button 
            className="w-full text-left px-3 py-1.5 hover:bg-accent-900/50 hover:text-fg text-fg-tertiary transition-colors flex items-center justify-between group"
            onClick={onClick}
            title={desc}
        >
            <span>{label}</span>
            <span className="text-[9px] text-fg-faint group-hover:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity">+</span>
        </button>
    );
};
