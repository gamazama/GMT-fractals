import React from 'react';

/**
 * ErrorNote — the shared red error/validation box chrome.
 *
 * Bakes ONLY the invariant treatment that repeated verbatim across the gallery,
 * auth, and feedback surfaces: `rounded border border-danger/30 bg-danger/10`.
 * Everything that legitimately varied per site (padding, text size, text colour
 * 300-vs-400, margins, single-line note vs multi-child container) stays the
 * caller's via `className`, so each call site renders byte-identically to its
 * former inline `<div>` — this is a dedup of the colour language, not a restyle.
 *
 * @invariant Engine-core (components/) — generic visual token, no app/store imports.
 */
export const ErrorNote: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`rounded border border-danger/30 bg-danger/10 ${className}`.trim()}>{children}</div>
);

export default ErrorNote;
