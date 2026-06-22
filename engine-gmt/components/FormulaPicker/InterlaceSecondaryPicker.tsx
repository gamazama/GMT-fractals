/**
 * <InterlaceSecondaryPicker> — drop-in for the `interlaceFormula` param
 * in the interlace feature's Compile Settings collapsible.
 *
 * Renders as a label + dropdown-style trigger button (matches the rest of
 * the auto-feature-panel row aesthetics). Opens a popover-variant
 * <FormulaPicker> on click with:
 *   - specialEntries=[]   (no Modular / Workshop launchers — secondary is
 *                          formula-only)
 *   - disabledIds         (formulas the interlace feature rejects as
 *                          secondary, per its capability protocol entry —
 *                          shape:self-contained + shape:modular)
 *
 * Registered with componentRegistry as 'interlace-secondary-picker' so
 * shared/AutoFeaturePanel.tsx can dispatch to it without importing
 * engine-gmt code directly.
 *
 * @see dev/engine-gmt/features/interlace/index.ts (requires.rejects.secondary)
 * @see dev/docs/gmt/35_Capability_Protocol.md
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { registry } from '../../engine/FractalRegistry';
import type { Capability } from '../../types/capabilities';
import { FormulaPicker } from './FormulaPicker';
import { NO_SPECIAL_ENTRIES } from './pickerCategories';
import { ChevronDown } from '../../../components/Icons';

const REJECTED_CAPS: Capability[] = ['shape:self-contained', 'shape:modular'];

export interface InterlaceSecondaryPickerProps {
    value: string;
    onChange: (v: string) => void;
    label: string;
    disabled?: boolean;
}

export const InterlaceSecondaryPicker: React.FC<InterlaceSecondaryPickerProps> = ({
    value, onChange, label, disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    // Compat: formulas whose capabilities match interlace's reject set.
    // Capability sets are populated at registry.register() time (via
    // deriveLegacy or explicit declaration), so this Set is stable across
    // renders — memo with no deps is safe.
    const disabledIds = useMemo(() => {
        const ids = new Set<string>();
        for (const def of registry.getAll()) {
            const caps = def.shader.capabilities;
            if (!caps) continue;
            if (REJECTED_CAPS.some(c => caps.has(c))) ids.add(def.id);
        }
        return ids;
    }, []);

    const disabledReason = useCallback((id: string): string | undefined => {
        const caps = registry.get(id)?.shader.capabilities;
        if (caps?.has('shape:self-contained'))
            return 'Self-contained formula — owns its full iteration loop, can\'t be interlaced.';
        if (caps?.has('shape:modular'))
            return 'Modular has no GLSL body to interlace.';
        return undefined;
    }, []);

    const def = registry.get(value);
    const display = def?.name ?? value;

    const handleOpen = () => {
        if (!btnRef.current) return;
        setRect(btnRef.current.getBoundingClientRect());
        setOpen(true);
    };

    return (
        <>
            <div className={`flex items-stretch bg-line/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-line/5 w-full mb-px ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2 px-2 min-w-0 shrink-0">
                    <label className="text-[10px] font-medium tracking-tight select-none truncate text-fg-muted">
                        {label}
                    </label>
                </div>
                <button
                    ref={btnRef}
                    onClick={handleOpen}
                    className={`flex-1 flex items-center justify-between gap-1.5 px-2 text-[11px] font-bold text-fg hover:bg-line/[0.08] transition-colors min-w-0 ${
                        open ? 'bg-line/[0.08]' : ''
                    }`}
                >
                    <span className="truncate">{display}</span>
                    <span className={`text-fg-dim transition-transform ${open ? 'rotate-180' : ''}`}>
                        <ChevronDown />
                    </span>
                </button>
            </div>

            {open && rect && (
                <FormulaPicker
                    variant="popover"
                    anchorRect={rect}
                    value={value}
                    specialEntries={NO_SPECIAL_ENTRIES}
                    disabledIds={disabledIds}
                    disabledReason={disabledReason}
                    onCommit={(c) => {
                        if (c.action === 'select') onChange(c.id);
                        setOpen(false);
                    }}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
};
