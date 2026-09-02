/**
 * CompileBar — the amber "there's un-applied work" strip: an alert + status
 * message on the left, a compile/apply button (plus an optional engine-panel
 * shortcut) on the right. The shared home for GMT's compile prompt, used by
 * CompilableFeatureSection (per-feature compile gate) and the Weave editor's
 * Build bar.
 *
 * Message + button text derive from `isCompiled`/`pendingToggleOff` by default
 * (the compile-section wording), or pass explicit `message`/`buttonLabel` for a
 * different verb ("Build to apply" / "Build"). Chrome is the `warn` token set.
 *
 * @see data/theme.ts (warn / compileBar tokens) · ADR-0080
 * @assumption components/ — generic, no app/store imports.
 */
import React from 'react';
import { AlertIcon } from './Icons';
import { SectionLabel } from './SectionLabel';
import { warn, compileBar as compileBarClass } from '../data/theme';

/** Subtle engine icon — small bolt/zap. */
const EngineIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

export interface CompileBarProps {
    onCompile: () => void;
    /** Explicit status text; else derived from isCompiled/pendingToggleOff. */
    message?: string;
    /** Explicit button label; else 'Compile' / 'Recompile'. */
    buttonLabel?: string;
    /** Derivation inputs — used only when message/buttonLabel are omitted. */
    isCompiled?: boolean;
    pendingToggleOff?: boolean;
    /** Optional engine-panel shortcut on the right. */
    onOpenEngine?: () => void;
    /** Disable the compile button (nothing to apply yet, or a build in flight). */
    disabled?: boolean;
    /** Extra container classes (e.g. `mt-1` for the compile-section spacing). */
    className?: string;
}

export const CompileBar: React.FC<CompileBarProps> = ({
    onCompile, message, buttonLabel, isCompiled, pendingToggleOff, onOpenEngine, disabled, className = '',
}) => {
    const msg = message ?? (pendingToggleOff
        ? 'Recompile to disable'
        : !isCompiled ? 'Not compiled' : 'Settings changed');
    const btn = buttonLabel ?? (!isCompiled ? 'Compile' : 'Recompile');
    return (
        <div className={`flex items-center justify-between px-2 py-1 ${compileBarClass} rounded ${className}`}>
            <div className={`flex items-center gap-1.5 ${warn.text}`}>
                <AlertIcon />
                <SectionLabel variant="secondary" color={warn.text}>{msg}</SectionLabel>
            </div>
            <div className="flex items-center gap-1">
                {onOpenEngine && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenEngine(); }}
                        className="p-1 text-fg-dim hover:text-warn transition-colors"
                        title="Open Engine Panel"
                    >
                        <EngineIcon />
                    </button>
                )}
                <button
                    onClick={onCompile}
                    disabled={disabled}
                    className={`px-3 py-0.5 ${warn.btnBg} ${warn.btnHover} ${warn.btnText} text-[9px] font-bold rounded transition-colors disabled:opacity-40`}
                >
                    {btn}
                </button>
            </div>
        </div>
    );
};

export default CompileBar;
