
import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ContextMenuItem } from '../types/help';
import { HELP_TOPICS } from '../data/help/registry';
import { HelpIcon, CheckIcon, ArrowIcon } from './Icons';
import Slider from './Slider';

interface GlobalContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    targetHelpIds: string[];
    onClose: () => void;
    onOpenHelp: (id: string) => void;
}

const GlobalContextMenu: React.FC<GlobalContextMenuProps> = ({ x, y, items, targetHelpIds, onClose, onOpenHelp }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState({ x, y, opacity: 0 });

    useLayoutEffect(() => {
        if (!menuRef.current) return;
        
        // Use standard measurement - animations are disabled via CSS so this is accurate
        const rect = menuRef.current.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const padding = 12;
        
        let newX = x;
        let newY = y;

        // Horizontal Flip: If expanding right goes OOB, expand left from cursor
        if (newX + rect.width > winW - padding) {
            newX = x - rect.width;
        }

        // Vertical Flip: If expanding down goes OOB, expand up from cursor
        if (newY + rect.height > winH - padding) {
            newY = y - rect.height;
        }
        
        // Hard Clamp (Left/Top) to ensure it's never off-screen top-left
        // This handles cases where the element is larger than the screen or cursor is very close to 0,0
        newX = Math.max(padding, Math.min(newX, winW - rect.width - padding));
        newY = Math.max(padding, Math.min(newY, winH - rect.height - padding));

        setLayout({ x: newX, y: newY, opacity: 1 });
    }, [x, y, items, targetHelpIds]);

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const timer = setTimeout(() => window.addEventListener('mousedown', handleDown), 50);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousedown', handleDown);
        };
    }, [onClose]);

    // Resolve valid help topics
    const helpTopics = targetHelpIds
        .map(id => HELP_TOPICS[id])
        .filter(t => !!t);

    return createPortal(
        <div 
            ref={menuRef}
            // Add [&_.animate-slider-entry]:!animate-none to force sliders to render full height instantly
            // This ensures getBoundingClientRect returns the true final height for positioning
            className="fixed z-[9999] bg-[#1a1a1a] border border-white/20 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] py-1 min-w-[200px] animate-fade-in [&_.animate-slider-entry]:!animate-none"
            style={{ left: layout.x, top: layout.y, opacity: layout.opacity }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Action Items */}
            {items.map((item, i) => {
                if (item.element) {
                    return <div key={i}>{item.element}</div>;
                }

                if (item.isHeader) {
                    return (
                        <div key={i} className="px-4 py-1 text-[9px] text-gray-500 font-bold uppercase tracking-wider border-b border-white/10 mt-1 mb-1 bg-white/5">
                            {item.label}
                        </div>
                    );
                }

                if (item.type === 'slider') {
                    return (
                        <div key={i} className="px-3 py-1 mb-1">
                            <Slider 
                                label={item.label || ''}
                                value={item.value ?? 0}
                                min={item.min ?? 0}
                                max={item.max ?? 1}
                                step={item.step ?? 0.01}
                                onChange={(v) => item.onChange && item.onChange(v)}
                                highlight
                                overrideInputText={item.value?.toFixed(2)}
                            />
                        </div>
                    );
                }

                return (
                    <button
                        key={i}
                        onClick={() => { 
                            if(!item.disabled && item.action) { 
                                item.action(); 
                                if (!item.keepOpen) onClose(); 
                            } 
                        }}
                        disabled={item.disabled}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors ${
                            item.disabled
                            ? 'text-gray-600 cursor-not-allowed opacity-50'
                            : item.danger 
                                ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300' 
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {item.icon && <span className={item.disabled ? "text-gray-600" : "text-gray-500"}>{item.icon}</span>}
                            <span className={item.checked ? 'text-cyan-400 font-bold' : ''}>{item.label}</span>
                        </div>
                        {item.checked && <CheckIcon />}
                    </button>
                );
            })}

            {items.length > 0 && helpTopics.length > 0 && <div className="h-px bg-white/10 my-1" />}

            {/* Help Items with Hierarchy */}
            {helpTopics.length > 0 && (
                <>
                    <div className="px-4 py-1 text-[9px] text-cyan-700 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                        <HelpIcon /> Context Help
                    </div>
                    {helpTopics.map((topic, i) => (
                        <button
                            key={topic.id}
                            onClick={() => { onOpenHelp(topic.id); onClose(); }}
                            className={`w-full text-left px-4 py-1.5 text-xs transition-colors flex items-center gap-2 group ${
                                i === 0 
                                ? 'text-cyan-400 hover:bg-cyan-900/30 hover:text-cyan-200 font-bold' // Most specific
                                : 'text-gray-400 hover:bg-white/5 hover:text-white' // Parents
                            }`}
                            style={{ paddingLeft: `${16 + i * 8}px` }} // Indentation
                        >
                            {i > 0 && <span className="opacity-30 text-[8px]">└</span>}
                            <span>{topic.title}</span>
                            {i === 0 && <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"><ArrowIcon /></span>}
                        </button>
                    ))}
                </>
            )}
        </div>,
        document.body
    );
};

export default GlobalContextMenu;
