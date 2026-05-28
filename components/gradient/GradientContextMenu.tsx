import React, { useRef, useEffect, useState } from 'react';
import { GradientStop } from '../../types';
import { getGradientCssString } from '../../utils/colorUtils';
import { AnchoredMenu } from '../ui';

interface ContextMenuProps {
    x: number;
    y: number;
    options: {
        label: string;
        action: () => void;
        disabled?: boolean;
        isHeader?: boolean;
        stops?: GradientStop[]; // Optional stops for preview
    }[];
    onClose: () => void;
}

const LazyGradientPreview: React.FC<{ stops: GradientStop[] }> = ({ stops }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '50px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className="w-16 h-3 rounded border border-white/20 shadow-sm shrink-0"
            style={visible ? { background: getGradientCssString(stops) } : { background: '#222' }}
        />
    );
};

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
    return (
        <AnchoredMenu
            anchor={{ x, y }}
            onClose={onClose}
            padding={12}
            className="bg-[#1a1f3a] border border-white/20 rounded-md shadow-2xl py-1 w-[220px] max-h-[400px] overflow-y-auto custom-scroll"
        >
            {options.map((opt, i) => (
                opt.isHeader ? (
                    <div key={i} className="px-4 py-1 text-[10px] font-bold text-gray-500 border-b border-white/5 mt-1 mb-1 bg-black/20">
                        {opt.label}
                    </div>
                ) : (
                    <button
                        key={i}
                        onClick={() => { onClose(); requestAnimationFrame(() => opt.action()); }}
                        disabled={opt.disabled}
                        className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group transition-colors"
                    >
                        <span className="truncate mr-2">{opt.label}</span>
                        {opt.stops && <LazyGradientPreview stops={opt.stops} />}
                    </button>
                )
            ))}
        </AnchoredMenu>
    );
};

export default ContextMenu;
