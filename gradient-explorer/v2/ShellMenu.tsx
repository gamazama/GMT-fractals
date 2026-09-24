/**
 * ShellMenu — the engine's registered menus, opened from the v2 top bar's own buttons, and the
 * Feedback form's floating home (parity checklist S4; owner, 2026-09-13: "Yes we need them
 * [Help, Support, Feedback in v2]. Only caveat is that on mobile the topbar is already
 * crowded, so mobile will have to get one general purpose menu").
 *
 * WHY NOT A MENU OF OUR OWN. The Help menu is `installHelp`'s (engine/plugins/Help.tsx) and the
 * shell has no TopBarHost to render its anchor, so this opens the SAME registered menu from a
 * button the shell owns: `useMenuItems` + `MenuItemList` are the engine's seam for exactly that
 * (grep "Hosting a menu WITHOUT a TopBarHost" in engine/plugins/Menu.tsx). The rows — What's
 * New's NEW highlight, the About and Support rows with their bodies, Send Feedback — are the engine's
 * renderer, not copies; only the surface (`Floating`, V1) is the shell's. A host-local list of
 * copied items is what plans/pre-release-ui-pass.md §1's correction rejected.
 *
 * `prepend` lets a host put its OWN items first, which is how the phone's one menu is composed:
 * the shell's Settings (and Back to GMT when shown) above the Help menu's items, one list.
 *
 * Surfaces: the menu is an `AnchoredMenu` at the `popover` tier (portalled; ADR-0082), the
 * Feedback window a `<Layer tier="tool">` — the tier the Help browser uses, above the popover
 * the menu was in and below the Support / Settings modals. Neither closes on a backdrop click
 * (there is no backdrop): the form holds typing.
 *
 * @see docs/adr/0114-the-unified-shell-visual-language.md (Floating, icon buttons)
 * @see docs/adr/0115-the-shell-on-a-phone.md (the sheet; caps measured from the room below)
 */

import React, { useState } from 'react';
import { AnchoredMenu, Layer, z } from '../../components/ui';
import { useMenuItems, MenuItemList, type MenuItem } from '../../engine/plugins/Menu';
import { FeedbackPanel, useFeedbackOpen, closeFeedback, FEEDBACK_NO_CAPTURE_ATTR } from '../../engine-gmt/feedback';
import { Floating } from './ui/Floating';
import { Icon } from './ui/Icon';
import { useIsPhone } from './useIsPhone';

interface ShellMenuButtonProps {
  /** A menu registered with `menu.register` (e.g. installHelp's 'help'). */
  menuId: string;
  /** The glyph (components/Icons, 12 px). */
  icon: React.ReactNode;
  /** Tooltip + accessible name. Defaults to the registered menu's own title. */
  title?: string;
  /** The host's own rows, rendered above the registered menu's items. */
  prepend?: MenuItem[];
  /** The button's classes, when the host's bar has a box of its own (the GX top bar's 32 px
   *  `tb`, C04 / 8d). Default: a 24 px `icon-btn` box with the glyph pinned at 12 px. */
  className?: string;
}

/** Menu width in px — held here, not in a class, because the anchor is its right edge. */
const MENU_W = { desktop: 240, phone: 264 };

export const ShellMenuButton: React.FC<ShellMenuButtonProps> = ({ menuId, icon, title, prepend, className }) => {
  const phone = useIsPhone();
  const { def, items } = useMenuItems(menuId);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const close = () => setAnchor(null);
  const width = phone ? MENU_W.phone : MENU_W.desktop;
  const label = title ?? def?.title ?? menuId;
  const all = prepend?.length ? [...prepend, ...items] : items;
  // The registered menu's notification dot (`menu.setBadge` — GX's What's New), drawn the way
  // the engine's topbar anchor draws it: a small accent dot, ringed so it reads on the bar.
  const badge = !!def?.badge?.();

  return (
    <>
      <span className="relative inline-flex">
      <button
        type="button"
        // Default: `icon-btn` + a 12 px glyph, the old gear's 24 px box; `[&>svg]` pins a glyph
        // drawn at another size to it. The GX top bar passes its own 32 px box on both desk and
        // phone since 2026-09-24 (C04, 8d), so the default only serves a host without one.
        className={className ?? 'icon-btn [&>svg]:w-3 [&>svg]:h-3'}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        data-gx-menu-trigger={menuId}
        onClick={(e) => {
          if (anchor) return close();
          const r = e.currentTarget.getBoundingClientRect();
          // right-aligned under the button; AnchoredMenu clamps it onto the screen
          setAnchor({ x: r.right - width, y: r.bottom + 6 });
        }}
      >
        {icon}
      </button>
      {badge && (
        <span
          aria-hidden="true"
          data-gx-menu-badge={menuId}
          className="pointer-events-none absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent-400 ring-2 ring-surface-dock"
        />
      )}
      </span>
      {anchor && (
        <AnchoredMenu
          anchor={anchor}
          onClose={close}
          z={z('popover')}
          // the trigger toggles: without this a click on it is an outside press (close)
          // followed by its own click (open again)
          ignore={`[data-gx-menu-trigger="${menuId}"]`}
        >
          <Floating
            // PHONE: a finger wants a taller row than the engine's pointer-sized 28 px. Only
            // the plain rows (direct children) grow; a custom row keeps its own layout.
            className={`p-1 overflow-y-auto ${phone ? '[&>button]:min-h-10' : ''}`}
            // About expands INSIDE the menu, so the menu can outgrow the screen after it has
            // been placed (AnchoredMenu measures once). Capped from the room below it and
            // scrolled — ADR-0115 rule 4, never a vh.
            style={{ width, maxHeight: Math.max(160, window.innerHeight - anchor.y - 8) }}
            data-gx-menu={menuId}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItemList items={all} close={close} />
          </Floating>
        </AnchoredMenu>
      )}
    </>
  );
};

/** Top of the desktop window: under the 48 px bar, with the bar's own 8 px of air. */
const WINDOW_TOP = 56;

/**
 * The Feedback form in the shell's floating surface. Open state is the engine's
 * (`openFeedback` / `closeFeedback`, the 'Feedback' panel entry main.tsx applies) — this only
 * decides where it draws. Desktop: a 400 px window under the top bar's right end, where the
 * menu that opened it was. Phone: a full-screen sheet inside the safe area, like Export's.
 */
export const FeedbackWindow: React.FC = () => {
  const open = useFeedbackOpen();
  const phone = useIsPhone();
  if (!open) return null;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  return (
    <Layer
      tier="tool"
      className="flex flex-col"
      // left out of the feedback screenshot, which is of the app BEHIND this window
      {...{ [FEEDBACK_NO_CAPTURE_ATTR]: '' }}
      style={
        phone
          ? { left: 0, right: 0, top: 'env(safe-area-inset-top)', bottom: 'env(safe-area-inset-bottom)' }
          : { top: WINDOW_TOP, right: 16, width: 400, maxHeight: vh - WINDOW_TOP - 16 }
      }
    >
      <Floating
        // `!rounded-none`: Floating's own `rounded-xl` sits later in the STYLESHEET, and that,
        // not the order in the class string, decides — measured 2026-09-13: without the `!` the
        // sheet kept 12 px corners at 390 px (`border-x-0` wins on its own)
        className={`min-h-0 flex flex-col ${phone ? 'flex-1 !rounded-none border-x-0' : ''}`}
        data-gx-feedback
      >
        <div className="shrink-0 flex items-center px-4 pt-3">
          <b className="text-[13px] text-fg">Send Feedback</b>
          <button className="ml-auto text-fg-muted hover:text-fg" onClick={closeFeedback} title="Close" aria-label="Close feedback">
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <FeedbackPanel />
        </div>
      </Floating>
    </Layer>
  );
};
