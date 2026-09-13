/**
 * @engine/whats-new — a "What's New" Help-menu item with a version-gated unseen indicator.
 *
 * Hoisted 2026-09-13 out of `app-gmt/HelpExtras.tsx`, where it was app-agnostic except for
 * three values — the changelog topic id, the version it compares against, and the
 * localStorage key it remembers the last-seen version under. Those are now options, so a
 * second app (the Gradient Explorer v2 shell) gets the same behaviour without a copy.
 *
 *   const whatsNew = createWhatsNew({ topicId, version, seenKey });
 *   installHelp({ extraItems: [whatsNew.menuItem()] });
 *   menu.setBadge('help', whatsNew.isUnseen);      // the dot on the menu's own button
 *
 * Behaviour (unchanged from GMT's): a release is UNSEEN while the stored value differs from
 * `version`; a first run (nothing stored) counts as unseen, so every user gets one nudge per
 * release. Opening the changelog stores `version`, clears the row's NEW highlight, and calls
 * `menu.refresh()` so the dot goes at once. localStorage that throws counts as seen (no dot).
 *
 * Pitfall — THE KEY IS PER APP. Two apps on one origin that share `seenKey` but compare
 * against different versions would each clear and relight the other's dot forever (each
 * write is "not my version" to the other). Give every app its own key; GMT's is
 * `gmt.whatsNew.seenVersion`.
 *
 * The topic id is a string literal on purpose — importing the topic module would pull the
 * lazy help content into the main bundle (see data/help/registry.ts).
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { menu, type MenuItem } from './Menu';

export interface WhatsNewOptions {
    /** Help topic the item opens (via the store's `openHelp`). */
    topicId: string;
    /** The version this build is — a release is unseen until the changelog is opened at it. */
    version: string;
    /** localStorage key holding the last version whose changelog was opened. One per app. */
    seenKey: string;
    /** Row tooltip. */
    title?: string;
}

export interface WhatsNew {
    /** True when there's a release the user hasn't opened the changelog for. */
    isUnseen: () => boolean;
    /** Mark the current version's changelog as seen — clears the dot + highlight. */
    markSeen: () => void;
    /** Open the changelog help page (and mark it seen). */
    open: () => void;
    /** The Help-menu row. Fixed id so re-registering replaces rather than duplicates. */
    menuItem: (opts?: { id?: string; label?: string }) => MenuItem;
}

const SparkleIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.8L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.7z" />
        <path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
);

export const createWhatsNew = ({ topicId, version, seenKey, title }: WhatsNewOptions): WhatsNew => {
    let unseen: boolean | null = null;

    const isUnseen = (): boolean => {
        if (unseen === null) {
            try { unseen = localStorage.getItem(seenKey) !== version; }
            catch { unseen = false; }
        }
        return unseen;
    };

    const markSeen = (): void => {
        try { localStorage.setItem(seenKey, version); } catch { /* private mode */ }
        unseen = false;
        menu.refresh(); // re-render the menu's anchor so the dot clears immediately
    };

    const open = (): void => {
        markSeen();
        (useEngineStore.getState() as any).openHelp?.(topicId);
    };

    const menuItem = (opts: { id?: string; label?: string } = {}): MenuItem => ({
        id: opts.id ?? 'whats-new',
        type: 'button',
        label: opts.label ?? "What's New",
        icon: <SparkleIcon />,
        title,
        badge: () => isUnseen(),
        onSelect: () => open(),
    });

    return { isUnseen, markSeen, open, menuItem };
};
