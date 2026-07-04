/**
 * EditWeaveButton — the Formula panel's weave affordance (ADR-0089 P4.4).
 *
 * Replaces the retired Formula Interlace section: weaving formulas across the
 * iteration loop is authored in the Weave Editor (the Import Mandelbulb3D
 * modal's Weave tab), and this button is the panel's way in. Label reflects
 * the active formula: a weave formula (carries `weaveSource`) reads
 * "Edit weave…", anything else "Weave with another formula…".
 *
 * Legacy interlace scenes migrate to 2-slot weaves at load
 * (utils/weaveMigration.ts), so this is the ONE authoring surface.
 */
import React, { useState } from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import { registry } from '../../../engine/FractalRegistry';
import type { FractalDefinition } from '../../../types/fractal';
import { ImportMandelbulb3DModal } from './ImportMandelbulb3DModal';

export function EditWeaveButton() {
    const [open, setOpen] = useState(false);
    const formula = useEngineStore((s: any) => s.formula);
    const isWeave = !!(registry.get(formula) as FractalDefinition | undefined)?.weaveSource;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="w-full text-left px-2 py-1.5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-accent-500/40 transition-colors"
                title={isWeave
                    ? 'Open this weave in the Weave Editor — reorder slots, change formulas, adjust the schedule'
                    : 'Weave this formula with others across the iteration loop (the Weave Editor)'}
            >
                ⧉ {isWeave ? 'Edit weave…' : 'Weave with another formula…'}
            </button>
            {open && (
                <ImportMandelbulb3DModal open={open} onClose={() => setOpen(false)} initialTab="weave" />
            )}
        </>
    );
}
