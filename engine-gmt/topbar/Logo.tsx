/**
 * GmtLogo — the "GMT" wordmark with cyan M, ported from gmt-0.8.5's
 * RenderTools.tsx (the original component had this inline alongside
 * the project-name button).
 *
 * Registered as a left-slot topbar item at order -10 so it renders
 * before the engine's default `project-name` (order 0). app-gmt-only —
 * other apps using the engine topbar see only their own ProjectName.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Popover } from '../../components/Popover';
import { DraggableNumber } from '../../components/Slider';
import { CheckIcon } from '../../components/Icons';

export const GmtLogo: React.FC = () => {
    const name = useEngineStore((s) => s.projectSettings.name);
    const version = useEngineStore((s) => s.projectSettings.version);
    const setProjectSettings = useEngineStore((s) => s.setProjectSettings);

    const [isRenaming, setIsRenaming] = useState(false);
    const [tempName, setTempName] = useState(name);
    const [tempVersion, setTempVersion] = useState(version);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming) {
            setTempName(name);
            setTempVersion(version);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isRenaming, name, version]);

    const save = () => {
        if (tempName.trim()) setProjectSettings({ name: tempName.trim(), version: tempVersion });
        setIsRenaming(false);
    };

    return (
        <div className="flex flex-col leading-none select-none pr-3 relative">
            <span className="text-xl font-bold tracking-tighter text-white leading-none">
                G<span className="text-cyan-400">M</span>T
            </span>
            <button
                onClick={() => setIsRenaming(true)}
                className="text-[8px] font-mono text-gray-500 hover:text-cyan-300 hover:underline transition-colors text-left truncate max-w-[120px] mt-0.5"
                title="Click to rename project"
            >
                {name}
            </button>

            {isRenaming && (
                <Popover width="w-48" align="start" arrow={false} onClose={() => setIsRenaming(false)}>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1">Project Name</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setIsRenaming(false); }}
                                className="w-full bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                                placeholder="Enter name..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] text-gray-500 font-bold block mb-1">Ver</label>
                                <div className="h-6 bg-gray-900 border border-white/10 rounded overflow-hidden">
                                    <DraggableNumber
                                        value={tempVersion}
                                        onChange={(v) => setTempVersion(Math.max(1, Math.round(v)))}
                                        step={1} min={1} max={99}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={save}
                                className="flex-1 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded flex items-center justify-center mt-3.5"
                                title="Save"
                            >
                                <CheckIcon />
                            </button>
                        </div>
                    </div>
                </Popover>
            )}
        </div>
    );
};
