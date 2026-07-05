/**
 * WeaveSection — the Formula panel's weave STRUCTURE section (ADR-0089 P4.7).
 *
 * Replaces the Hybrid Box compilable section AND the "Edit weave…" affordance
 * (EditWeaveButton, retired): weaving formulas across the iteration loop is now
 * authored right here in the Formula panel, not in a modal tab. Hosts the
 * host-agnostic WeaveEditorPane in its 'panel' variant — slot rows, schedule
 * (Sequence / Rhythm), loop strip, budget meter, low-profile Enabled, explicit
 * Build. Per-formula PARAM sliders stay in the formula-params widget ABOVE
 * (bank params route feature:'weave', grouped per formula); this section owns
 * STRUCTURE only.
 *
 * Collapsible. A single-formula scene collapses to a one-liner "+ Add formula"
 * — THE discoverable entry into weaving. A weave scene shows a formula-count
 * summary. Self-contained / modular formulas own their whole loop, so the
 * section shows a muted "owns its loop" note instead of the affordance.
 *
 * @see docs/adr/0089-weave-core-unification.md
 */
import React, { useState } from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import { registry } from '../../../engine/FractalRegistry';
import type { FractalDefinition } from '../../../types/fractal';
import { CollapsibleSection } from '../../../../components/CollapsibleSection';
import { SectionDivider } from '../../../../components/SectionLabel';
import { nativeSlotReject } from '../../../engine/weave/nativeSlotCatalog';
import { WeaveEditorPane } from '../../WeaveEditor';

export const WeaveSection: React.FC = () => {
    const formula = useEngineStore((s: any) => s.formula);
    const def = registry.get(formula) as FractalDefinition | undefined;
    const ws = def?.weaveSource;
    const isWeave = !!ws;
    // Self-contained / modular formulas own their full loop — weaving is n/a
    // (same reject set the resolver + picker enforce).
    const weavable = !!def && !nativeSlotReject(def);
    // A weave scene defaults OPEN (the editor is what you came for); a single
    // formula defaults collapsed to the "+ Add formula" one-liner.
    const [open, setOpen] = useState(isWeave);

    const collapsedRight = open ? null : isWeave ? (
        <span
            className="text-[9px] text-fg-tertiary truncate max-w-[150px]"
            title={`Weave: ${ws!.title}`}
        >
            {ws!.slots.length} formulas
        </span>
    ) : weavable ? (
        <button
            onClick={() => setOpen(true)}
            className="text-[9px] font-bold text-accent-300 hover:text-accent-200 transition-colors"
            title="Weave this formula with others across the iteration loop"
        >
            + Add formula
        </button>
    ) : (
        <span className="text-[9px] text-fg-tertiary/60" title="This formula owns its full iteration loop — weaving isn't available.">
            owns its loop
        </span>
    );

    return (
        <div data-help-id="weave.editor">
            <CollapsibleSection
                label={isWeave ? 'Weave' : 'Weave formulas'}
                labelVariant="primary"
                open={open}
                onToggle={() => setOpen((o) => !o)}
                rightContent={collapsedRight}
            >
                <div className="px-1 pt-2 pb-1">
                    <WeaveEditorPane
                        key={formula}
                        variant="panel"
                        seedFormulaId={!isWeave && weavable ? formula : undefined}
                    />
                </div>
            </CollapsibleSection>
            <SectionDivider />
        </div>
    );
};

export default WeaveSection;
