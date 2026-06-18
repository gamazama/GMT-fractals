import React from 'react';

export interface TopBarToggleProps {
    /** Functional on/off — selects which colour class set applies. */
    active: boolean;
    onClick: () => void;
    title?: string;
    /** Leading glyph. */
    icon?: React.ReactNode;
    /** Text label — collapses to icon-only below the md breakpoint. */
    label?: React.ReactNode;
    /** Hide the whole button below the mobile breakpoint. */
    desktopOnly?: boolean;
    /** Classes applied when `active` (the accent treatment — colour / bg / border colour). */
    activeClassName: string;
    /** Classes applied when not `active`. */
    inactiveClassName: string;
    /** Extra always-on classes (e.g. `border` to enable a border width both states share). */
    className?: string;
}

/**
 * TopBarToggle — the shared topbar pill-toggle chrome: a fixed
 * `h-7 / text-[12px] / gap-1.5 / px-2 / rounded` button with a leading icon and a
 * label that collapses to icon-only below the md breakpoint. The ACTIVE/INACTIVE
 * colour treatment is the caller's — Favients' accent-on-white vs Fluid's cyan
 * outline genuinely differ — passed as `activeClassName`/`inactiveClassName`;
 * everything structural lives here so hosts stop repeating it.
 *
 * NOT for the smaller `text-[10px]` engine-gmt topbar toggles (PathTracing /
 * RenderRegion) — those are a different size family; folding them would contort
 * the fixed skeleton.
 *
 * @invariant Engine-core (components/) — must not import app/engine-gmt. Apps and
 *   plugins import this and pass their own colour classes in.
 */
export const TopBarToggle: React.FC<TopBarToggleProps> = ({
    active, onClick, title, icon, label, desktopOnly = false,
    activeClassName, inactiveClassName, className = '',
}) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`${desktopOnly ? 'hidden md:flex' : 'flex'} items-center gap-1.5 px-2 h-7 rounded text-[12px] transition-colors ${
            active ? activeClassName : inactiveClassName
        } ${className}`}
    >
        {icon}
        {label != null && <span className="hidden md:inline">{label}</span>}
    </button>
);

export default TopBarToggle;
