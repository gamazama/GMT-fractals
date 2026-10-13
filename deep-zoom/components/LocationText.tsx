/**
 * deep-zoom/components/LocationText.tsx - a place as text, a scene as a link, the list as a file:
 * the foot of the Locations tab, five buttons in two rows.
 *
 * Copy location writes the view on screen as JSON; Paste location reads one back and jumps to it
 * (one undo step; a text it cannot read gets a toast that says why) - and a pasted text that holds
 * SEVERAL locations is added to My locations instead; Copy link writes this page's address with
 * the scene in it. Export all downloads every saved location as one JSON file, thumbnails left
 * out; Import opens such a file and adds its locations to the list, skipping the ones already
 * there (a file dropped on the app, or picked in File > Load Scene, does the same:
 * `deep-zoom/claims.ts`). The work is in `deep-zoom/share.ts` and `deep-zoom/claims.ts`.
 *
 * Registered as `dz-location-text` in main.tsx; panels.ts places it at the foot of Locations.
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
 * the same file twice still imports (the second time everything in it is "already there").
 *
 * @assumption With My locations long and the timeline closed, the last button ends clear of the
 *   toggle when the tab is scrolled to its end, and with the timeline open the tab ends where its
 *   buttons end - measured once, 2026-10-12, in the app at 1280 x 800 with 14 saved locations
 *   (debug/scratch/shell-leftovers/locations.mts, git-ignored; with the room taken out its "the
 *   foot is clear of the toggle" line was red). No standing guard looks at it.
 */
import React, { useRef } from 'react';
import { copyLocation, copyShareLink, exportAllLocations, pasteLocation } from '../share';
import { importLocationFiles } from '../claims';
import { showToast } from '../../engine/store/toastStore';

const button = 'flex-1 h-6 px-1 rounded border border-line/20 text-[9px] font-semibold text-fg-secondary hover:text-fg hover:border-line/40';

/** The file picked with "Import": its locations go to My locations; a file that holds none is said so. */
async function importPicked(file: File): Promise<void> {
    const left = await importLocationFiles([file]);
    if (left.length > 0) showToast(`"${file.name}" holds no locations`, 'warning', 5000);
}

export const LocationText: React.FC = () => {
    const input = useRef<HTMLInputElement>(null);
    return (
        <div data-dz-location-text className="relative flex flex-col gap-1 px-2 py-2">
            <div className="flex gap-1">
                <button type="button" data-dz-copy-location className={button} title="Copy this view as text" onClick={() => { void copyLocation(); }}>Copy location</button>
                <button type="button" data-dz-paste-location className={button} title="Jump to a location copied as text. A text that holds several is added to My locations instead." onClick={() => { void pasteLocation(); }}>Paste location</button>
                <button type="button" data-dz-copy-link className={button} title="Copy a link that opens this scene and view" onClick={() => { void copyShareLink(); }}>Copy link</button>
            </div>
            <div className="flex gap-1">
                <button type="button" data-dz-export-locations className={button} title="Save every location in My locations as one file (thumbnails left out)" onClick={exportAllLocations}>Export all</button>
                <button type="button" data-dz-import-locations className={button} title="Add the locations in a file to My locations. The ones already there are skipped." onClick={() => input.current?.click()}>Import</button>
            </div>
            <input
                ref={input}
                type="file"
                accept="application/json,.json"
                aria-label="Import a file of locations"
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
