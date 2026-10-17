/**
 * deep-zoom/components/LocationText.tsx - a place as text, a scene as a link, the list as a file:
 * the foot of the Places tab, three buttons (five until 2026-10-17, STREAMLINE.md stage 4).
 *
 *   Paste link or place  reads the clipboard: a link Copy link wrote (its camera and formula, not
 *                        its look) or a place as text, and jumps to it (one undo step; a text it
 *                        cannot read gets a toast that says why). A text that holds SEVERAL places
 *                        is added to My places instead.
 *   Copy link            this page's address with the scene in it.
 *   File...              a small menu: Export (every saved place as one JSON file, thumbnails left
 *                        out), Import (such a file's places added to the list, the ones already
 *                        there skipped - a file dropped on the app, or picked in File > Open scene,
 *                        does the same: `deep-zoom/claims.ts`), Copy as text (the place on screen as
 *                        JSON, what Paste reads back).
 * The work is in `deep-zoom/share.ts` and `deep-zoom/claims.ts`. The menu is the engine's
 * AnchoredMenu with the engine's own menu rows (`MenuItemList`), so it looks like the top bar's.
 *
 * Registered as `dz-location-text` in main.tsx; panels.ts places it at the foot of Places.
 *
 * THE TAB ENDS WITH ROOM FOR THE TIMELINE'S TOGGLE, as the Route tab does and for the same reason
 * (read the header of `components/RoutePanel.tsx`, THE TAB ENDS WITH ROOM ...): the engine's round
 * button that opens the timeline lies over the bottom left corner of the left dock while the
 * timeline is closed, and with a list longer than the dock these buttons ended under it. So the
 * tab can be scrolled 48 px further (`data-dz-locations-room`): an absolute box 56 px high under
 * this widget, which is the tab's last - OUT OF FLOW, so the dock's `ScrollSpaceReserver` does not
 * count it and keeps no gap when it goes, and HIDDEN BY CSS ALONE while the timeline is in the page
 * (`:has` on the timeline's `data-help-id="ui.timeline"`; the toggle is there exactly when the
 * timeline is not). It is this widget's because this widget is the tab's foot: put another item
 * under it in panels.ts and the room moves with that item.
 *
 * PITFALL: the file input is this component's own, hidden, and reset after every pick, so picking
 * the same file twice still imports (the second time everything in it is "already there"). It stays
 * mounted while the menu closes: the menu's Import row only clicks it.
 *
 * @assumption With My places long and the timeline closed, the last button ends clear of the
 *   toggle when the tab is scrolled to its end, and with the timeline open the tab ends where its
 *   buttons end - measured once, 2026-10-12, in the app at 1280 x 800 with 14 saved places and the
 *   two rows of buttons this foot had then (debug/scratch/shell-leftovers/locations.mts,
 *   git-ignored; with the room taken out its "the foot is clear of the toggle" line was red). No
 *   standing guard looks at it.
 */
import React, { useRef, useState } from 'react';
import { copyLocation, copyShareLink, exportAllLocations, pasteLocation } from '../share';
import { importLocationFiles } from '../claims';
import { showToast } from '../../engine/store/toastStore';
import { AnchoredMenu } from '../../components/ui/AnchoredMenu';
import { MenuItemList } from '../../engine/plugins/Menu';
import type { MenuItem } from '../../engine/plugins/Menu';

const button = 'flex-1 h-6 px-1 rounded border border-line/20 text-[9px] font-semibold text-fg-secondary hover:text-fg hover:border-line/40';

/** The file picked with "Import": its places go to My places; a file that holds none is said so. */
async function importPicked(file: File): Promise<void> {
    const left = await importLocationFiles([file]);
    if (left.length > 0) showToast(`"${file.name}" holds no places`, 'warning', 5000);
}

export const LocationText: React.FC = () => {
    const input = useRef<HTMLInputElement>(null);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const fileItems: MenuItem[] = [
        { id: 'export', type: 'button', label: 'Export', title: 'Save every place in My places as one file (thumbnails left out)', onSelect: exportAllLocations },
        { id: 'import', type: 'button', label: 'Import', title: 'Add the places in a file to My places. The ones already there are skipped.', onSelect: () => input.current?.click() },
        { id: 'copy-text', type: 'button', label: 'Copy as text', title: 'Copy this place as text, for Paste link or place', onSelect: () => { void copyLocation(); } },
    ];
    return (
        <div data-dz-location-text className="relative flex flex-col gap-1 px-2 py-2">
            <div className="flex gap-1">
                <button type="button" data-dz-paste-location className={button} title="Jump to the place in a link from Copy link (its camera and formula, not its look), or to a place copied as text. A text that holds several places adds them to My places instead." onClick={() => { void pasteLocation(); }}>Paste link or place</button>
                <button type="button" data-dz-copy-link className={button} title="Copy a link that opens this scene and place" onClick={() => { void copyShareLink(); }}>Copy link</button>
            </div>
            <div className="flex gap-1">
                <button
                    type="button"
                    data-dz-location-file
                    className={button}
                    title="Export My places as a file, import such a file, or copy this place as text"
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenuAt(menuAt ? null : { x: r.left, y: r.bottom + 2 }); }}
                >
                    File…
                </button>
            </div>
            {menuAt && (
                <AnchoredMenu anchor={menuAt} onClose={() => setMenuAt(null)} ignore="[data-dz-location-file]" className="w-40 bg-surface border border-line/15 rounded-lg shadow-2xl p-1">
                    <div data-dz-location-file-menu>
                        <MenuItemList items={fileItems} close={() => setMenuAt(null)} />
                    </div>
                </AnchoredMenu>
            )}
            <input
                ref={input}
                type="file"
                accept="application/json,.json"
                aria-label="Import a file of places"
                data-dz-import-locations-file
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (input.current) input.current.value = '';
                    if (file) void importPicked(file);
                }}
            />
            {/* Room under the buttons for the timeline's toggle: out of flow, gone while the timeline is shown (see the header). */}
            <div data-dz-locations-room aria-hidden className="absolute left-0 top-full h-14 w-px pointer-events-none [:root:has([data-help-id='ui.timeline'])_&]:hidden" />
        </div>
    );
};
