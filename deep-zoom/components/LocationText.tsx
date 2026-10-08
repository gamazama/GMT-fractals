/**
 * deep-zoom/components/LocationText.tsx - a place as text, a scene as a link: three buttons.
 *
 * Copy location writes the view on screen as JSON; Paste location reads one back and jumps to it
 * (one undo step; a text it cannot read gets a toast that says why); Copy link writes this page's
 * address with the scene in it. The work is in `deep-zoom/share.ts`.
 *
 * Registered as `dz-location-text` in main.tsx; panels.ts places it at the foot of Locations.
 */
import React from 'react';
import { copyLocation, copyShareLink, pasteLocation } from '../share';

const button = 'flex-1 h-6 px-1 rounded border border-line/20 text-[9px] font-semibold text-fg-secondary hover:text-fg hover:border-line/40';

export const LocationText: React.FC = () => (
    <div data-dz-location-text className="flex gap-1 px-2 py-2">
        <button type="button" data-dz-copy-location className={button} title="Copy this view as text" onClick={() => { void copyLocation(); }}>Copy location</button>
        <button type="button" data-dz-paste-location className={button} title="Jump to a location copied as text" onClick={() => { void pasteLocation(); }}>Paste location</button>
        <button type="button" data-dz-copy-link className={button} title="Copy a link that opens this scene and view" onClick={() => { void copyShareLink(); }}>Copy link</button>
    </div>
);
