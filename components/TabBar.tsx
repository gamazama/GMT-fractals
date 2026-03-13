
import React from 'react';

interface TabBarProps<T extends string> {
    tabs: readonly T[];
    active: T;
    onChange: (tab: T) => void;
    className?: string;
}

export function TabBar<T extends string>({ tabs, active, onChange, className = '' }: TabBarProps<T>) {
    return (
        <div className={`flex bg-black/40 border-b border-white/10 ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => onChange(tab)}
                    className={`flex-1 py-2 text-[10px] font-bold transition-all relative ${
                        active === tab
                            ? 'text-cyan-400 bg-white/5'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                    {tab}
                    {active === tab && (
                        <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    )}
                </button>
            ))}
        </div>
    );
}

export default TabBar;
