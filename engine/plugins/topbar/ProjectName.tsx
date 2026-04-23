/**
 * ProjectName — editable project title + version pill for the topbar.
 *
 * Reads from useFractalStore's projectSettings (shared engine state).
 * Click to edit; Enter/Escape/blur commits.
 *
 * Generic for any engine app: fluid-toy, fractal-toy, future GMT port
 * all consume the same projectSettings store surface.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useFractalStore } from '../../../store/fractalStore';

export const ProjectName: React.FC = () => {
    const name = useFractalStore((s) => s.projectSettings.name);
    const version = useFractalStore((s) => s.projectSettings.version);
    const setProjectSettings = useFractalStore((s) => s.setProjectSettings);

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!editing) setDraft(name);
    }, [name, editing]);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const commit = () => {
        if (draft.trim().length > 0 && draft !== name) {
            setProjectSettings({ name: draft.trim() });
        }
        setEditing(false);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') { setDraft(name); setEditing(false); }
                }}
                className="text-xs font-semibold text-white bg-black/60 border border-cyan-500/40 rounded px-2 py-1 outline-none"
                style={{ width: Math.max(80, draft.length * 8 + 24) }}
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded px-2 py-1 transition-colors"
            title="Click to rename project"
        >
            <span className="font-semibold truncate max-w-[240px]">{name}</span>
            {version > 0 && <span className="text-[9px] text-gray-500 font-mono">v{version}</span>}
        </button>
    );
};
