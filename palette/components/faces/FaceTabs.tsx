/**
 * FaceTabs — the tab row that opens a gradient's faces (Curves, Adjust, Paint…), shared by the
 * Gradient Explorer's hero (`gradient-explorer/v2/WorkingHero.tsx`) and GMT's Gradient Studio
 * (`palette/components/GradientStudioPanel.tsx`). Moved out of WorkingHero on 2026-09-26, verbatim;
 * both hosts pass it to the editor as `stripAside`, so it sits in the bar's control row.
 *
 * The Explorer's record of the design, as it was written there:
 *
 * the TRAY'S TAB ROW (Phase C, restyled C.13 — owner 2026-09-07 evening): ONE segmented control in
 * the Even / Perceptual / Stops style; the open face's segment is a TAB — it takes the tray's colour
 * and a tongue runs from its bottom to the tray's (borderless) top edge, 8 px below, so the two read
 * as one piece. The corners under the open tab are HARD — the segment's bottom corners and, when it
 * is an end segment, the pill's own outer bottom corner (owner: "the button's corners need hardening
 * when it's under a tab"). No chevrons: the tab says it is open. Click again closes.
 *
 * The `data-gx-*` attributes are the Explorer smokes' handles (`smoke:ge-tray`, `smoke:ge-uiundo`,
 * `smoke:ge-paint` and more) — keep them.
 */

import React from 'react';

export interface FaceTab<F extends string> {
  face: F;
  label: string;
  title: string;
}

export const FaceTabs = <F extends string>({ tabs, open, onOpen, phone = false }: {
  tabs: readonly FaceTab<F>[];
  /** The open face, or anything not in `tabs` (null) when none is. */
  open: F | null;
  /** A tab was clicked — the host decides what a click on the open one does (both close it). */
  onOpen: (face: F) => void;
  phone?: boolean;
}): React.ReactElement | null => {
  if (!tabs.length) return null;
  return (
    <div
      className={`inline-flex rounded-t-lg border border-line/20 ${open === tabs[0].face ? '' : 'rounded-bl-lg'} ${open === tabs[tabs.length - 1].face ? '' : 'rounded-br-lg'}`}
      data-gx-tray-tabs
    >
      {tabs.map((t, i) => {
        const on = open === t.face;
        const first = i === 0;
        const last = i === tabs.length - 1;
        const ends = `${first ? 'rounded-tl-[7px]' : ''} ${first && !on ? 'rounded-bl-[7px]' : ''} ${last ? 'rounded-tr-[7px]' : ''} ${last && !on ? 'rounded-br-[7px]' : ''}`;
        return (
          <button
            key={t.face}
            type="button"
            /* PHONE: 6 px of side padding, not 10. The editor's own row
               holds this pill and the blend / output / menu group, and at
               390 the two came to 338 in a 320 px line — so they WRAPPED,
               and the wrap cost the card 30 px of height. 4 tabs × 4 px put
               them back on one line at 390; 4 × 4 more (L1, 2026-09-24) do
               it at 375 (measured: 243 → 215 px). 360 needs ~12 px more,
               which is the editor row's own padding and gaps to give.
               A FIFTH tab (Paint, 2026-09-24) put the row back over: 222
               + 6 + the 123 px blend · ☰ group is 351 in 335 at 375 (1 px
               over even at 390), and the wrap cost the card 36 px — hero
               249 against smoke:ge-phone's 240. Image's tab now shows only
               with a picture loaded (owner, 2026-09-25), so the row is four
               tabs at 6 px most of the time, and five at 4 px a side — the
               20 px back — only while an image is in; the tabs keep their
               28 px height either way.
               `transition-colors` (J12): the tabs ease like every other
               pressable in the shell instead of snapping. */
            className={`relative h-7 text-[13px] transition-colors ${phone ? (tabs.length > 4 ? 'px-1' : 'px-1.5') : 'px-2.5'} ${ends} ${on ? 'bg-surface-section text-accent-300' : 'text-fg-muted hover:text-fg'}`}
            onClick={() => onOpen(t.face)}
            title={t.title}
            data-gx-tray-tab={t.face}
            data-gx-tab-open={on ? '' : undefined}
          >
            {t.label}
            {on && <span aria-hidden className="absolute -left-px -right-px top-full h-[9px] bg-surface-section border-x border-line/20" data-gx-tab-tongue />}
          </button>
        );
      })}
    </div>
  );
};

export default FaceTabs;
