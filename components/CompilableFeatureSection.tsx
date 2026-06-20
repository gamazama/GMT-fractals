
import React, { useState, useCallback, useMemo } from 'react';
import { featureRegistry, CompilablePanelConfig } from '../engine/FeatureSystem';
import { useEngineStore } from '../store/engineStore';
import { FractalEvents } from '../engine/FractalEvents';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import { registry as formulaRegistry } from '../engine-gmt/engine/FractalRegistry';
import { evaluateCompat } from '../engine-gmt/engine/compat';
import { applyPartialPreset } from '../engine-gmt/utils/applyPartialPreset';

/** Translate a raw reason string from evaluateCompat into a short user-facing
 *  fragment. Keep the original token for debugging via tooltip text after the
 *  human prefix. */
function humanizeReason(raw: string): string {
    if (raw.includes('shape:self-contained')) return 'This formula owns its full iteration loop.';
    if (raw.includes('shape:modular')) return 'Modular graph formulas use the node editor instead.';
    if (raw.startsWith('rejected by primary capability')) return 'Not compatible with the current primary formula.';
    if (raw.startsWith('rejected by secondary capability')) return 'Not compatible with the current interlace secondary.';
    if (raw.startsWith('requires')) return raw.replace('requires', 'Needs');
    return raw;
}
// Note: `is_compiling` is emitted by the CompileScheduler at the actual
// rebuild boundary — not by UI components. UI handlers here apply param
// changes via the feature setter; the scheduler picks up the config delta
// and emits the spinner state with the correct strategy-aware label.
import { FeatureSection } from './FeatureSection';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusDot } from './StatusDot';
import { SectionLabel, SectionDivider } from './SectionLabel';
import { AlertIcon } from './Icons';
import { warn, compileBar as compileBarClass } from '../data/theme';

interface CompilableFeatureSectionProps extends Partial<CompilablePanelConfig> {
    /** Feature ID in the DDFS registry. Reads panelConfig if available. */
    featureId: string;
}

/**
 * Compilable feature section. One of three DDFS section patterns.
 *
 * Two sub-modes, picked by the presence of `runtimeToggleParam`:
 *
 *  A. **With runtime toggle** (Hybrid Box, Interlace, Volumetric, Local
 *     Rotation, area shadows): the header toggle controls the runtime
 *     param instantly (no rebuild). A separate compile gate (`compileParam`)
 *     controls whether the feature is compiled into the shader. When the
 *     section is on but not compiled, the body shows the CompileBar; when
 *     compiled, the body shows runtime params.
 *
 *  B. **Compile-only (no runtime toggle)** (Burning Mode): the header
 *     toggle buffers a pending compile change. The body shows a CompileBar
 *     asking the user to confirm — clicking Compile actually flips
 *     `compileParam` and triggers a rebuild. Re-toggling buffers the
 *     reverse change. Matches the "must recompile to switch off" contract.
 */
export const CompilableFeatureSection: React.FC<CompilableFeatureSectionProps> = (props) => {
    const { featureId } = props;
    const feature = featureRegistry.get(featureId);
    const pc = feature?.panelConfig;

    // Resolve config. Two modes:
    //
    //  - **Override mode** (caller passed `compileParam`): the caller is
    //    declaring a distinct compilable section — e.g. Geometry's Burning
    //    Mode entry. `props` is authoritative; the feature's own
    //    `panelConfig` MUST NOT bleed in or the section would silently
    //    mutate the wrong params (e.g. a hybrid runtimeToggleParam
    //    pulled into Burning Mode).
    //
    //  - **Default mode** (no compileParam in props): pick up the
    //    feature's `panelConfig`, but allow the caller to override
    //    individual fields. Critical: PanelRouter forwards every
    //    PanelItem field including the ones that are `undefined`,
    //    which would clobber `panelConfig` if spread directly. Strip
    //    undefineds so only explicit overrides win. Hit this when
    //    Volumetric's `compileParam` was being silently nulled —
    //    `ptVolumetric` then leaked into the runtime body as a
    //    "boolean inside a boolean".
    const useOverride = props.compileParam !== undefined;
    const definedOverrides = useMemo(() => {
        const out: Record<string, any> = {};
        for (const k of Object.keys(props)) {
            const v = (props as any)[k];
            if (v !== undefined) out[k] = v;
        }
        return out;
    }, [props]);
    const src = useOverride ? props : { ...pc, ...definedOverrides };
    const compileParam = src.compileParam ?? '';
    const runtimeToggleParam = src.runtimeToggleParam;
    const compileSettingsParams = src.compileSettingsParams;
    const runtimeGroup = src.runtimeGroup;
    const runtimeExcludeParams = src.runtimeExcludeParams;
    const label = src.label ?? feature?.name ?? featureId;
    const helpId = src.helpId;

    // Granular per-feature subscription — see FeatureSection.tsx for
    // the rationale. Avoids re-rendering every CompilableFeatureSection
    // on every unrelated store update.
    const sliceState = useEngineStore((s) => (s as any)[featureId]);
    const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
    const setter = useEngineStore((s) => (s as any)[setterName]) as ((updates: Record<string, any>) => void) | undefined;

    const isCompiled = !!sliceState?.[compileParam];

    // Buffered compile-toggle for the compile-only pattern (no runtime
    // toggle). null = no pending change; boolean = user has clicked the
    // header toggle and the section is waiting for the Compile button.
    const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
    const hasPendingToggle = pendingToggle !== null;

    // Local pending state for compile-settings param changes.
    const [localPending, setLocalPending] = useState<Record<string, any>>({});
    const hasPendingChanges = Object.keys(localPending).length > 0;

    // Header toggle reflects the user-visible on/off:
    //  - A buffered pending toggle (intent before compile) always wins.
    //  - Otherwise after compile, follows the runtime toggle uniform (instant).
    //  - Otherwise (no runtime toggle, no pending), follows the compile gate.
    // The user always sees their last selected state, whether or not the
    // body is currently expanded.
    const isOn = hasPendingToggle
        ? !!pendingToggle
        : runtimeToggleParam
            ? !!sliceState?.[runtimeToggleParam]
            : isCompiled;

    // Pending compile work: user has buffered a compile-toggle change,
    // edited a compile-setting, or toggled on something that isn't compiled
    // yet (the `(isOn && !isCompiled)` term covers loaded-scene mismatches
    // where runtimeToggleParam is true but compileParam is still false).
    const needsCompile = (isOn && !isCompiled) || hasPendingChanges || hasPendingToggle;

    // Merged state for compile settings preview (forces conditions to pass
    // so the compile-settings sub-section can render even when compileParam
    // is currently false).
    const mergedState = useMemo(() => {
        if (!compileSettingsParams?.length) return sliceState;
        const merged: Record<string, any> = { ...sliceState, ...localPending };
        merged[compileParam] = true;
        if (runtimeToggleParam) merged[runtimeToggleParam] = true;
        return merged;
    }, [sliceState, localPending, compileParam, runtimeToggleParam, compileSettingsParams]);

    const handleToggle = useCallback((val: boolean) => {
        if (!setter) return;
        if (isCompiled && runtimeToggleParam) {
            // Already compiled + has a runtime toggle: flip the runtime
            // uniform instantly. No rebuild, no question — this is the
            // hot path for features like Hybrid Box where the user toggles
            // an existing compiled effect on and off.
            setter({ [runtimeToggleParam]: val });
        } else {
            // Not yet compiled (or compile-only feature like Burning):
            // buffer the user's intent and show CompileBar so they
            // explicitly confirm the rebuild. Avoids the "compiled
            // without asking" surprise where a runtime toggle wrote a
            // uniform that did nothing because the shader hadn't been
            // built yet. Clears pending if the toggle returns to its
            // live compile state.
            if (val === isCompiled) setPendingToggle(null);
            else setPendingToggle(val);
        }
    }, [setter, runtimeToggleParam, isCompiled]);

    // Handle compile-time param changes (stored locally until compile)
    const handleCompileParamChange = useCallback((key: string, value: any) => {
        setLocalPending(prev => {
            const next = { ...prev, [key]: value };
            if (sliceState?.[key] === value) delete next[key];
            return next;
        });
    }, [sliceState]);

    // Runtime-body override: if the changed param is compile-flagged,
    // buffer it like a compile-settings change (so this section owns
    // it instead of AutoFeaturePanel's fallback Engine-route firing);
    // otherwise commit immediately through the feature setter.
    const handleRuntimeOrCompileChange = useCallback((key: string, value: any) => {
        const cfg = feature?.params[key];
        if (cfg?.onUpdate === 'compile') {
            handleCompileParamChange(key, value);
        } else if (setter) {
            setter({ [key]: value });
        }
    }, [feature, handleCompileParamChange, setter]);

    // Apply pending changes + ensure compiled. When the user buffered an
    // on/off intent via the header toggle, flip BOTH the compile gate and
    // (if present) the runtime toggle in the same setter call — so a
    // first-time enable lands as `{compileParam: true, runtimeToggleParam:
    // true}` atomically, avoiding the in-between state where the uniform
    // says on but the shader was never built. CompileScheduler picks up
    // the resulting config delta and emits is_compiling.
    /**
     * @invariant Atomic compile flip: writes `{compileParam: true,
     *   runtimeToggleParam: true}` in ONE setter call so first-time enable
     *   cannot land in the "uniform on, shader unbuilt" intermediate
     *   state. `handleUnload` mirrors this for the off-direction.
     */
    const handleCompile = useCallback(() => {
        if (!setter) return;
        const updates: Record<string, any> = { ...localPending };
        if (hasPendingToggle) {
            updates[compileParam] = pendingToggle;
            if (runtimeToggleParam) updates[runtimeToggleParam] = pendingToggle;
        } else if (!isCompiled) {
            updates[compileParam] = true;
            if (runtimeToggleParam) updates[runtimeToggleParam] = true;
        }
        setter(updates);
        setLocalPending({});
        setPendingToggle(null);
    }, [setter, localPending, isCompiled, compileParam, runtimeToggleParam, hasPendingToggle, pendingToggle]);

    // Unload — clear the compile gate (and runtime toggle if present) so
    // the feature drops out of the shader entirely on the next compile.
    // Distinct from the runtime toggle, which only flips a uniform.
    // Direct action — no CompileBar buffering, because the icon click IS
    // the explicit confirmation.
    const handleUnload = useCallback(() => {
        if (!setter) return;
        const updates: Record<string, any> = { [compileParam]: false };
        if (runtimeToggleParam) updates[runtimeToggleParam] = false;
        setter(updates);
        setLocalPending({});
        setPendingToggle(null);
    }, [setter, compileParam, runtimeToggleParam]);

    // Open the Shader Compiler panel and queue compile flag + pending settings
    const handleOpenEngine = useCallback(() => {
        useEngineStore.getState().movePanel('ShaderCompiler', 'left');
        setTimeout(() => {
            if (!isCompiled) {
                FractalEvents.emit('engine_queue', { featureId, param: compileParam, value: true });
            }
            for (const [param, value] of Object.entries(localPending)) {
                FractalEvents.emit('engine_queue', { featureId, param, value });
            }
            setLocalPending({});
        }, 50);
    }, [featureId, compileParam, isCompiled, localPending]);

    const statusDots = (
        <>
            {isOn && isCompiled && !hasPendingChanges && !hasPendingToggle && <StatusDot status="active" />}
            {needsCompile && <StatusDot status="pending" />}
        </>
    );

    // Reset this feature's params to DDFS-declared defaults. Single-step undo
    // covers any mistake; no confirm dialog. Surfaced in Advanced mode only
    // for now — broader rollout once UX is settled.
    // See plans/per-feature-reset-feasibility.md.
    const advancedMode = useEngineStore(s => (s as any).advancedMode);
    const handleReset = useCallback(() => {
        applyPartialPreset({ source: {}, featureIds: [featureId] });
    }, [featureId]);

    // Capability protocol: gray + disable this section when the current formula
    // pairing makes the section incompatible. Section-level `requires` from the
    // resolved config wins over the feature's own; falls back to feature-level
    // if absent. Same schema either way. Preserves underlying state (not
    // mutated) so switching back to a compatible formula re-enables exactly
    // as it was. See dev/docs/gmt/35_Capability_Protocol.md.
    const primaryFormulaId = useEngineStore((s: any) => s.formula);
    const interlaceCompiled = useEngineStore((s: any) => s.interlace?.interlaceCompiled);
    const interlaceFormulaId = useEngineStore((s: any) => s.interlace?.interlaceFormula);
    const sectionRequires = src.requires;
    const compatReport = useMemo(() => {
        if (!primaryFormulaId) return undefined;
        const primary = formulaRegistry.get(primaryFormulaId);
        if (!primary) return undefined;
        const secondary = interlaceCompiled && interlaceFormulaId
            ? formulaRegistry.get(interlaceFormulaId)
            : undefined;
        // Section-level requires (from CompilablePanelConfig) wins over the
        // feature's. Temporarily patch the registered feature def so the pure
        // reducer reads our section's rules instead. Cleanest is a single-
        // feature reducer; for now this localised mutation+restore is OK
        // because evaluateCompat is sync (no await in between).
        if (sectionRequires && feature) {
            const original = (feature as any).requires;
            (feature as any).requires = sectionRequires;
            const report = evaluateCompat({ primary, secondary }).find(r => r.featureId === featureId);
            (feature as any).requires = original;
            return report;
        }
        return evaluateCompat({ primary, secondary }).find(r => r.featureId === featureId);
    }, [primaryFormulaId, interlaceCompiled, interlaceFormulaId, featureId, sectionRequires, feature]);
    const isProtocolDisabled = compatReport?.status === 'disabled';
    const primaryName = primaryFormulaId
        ? (formulaRegistry.get(primaryFormulaId)?.name ?? primaryFormulaId)
        : 'current formula';
    const disabledReason = `Not available with ${primaryName}. ${compatReport?.reasons.length ? humanizeReason(compatReport.reasons[0]) : ''}`.trim();

    // Build exclude list for runtime params: hide compile param + runtime
    // toggle + any explicit excludes + the compile-settings params (which
    // are rendered separately in the Compile Settings sub-section).
    const fullExclude = useMemo(() => {
        const exclude = new Set(runtimeExcludeParams ?? []);
        exclude.add(compileParam);
        if (runtimeToggleParam) exclude.add(runtimeToggleParam);
        compileSettingsParams?.forEach(p => exclude.add(p));
        return Array.from(exclude);
    }, [compileParam, runtimeToggleParam, runtimeExcludeParams, compileSettingsParams]);

    const hasCompileSettings = !!(compileSettingsParams && compileSettingsParams.length > 0);

    // Protocol-disabled variant: grayed header + tooltip, body collapsed,
    // toggle is a no-op. Unload button stays FUNCTIONAL when the feature is
    // currently compiled — without this escape hatch, users who compiled a
    // bad pairing (e.g. interlace + MandelTerrain) have no way to disable it.
    // State is preserved (not mutated) so restoring a compatible formula
    // brings the feature back exactly as it was.
    if (isProtocolDisabled) {
        return (
            <div
                data-help-id={helpId}
                title={disabledReason}
                aria-disabled="true"
                className="opacity-50"
            >
                <FeatureSection
                    label={label}
                    featureId={featureId}
                    enabled={false}
                    onToggle={() => {}}
                    forceBodyOpen={false}
                    statusContent={null}
                    headerClassName="bg-transparent"
                    onUnload={isCompiled ? handleUnload : undefined}
                >
                    {/* body intentionally empty — feature is not available */}
                    <></>
                </FeatureSection>
                <SectionDivider />
            </div>
        );
    }

    return (
        <div data-help-id={helpId}>
            <FeatureSection
                label={label}
                featureId={featureId}
                enabled={isOn}
                onToggle={handleToggle}
                forceBodyOpen={needsCompile}
                statusContent={statusDots}
                headerClassName={isCompiled ? '' : 'bg-transparent'}
                onUnload={isCompiled ? handleUnload : undefined}
                onReset={advancedMode ? handleReset : undefined}
            >
                <div className="bg-white/[0.02]">
                    {/* CompileBar — the "compile question". Shown at the top of
                     *  the body whenever there's pending work: not compiled,
                     *  pending compile-settings change, or pending toggle. */}
                    {needsCompile && (
                        <CompileBar
                            isCompiled={isCompiled}
                            pendingToggleOff={hasPendingToggle && pendingToggle === false}
                            onCompile={handleCompile}
                            onOpenEngine={handleOpenEngine}
                        />
                    )}

                    {/* Compile Settings — feature-declared compile-flagged inputs. */}
                    {hasCompileSettings && (
                        <CollapsibleSection label="Compile Settings" defaultOpen={!isCompiled} variant="panel">
                            <AutoFeaturePanel
                                featureId={featureId}
                                whitelistParams={compileSettingsParams}
                                forcedState={mergedState}
                                onChangeOverride={handleCompileParamChange}
                            />
                        </CollapsibleSection>
                    )}

                    {/* Runtime Parameters — only when actually compiled. The
                     *  `liftChildrenOf` prop surfaces params whose parentId
                     *  is the runtime toggle (which is rendered in the section
                     *  header, not the body). When `runtimeGroup` is undefined
                     *  the inner AutoFeaturePanel renders every root param
                     *  not in `excludeParams` — Volumetric uses this. */}
                    {isCompiled && (
                        hasCompileSettings ? (
                            <CollapsibleSection label="Parameters" defaultOpen={true} variant="panel">
                                <AutoFeaturePanel
                                    featureId={featureId}
                                    groupFilter={runtimeGroup}
                                    excludeParams={fullExclude}
                                    onChangeOverride={handleRuntimeOrCompileChange}
                                    liftChildrenOf={runtimeToggleParam}
                                />
                            </CollapsibleSection>
                        ) : (
                            <AutoFeaturePanel
                                featureId={featureId}
                                groupFilter={runtimeGroup}
                                excludeParams={fullExclude}
                                onChangeOverride={handleRuntimeOrCompileChange}
                                liftChildrenOf={runtimeToggleParam}
                            />
                        )
                    )}
                </div>
            </FeatureSection>
            <SectionDivider />
        </div>
    );
};

/** Subtle engine icon — small bolt/zap */
const EngineIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

/** Amber compile/recompile bar with status + button + optional engine link.
 *  Message tracks whether the user has just toggled off a compiled feature
 *  (pendingToggleOff=true) so the prompt reads "Recompile to disable"
 *  instead of the ambiguous "Settings changed". */
const CompileBar: React.FC<{
    isCompiled: boolean;
    pendingToggleOff?: boolean;
    onCompile: () => void;
    onOpenEngine?: () => void;
}> = ({ isCompiled, pendingToggleOff, onCompile, onOpenEngine }) => {
    const message = pendingToggleOff
        ? 'Recompile to disable'
        : !isCompiled
            ? 'Not compiled'
            : 'Settings changed';
    const buttonLabel = !isCompiled ? 'Compile' : 'Recompile';
    return (
        <div className={`flex items-center justify-between px-2 py-1 mt-1 ${compileBarClass} rounded`}>
            <div className={`flex items-center gap-1.5 ${warn.text}`}>
                <AlertIcon />
                <SectionLabel variant="secondary" color={warn.text}>
                    {message}
                </SectionLabel>
            </div>
            <div className="flex items-center gap-1">
                {onOpenEngine && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenEngine(); }}
                        className="p-1 text-gray-500 hover:text-amber-400 transition-colors"
                        title="Open Engine Panel"
                    >
                        <EngineIcon />
                    </button>
                )}
                <button
                    onClick={onCompile}
                    className={`px-3 py-0.5 ${warn.btnBg} ${warn.btnHover} ${warn.btnText} text-[9px] font-bold rounded transition-colors`}
                >
                    {buttonLabel}
                </button>
            </div>
        </div>
    );
};
