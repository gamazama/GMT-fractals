
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { NodeType } from '../../../types';
import { nodeRegistry } from '../../../engine/NodeRegistry';

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
    const menuRef = useRef<HTMLDivElement>(null);
    const [filter, setFilter] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const [layout, setLayout] = useState({ x: 0, y: 0, visible: false });

    useLayoutEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const padding = 10;
            let newX = menu.x;
            let newY = menu.y;
            if (newX + rect.width > winW - padding) newX = winW - rect.width - padding;
            if (newY + rect.height > winH - padding) newY = winH - rect.height - padding;
            newX = Math.max(padding, newX);
            newY = Math.max(padding, newY);
            setLayout({ x: newX, y: newY, visible: true });
            if (inputRef.current) requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [menu.x, menu.y]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [onClose]);

    // Use Registry to build dynamic groups
    const groups = nodeRegistry.getGrouped();
    const allDefs = nodeRegistry.getAll();
    
    // Filter logic
    const filteredDefs = filter 
        ? allDefs.filter(d => d.id.toLowerCase().includes(filter.toLowerCase()) || d.label.toLowerCase().includes(filter.toLowerCase()))
        : null;

    return createPortal(
        <div 
            ref={menuRef}
            className="fixed w-48 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-2xl flex flex-col text-xs overflow-hidden animate-pop-in"
            style={{ 
                left: layout.x, top: layout.y, 
                opacity: layout.visible ? 1 : 0, 
                visibility: layout.visible ? 'visible' : 'hidden', 
                zIndex: 9999 
            }}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <div className="p-2 border-b border-white/10 bg-gray-800/50">
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Search node..." 
                    className="w-full bg-black/50 border border-gray-600 rounded px-2 py-1 text-gray-200 outline-none focus:border-cyan-500"
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
                            <div className="px-3 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider bg-white/5">{category}</div>
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
                {filteredDefs && filteredDefs.length === 0 && <div className="p-3 text-gray-500 text-center italic">No matches</div>}
            </div>
        </div>,
        document.body
    );
};

const ContextMenuItem: React.FC<{ type: NodeType, label: string, desc?: string, onClick: () => void }> = ({ type, label, desc, onClick }) => {
    return (
        <button 
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/50 hover:text-white text-gray-300 transition-colors flex items-center justify-between group"
            onClick={onClick}
            title={desc}
        >
            <span>{label}</span>
            <span className="text-[9px] text-gray-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">+</span>
        </button>
    );
};
