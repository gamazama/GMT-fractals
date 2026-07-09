
import React from 'react';
import { text as themeText, surface } from '../data/theme';

type SectionLabelVariant = 'primary' | 'secondary' | 'tiny';

interface SectionLabelProps {
    children: React.ReactNode;
    variant?: SectionLabelVariant;
    className?: string;
    color?: string; // Override text color, e.g. 'text-accent-400'
}

const variantClasses: Record<SectionLabelVariant, string> = {
    primary:   `text-[10px] font-bold ${themeText.label}`,
    secondary: `text-[9px] font-bold ${themeText.dimLabel}`,
    tiny:      `text-[8px] ${themeText.faint}`,
};

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, variant = 'primary', className = '', color }) => {
    const base = variantClasses[variant];
    const colorClass = color || '';
    return <span className={`${base} ${colorClass} select-none ${className}`}>{children}</span>;
};

/** Flat fill matching the bracket rail (surface-raised base + line/0.12 rail
 *  fill + line/0.06 wrapper tint). Used by the nested divider so a sub-group's
 *  closing strip reads as the same colour as the bracket rail beside it. */
const RAIL_TONE = 'linear-gradient(rgb(var(--line) / 0.06), rgb(var(--line) / 0.06)), linear-gradient(rgb(var(--line) / 0.12), rgb(var(--line) / 0.12)), rgb(var(--surface-raised))';

/**
 * Horizontal section divider.
 *
 * - **Top-level** (default): closes a panel section like the bottom edge of a
 *   card — a grey `surface-raised` end-cap with rounded bottom corners over a
 *   darker recessed gap carrying a top-down drop-shadow. The corners read
 *   because the gap tone (`surface`) is darker than the cap.
 * - **Nested** (`nested`): a single flat strip in the bracket-rail tone, so a
 *   sub-group's closing divider blends into the bracket it sits inside instead
 *   of stamping a card edge mid-bracket.
 *
 * `capFrom` (a CSS colour) makes the end-cap a gradient from that tone into
 * `surface-raised`, so a dark section (a disabled/off header) melts into its own
 * bottom lip instead of hard-seaming against a solid `surface-raised` cap. The
 * renderer that knows the section's tone (CompileSection) passes it; omit for
 * the default solid cap (sections that are already `surface-raised`).
 */
export const SectionDivider: React.FC<{ nested?: boolean; capFrom?: string }> = ({ nested = false, capFrom }) => {
    if (nested) {
        return (
            <div className="h-3.5 relative" style={{ background: RAIL_TONE }}>
                {/* Top-down darkening shadow, masked to fade in over the first
                 *  10px from the left so it eases out of the bracket corner. */}
                <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 10px)',
                    maskImage: 'linear-gradient(to right, transparent, black 10px)',
                }} />
            </div>
        );
    }
    return (
        <div className="relative bg-surface">
            {/* End-cap: rounded-bottom bar closing the section above. Solid
             *  surface-raised by default; when `capFrom` is set it holds the
             *  section's own tone for the top ~60% then fades quickly into
             *  surface-raised — biased low so a dark header stays solid deeper
             *  into its lip before lightening, rather than a linear blend. */}
            <div
                className={`h-2 rounded-b-lg ${capFrom ? '' : surface.divider}`}
                style={capFrom ? { background: `linear-gradient(to bottom, ${capFrom}, ${capFrom} 60%, rgb(var(--surface-raised)))` } : undefined}
            />
            {/* Recessed gap + drop-shadow the cap's rounded corners sit against. */}
            <div className="h-2 relative">
                <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                }} />
            </div>
            {/* Opening lip of the *next* section — rounded top, flat bottom,
             *  mirroring the end-cap. Emitted together with the cap so a lip
             *  appears only where a real section actually closed: a leaf tail
             *  (e.g. Rim Light toggled off) emits no cap, hence no stray lip.
             *  The panel's final divider has its lip hidden via CSS
             *  (`.panel-sections > :last-child .section-lip`) — nothing to open. */}
            <div className={`section-lip h-1.5 ${surface.divider} rounded-t-lg`} />
        </div>
    );
};

export default SectionLabel;
