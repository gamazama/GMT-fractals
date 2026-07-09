/**
 * CompileSection — the shared presentational shell for a "compilable" panel
 * section: the FeatureSection header (label / toggle / status / hover) with the
 * compile-aware edge-fade + header tone, closed by a SectionDivider.
 *
 * It owns ONLY the visual chrome. The compile/enable *logic* stays with each
 * caller: CompilableFeatureSection feeds it DDFS-feature state (compileParam,
 * CompileBar, AutoFeaturePanel bodies); WeaveSection feeds it weave state and
 * hosts WeaveEditorPane, which keeps its own enable/Build controls (ADR-0089).
 *
 * The `(isOn, isCompiled)` pair maps to the header tone + edge-fade via
 * `compileEdgeFade`: uncompiled (transparent, near-black) → thin fade;
 * compiled + off (grey) → long "disabled" fade; compiled + on → none.
 */
import React from 'react';
import { FeatureSection, FeatureSectionProps } from './FeatureSection';
import { SectionDivider } from './SectionLabel';

/** Map compile/enable state to FeatureSection's `edgeFade` mode. Keyed on the
 *  header tone: uncompiled headers are transparent/near-black → keep them dark
 *  with a thin 2px fade; a compiled-but-off header is grey → long fade that
 *  melts into the lip; a compiled + on header already IS the divider tone. */
export const compileEdgeFade = (isOn: boolean, isCompiled: boolean): boolean | 'thin' =>
    !isCompiled ? 'thin' : (isOn ? false : true);

interface CompileSectionProps extends Omit<FeatureSectionProps, 'enabled' | 'edgeFade'> {
    /** Whether the feature is on (drives the header toggle + disabled styling). */
    isOn: boolean;
    /** Whether it is compiled into the shader (drives header tone + edge-fade). */
    isCompiled: boolean;
    /** Contextual-help id set on the outer wrapper (right-click help, tutorial). */
    helpId?: string;
}

export const CompileSection: React.FC<CompileSectionProps> = ({
    isOn, isCompiled, helpId, headerClassName, children,
    forceBodyOpen, collapsible, open, ...rest
}) => {
    // Fade the divider's end-cap from the section's actual BOTTOM tone. When a
    // body is shown the bottom is the surface-raised body (solid cap, no fade);
    // header-only sections bottom out at the header — grey (compiled + off) or
    // transparent/near-black (uncompiled). `bodyShown` mirrors FeatureSection's
    // body gate. The card's own bottom fade is turned off so the cap owns the
    // bottom blend.
    const bodyShown = (isOn || !!forceBodyOpen) && (!collapsible || (open ?? true));
    const capFrom = bodyShown ? undefined
        : !isCompiled ? 'transparent'
        : isOn ? undefined
        : 'rgb(var(--surface-raised) / 0.5)';
    return (
        <div data-help-id={helpId}>
            <FeatureSection
                {...rest}
                forceBodyOpen={forceBodyOpen}
                collapsible={collapsible}
                open={open}
                enabled={isOn}
                headerClassName={headerClassName ?? (isCompiled ? '' : 'bg-transparent')}
                edgeFade={compileEdgeFade(isOn, isCompiled)}
                bottomFade={false}
            >
                {children}
            </FeatureSection>
            <SectionDivider capFrom={capFrom} />
        </div>
    );
};

export default CompileSection;
