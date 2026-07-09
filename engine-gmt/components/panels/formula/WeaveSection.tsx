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
import React, { useState, useEffect } from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import { registry } from '../../../engine/FractalRegistry';
import type { FractalDefinition } from '../../../types/fractal';
import { CompileSection } from '../../../../components/CompileSection';
import { nativeSlotReject } from '../../../engine/weave/nativeSlotCatalog';
import { WeaveEditorPane } from '../../WeaveEditor';

export const WeaveSection: React.FC = () => {
    const formula = useEngineStore((s: any) => s.formula);
    const weaveEnabled = useEngineStore((s: any) => s.weave?.weaveEnabled) ?? true;
    const def = registry.get(formula) as FractalDefinition | undefined;
    const ws = def?.weaveSource;
    const isWeave = !!ws;
    // Self-contained / modular formulas own their full loop — weaving is n/a
    // (same reject set the resolver + picker enforce).
    const weavable = !!def && !nativeSlotReject(def);
    // A weave scene defaults OPEN (the editor is what you came for); a single
    // formula defaults collapsed to the "+ Add formula" one-liner.
    const [open, setOpen] = useState(isWeave);
    // Loading a weave (incl. switching to one, or a migrated hybrid) re-opens the
    // section — "the editor is what you came for". Fires only on formula/isWeave
    // change, so a manual collapse of the current weave stays collapsed; landing
    // on a single formula never force-closes a section the user opened.
    useEffect(() => { if (isWeave) setOpen(true); }, [formula, isWeave]);

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

    // Mode B (ADR-0089 P4.7): adopt the shared compilable-section chrome
    // (header tone + edge-fade + closing divider) while the weave's enable /
    // Build stay inside WeaveEditorPane. `isOn` reflects weaveEnabled so a
    // toggled-off weave gets the disabled fade (a single formula reads as
    // on/neutral — it's an invitation, not a disabled section); `isCompiled` is
    // left true because the pane owns the dirty/Build indication. `forceBodyOpen`
    // keeps the pane visible while open even if the weave is toggled off within
    // it, and `hideToggle` leaves the enable control to the pane.
    const isOn = isWeave ? weaveEnabled : true;

    return (
        <CompileSection
            label={isWeave ? 'Weave' : 'Weave formulas'}
            featureId="weave"
            isOn={isOn}
            isCompiled={true}
            hideToggle
            collapsible
            open={open}
            onOpenChange={setOpen}
            forceBodyOpen
            rightContent={collapsedRight}
            helpId="weave.editor"
        >
            <div className="px-1 pt-2 pb-1 bg-surface-raised">
                <WeaveEditorPane
                    key={formula}
                    variant="panel"
                    seedFormulaId={!isWeave && weavable ? formula : undefined}
                />
            </div>
        </CompileSection>
    );
};

export default WeaveSection;
