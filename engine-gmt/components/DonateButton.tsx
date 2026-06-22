// DonateButton.tsx — Ko-fi + PayPal donate buttons (GMT-specific URLs).
//
// Shared GMT-brand support content used by every engine app (app-gmt,
// fluid-toy, gradient-explorer) through the engine Help plugin's `support`
// slot — see `engine-gmt/support.ts` for the menu config helper. The hover
// "guy.png" photo reveal + both donate links are intentionally identical
// across surfaces so support looks the same everywhere.
//
// Two placements share the same content:
//   • DonateButton  — modal/panel body (Help-menu "Support GMT" entry)
//   • SupportBadge  — fixed bottom-corner badge (mesh-editor style)
//
// The mesh editor is not an engine app yet, so it keeps its own copy of the
// bottom-corner widget; SupportBadge is the engine-native equivalent for when
// it migrates.
import React from 'react';

const KOFI_URL = 'https://ko-fi.com/gmtfractals';
const PAYPAL_URL = 'https://www.paypal.com/ncp/payment/WHMZWATKN6GEY';

/**
 * The photo that slides up on hover of the enclosing `.group`. Used by both
 * the modal body and the bottom badge so the reveal feels the same in either
 * placement. `reveal` controls which direction the clip grows from.
 */
const GuyReveal: React.FC<{ compact?: boolean; divider?: boolean }> = ({ compact, divider = true }) => {
    const h = compact ? 48 : 64;
    const clipRef = React.useRef<HTMLDivElement>(null);
    const imgRef = React.useRef<HTMLImageElement>(null);

    React.useEffect(() => {
        const clip = clipRef.current;
        const img = imgRef.current;
        const group = clip?.closest('.group');
        if (!clip || !img || !group) return;

        const onEnter = () => {
            img.style.transition = 'none';
            img.style.transform = 'scale(1)';
            img.style.transformOrigin = 'bottom center';
            void clip.offsetHeight;
            clip.style.transition = 'max-height 0.35s ease-out';
            clip.style.maxHeight = '120px';
        };
        const onLeave = () => {
            img.style.transition = 'transform 0.3s ease-in';
            img.style.transform = 'scale(0)';
            img.style.transformOrigin = 'bottom center';
            clip.style.transition = 'max-height 0.3s ease-in';
            clip.style.maxHeight = '0';
        };

        group.addEventListener('mouseenter', onEnter);
        group.addEventListener('mouseleave', onLeave);
        return () => {
            group.removeEventListener('mouseenter', onEnter);
            group.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    return (
        <div className="flex flex-col items-center">
            <div ref={clipRef} className="overflow-hidden" style={{ maxHeight: 0 }}>
                <img
                    ref={imgRef}
                    src="guy.png"
                    alt=""
                    className="pointer-events-none object-contain"
                    style={{ height: h, width: 'auto', transform: 'scale(0)', transformOrigin: 'bottom center' }}
                />
            </div>
            {divider && <div className="w-full h-px bg-line/10 mb-1.5" />}
        </div>
    );
};

/** Stacked Ko-fi + PayPal buttons — the two donate links, shared by every
 *  placement so both options always appear together. */
const DonateLinks: React.FC<{ compact?: boolean }> = ({ compact }) => (
    <div className="flex flex-col gap-2 w-full">
        <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#13C3FF] hover:bg-[#00b0f0] text-fg font-bold transition-colors ${
                compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
            }`}
        >
            <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="" className="h-4 w-auto" />
            Support on Ko-fi
        </a>
        <a
            href={PAYPAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#0070ba] hover:bg-[#005ea6] text-fg font-bold transition-colors ${
                compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
            }`}
        >
            <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="" className="h-4 w-auto" />
            Support via PayPal
        </a>
    </div>
);

/**
 * Help-menu "Support GMT" modal body: just the two donate links. The photo
 * reveal lives on the menu *item* (see SupportReveal + gmtSupportConfig), not
 * here — hovering the menu entry pops the photo, clicking opens this modal.
 */
export const DonateButton: React.FC = () => (
    <div className="flex flex-col items-stretch">
        <DonateLinks />
    </div>
);

/**
 * The guy.png hover-reveal on its own — wired into the Help plugin's support
 * menu item via `gmtSupportConfig().hoverReveal`. Renders the photo that
 * slides up when the enclosing `.group` (the menu item) is hovered.
 */
export const SupportReveal: React.FC = () => <GuyReveal compact divider={false} />;

/**
 * Fixed bottom-corner support badge — the mesh-editor placement, engine-native.
 * Hovering the badge reveals the photo above the donate links. Render this once
 * near an app root (it positions itself fixed). Not wired into any app by
 * default; apps that want the persistent badge mount it directly.
 */
export const SupportBadge: React.FC<{ corner?: 'br' | 'bl'; label?: string }> = ({
    corner = 'br',
    label = 'Support GMT',
}) => (
    <div
        className={`group fixed bottom-5 z-50 inline-flex flex-col items-stretch ${
            corner === 'br' ? 'right-5' : 'left-5'
        }`}
    >
        <GuyReveal compact />
        <DonateLinks compact />
        <div className="mt-1 text-center text-[9px] font-bold uppercase tracking-wide text-fg/40">
            {label}
        </div>
    </div>
);
