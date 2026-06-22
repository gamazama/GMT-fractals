import React from 'react';

/**
 * WarningNote — the shared amber warning/caution box chrome. Sibling to
 * {@link ErrorNote} (red); same dedup pattern.
 *
 * Bakes ONLY the invariant treatment that repeated verbatim across the render
 * dialog (and the lighting controls, pending that subsystem's in-flight work):
 * `rounded border border-warn/30 bg-warn/15`. Everything that
 * legitimately varied per site (padding, text size, the text colour
 * amber-400-vs-300, margins, single-line note vs multi-child container) stays
 * the caller's via `className`, so each call site renders byte-identically to
 * its former inline `<div>` — a dedup of the colour language, not a restyle.
 *
 * @invariant Engine-core (components/) — generic visual token, no app/store imports.
 */
export const WarningNote: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`rounded border border-warn/30 bg-warn/15 ${className}`.trim()}>{children}</div>
);

export default WarningNote;
