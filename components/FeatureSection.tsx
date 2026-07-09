
import React, { useState } from 'react';
import { useEngineStore } from '../store/engineStore';
import { featureRegistry } from '../engine/FeatureSystem';
import ToggleSwitch from './ToggleSwitch';

export interface FeatureSectionProps {
    label: string;
    featureId: string;
    toggleParam?: string; // Optional: If missing, tries to guess from EngineConfig
    children: React.ReactNode;
    description?: string;
    /** Extra content rendered between label and toggle (e.g. StatusDots) */
    statusContent?: React.ReactNode;
    /** Additional classes on the header row */
    headerClassName?: string;
    /** Override the auto-detected enabled state */
    enabled?: boolean;
    /** Override the auto-detected toggle handler */
    onToggle?: (val: boolean) => void;
    /** Hide the header toggle switch entirely. Used by compile-dropdown
     *  sections (e.g. Distance Estimator) which have no on/off state —
     *  the section is always present, the body shows compile-flagged
     *  inputs directly. */
    hideToggle?: boolean;
    /** Force the body open independently of `enabled`. Used by
     *  CompilableFeatureSection so a compile-pending CompileBar stays
     *  visible even when the user has just toggled the runtime off —
     *  otherwise the body collapses and they can't click Recompile to
     *  apply the change. The toggle still reflects `enabled` cleanly. */
    forceBodyOpen?: boolean;
    /** Optional explicit "unload" action shown as a small icon button to
     *  the left of the header toggle. CompilableFeatureSection wires this
     *  to a setter that clears compileParam (+ runtimeToggleParam) so the
     *  feature drops out of the shader entirely on the next compile —
     *  distinct from the runtime toggle, which only flips a uniform. */
    onUnload?: () => void;
    /** Optional "reset to defaults" action shown as a small ↻ icon next to
     *  Unload. Wired by callers to applyPartialPreset; restores the feature's
     *  params to their DDFS-declared defaults. No confirm — undo covers it. */
    onReset?: () => void;
    /** Make the header click toggle a local open/closed state (chevron shown).
     *  Independent of the on/off toggle — for always-present sections (e.g.
     *  the Distance Estimator compile-dropdown) that should start collapsed. */
    collapsible?: boolean;
    /** Initial open state when `collapsible` and uncontrolled. Defaults to open. */
    defaultOpen?: boolean;
    /** Controlled open state for `collapsible`. When provided, the caller owns
     *  the open/closed state (e.g. WeaveSection re-opens on weave load); omit
     *  for uncontrolled internal state seeded by `defaultOpen`. */
    open?: boolean;
    /** Called with the next open state when a controlled `collapsible` header is
     *  toggled. Pair with `open`. */
    onOpenChange?: (open: boolean) => void;
    /** Content rendered on the right of the header (before reset/unload/toggle),
     *  inside a click-stop group. For section affordances like the weave's
     *  collapsed "+ Add formula" button / formula-count summary. */
    rightContent?: React.ReactNode;
    /** Fade the section's top + bottom edges into the divider tone
     *  (`surface-raised`, the lip/cap colour) so a dark "off"/"uncompiled"
     *  header doesn't hard-seam against the lip above and end-cap below.
     *  - `true` / default `!isEnabled` → long top fade (the "disabled" look).
     *  - `'thin'` → short (2px) top fade matching the bottom, so an
     *    on-but-uncompiled header reads distinctly darker than a disabled one.
     *  - `false` → no fade (header already matches the divider tone). */
    edgeFade?: boolean | 'thin';
    /** Render the bottom edge fade (default true). Turn OFF when the following
     *  SectionDivider blends the bottom itself via `capFrom` (CompileSection),
     *  so the card and the cap don't double-fade against each other. */
    bottomFade?: boolean;
}

/** Small eject-arrow icon for the unload-from-shader action. */
const UnloadIcon: React.FC = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 9 12 2 19 9" />
        <line x1="5" y1="20" x2="19" y2="20" />
    </svg>
);

/** Small circular-arrow icon for the reset-to-defaults action. */
const ResetIcon: React.FC = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
);

export const FeatureSection: React.FC<FeatureSectionProps> = ({
    label, featureId, toggleParam, children, description,
    statusContent, headerClassName = '', enabled, onToggle, hideToggle = false, forceBodyOpen = false, onUnload, onReset,
    collapsible = false, defaultOpen = true, edgeFade, open: openProp, onOpenChange, rightContent, bottomFade = true,
}) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    // Controlled (caller owns `open`) or uncontrolled (internal state).
    // Non-collapsible sections are always "open".
    const isOpen = collapsible ? (openProp ?? internalOpen) : true;
    const toggleOpen = () => {
        if (openProp !== undefined) onOpenChange?.(!openProp);
        else setInternalOpen((o) => !o);
    };
    // Granular per-feature subscription. `useEngineStore()` no-selector
    // would re-render every FeatureSection on every store update —
    // with N features in N panels, that's a major contributor to the
    // per-pointer-event subscriber cascade in fluid-toy.
    const sliceState = useEngineStore((s) => (s as any)[featureId]);
    const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
    const setter = useEngineStore((s) => (s as any)[setterName]);

    const feature = featureRegistry.get(featureId);

    // Determine the toggle parameter (The "Power Switch" for this feature)
    const effectiveToggleParam = toggleParam || feature?.engineConfig?.toggleParam;

    // Access state
    const autoEnabled = effectiveToggleParam ? !!sliceState?.[effectiveToggleParam] : true;
    const isEnabled = enabled !== undefined ? enabled : autoEnabled;

    // A dark ("off"/"uncompiled") header edge-fades into the divider tone so it
    // blends with the lip above and end-cap below. Enabled headers are already
    // surface-raised (the lip colour), so they default to no fade.
    // Resolve fade mode: falsy → none; 'thin' → 2px top (uncompiled look);
    // otherwise a long top fade (disabled look). Defaults to disabled when off.
    const fadeMode = edgeFade ?? !isEnabled;
    const showEdgeFade = !!fadeMode;
    const isThin = fadeMode === 'thin';
    const EDGE_FADE = 'linear-gradient(to bottom, rgb(var(--surface-raised)), transparent)';
    // Uncompiled ('thin') top: mostly the dark section tone with a lip blend
    // that decays from the top edge — ~70% surface-raised at the top falling to
    // ~0 by ~20px (roughly exponential), so it reads dark like the biased bottom
    // lip but softer than a hard edge. Disabled ('full') keeps its long ¾ fade.
    const topFadeClass = isThin ? 'h-5' : 'h-3/4';
    const topFade = isThin
        ? 'linear-gradient(to bottom,'
            + ' rgb(var(--surface-raised) / 0.70),'
            + ' rgb(var(--surface-raised) / 0.42) 2px,'
            + ' rgb(var(--surface-raised) / 0.25) 4px,'
            + ' rgb(var(--surface-raised) / 0.15) 6px,'
            + ' rgb(var(--surface-raised) / 0.09) 8px,'
            + ' rgb(var(--surface-raised) / 0.03) 12px,'
            + ' rgb(var(--surface-raised) / 0) 20px)'
        : EDGE_FADE;

    // Hover highlight for clickable headers (disabled → click to enable,
    // collapsible → click to open). A soft top-weighted gradient that fades out
    // before the bottom edge, rather than a flat full-height fill, so it doesn't
    // hard-seam against the bottom fade / end-cap.
    const isHeaderClickable = collapsible || !isEnabled;
    // Ramp in from transparent over the top 10px (no hard top seam), peak, then
    // fade out toward the bottom.
    const HOVER_FADE = 'linear-gradient(to bottom, transparent, rgb(var(--line) / 0.09) 10px, transparent)';

    const handleToggle = (val: boolean) => {
        if (onToggle) { onToggle(val); return; }

        if (setter && effectiveToggleParam) {
            // CompileScheduler owns the spinner; toggling a compile-mode
            // feature triggers a config change and the scheduler emits
            // is_compiling with the correct label on the rebuild boundary.
            setter({ [effectiveToggleParam]: val });
        }
    };

    return (
        <div className="relative isolate flex flex-col">
            {/* Edge fades: blend a dark header into the divider tone
                (surface-raised) so it doesn't hard-seam with the lip above /
                end-cap below. A long top fade (~¾ height) melts the section into
                the lip; a short bottom fade just catches the end-cap. They sit
                BEHIND the content (z-0 vs z-10) so the header label stays crisp
                and only the translucent/transparent header background blends. */}
            {showEdgeFade && (
                <div className={`pointer-events-none absolute inset-x-0 top-0 ${topFadeClass} z-0`} style={{ background: topFade }} />
            )}
            {showEdgeFade && bottomFade && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 z-0 rotate-180" style={{ background: EDGE_FADE }} />
            )}
            {/* Header — clicking toggles collapse (collapsible) or enables the feature (when off) */}
            <div
                className={`group relative z-10 flex items-center justify-between px-3 py-1 ${isEnabled ? 'bg-surface-raised' : 'bg-surface-raised/50 cursor-pointer'} ${collapsible ? 'cursor-pointer' : ''} ${headerClassName}`}
                onClick={collapsible ? toggleOpen : (!isEnabled ? () => handleToggle(true) : undefined)}
            >
                {/* Hover highlight — soft gradient, faded before the bottom and
                    lifted a few px; behind the content (label/buttons are
                    positioned) so it never dims the text. */}
                {isHeaderClickable && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: HOVER_FADE }} />
                )}
                <div className="relative flex items-center gap-1.5">
                    {collapsible && (
                        <span className="text-[8px] text-fg-dim w-2 group-hover:text-fg-tertiary transition-colors">{isOpen ? '▾' : '▸'}</span>
                    )}
                    <span className={`text-[10px] font-bold transition-colors ${isEnabled ? 'text-fg-tertiary' : 'text-fg-faint group-hover:text-fg-secondary'}`}>
                        {label}
                    </span>
                    {!isEnabled && <span className="text-[8px] text-fg-faint group-hover:text-fg-dim transition-colors">off</span>}
                    {statusContent}
                </div>

                <div className="relative flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {rightContent}
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="p-1 text-fg-dim hover:text-accent-400 transition-colors"
                            title="Reset this feature's parameters to defaults"
                        >
                            <ResetIcon />
                        </button>
                    )}
                    {onUnload && (
                        <button
                            onClick={onUnload}
                            className="p-1 text-fg-dim hover:text-warn transition-colors"
                            title="Unload — recompile shader without this feature"
                        >
                            <UnloadIcon />
                        </button>
                    )}
                    {!hideToggle && (
                        <div className="w-10">
                            <ToggleSwitch
                                value={isEnabled}
                                onChange={handleToggle}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content. Renders when the toggle is on OR the caller has
                forced the body open (compile-pending case); collapsible
                sections additionally gate on their local open state. */}
            {(isEnabled || forceBodyOpen) && (!collapsible || isOpen) && (
                <div className="relative z-10">
                    {description && (
                        <p className="px-3 py-1.5 text-[9px] text-fg-faint leading-tight bg-line/[0.06] hover:text-fg-tertiary transition-colors cursor-default">{description}</p>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
};
