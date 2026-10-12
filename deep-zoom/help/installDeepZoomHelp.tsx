/**
 * deep-zoom/help/installDeepZoomHelp.tsx - everything the "?" menu is in this app, installed once
 * from main.tsx. Each piece goes through an engine seam another app uses the same way (the
 * Gradient Explorer's install, gradient-explorer/v2/help/installGxHelp.tsx, is the model).
 *
 *   TOPICS      `setHelpTopicsLoader` swaps GMT's fractal-renderer help for this app's own
 *               (./topics.ts, a lazy chunk). The menu's Getting Started opens "Flying and
 *               orbiting"; its Keyboard Shortcuts opens the page that is written from the
 *               shortcuts registry when it is read (./shortcutsPage.ts).
 *   HINTS       kept: Show Hints and its H key. The dock tabs draw each row's description under
 *               the row while it is on.
 *   FEEDBACK    the shared Send Feedback item, as before.
 *   WHAT'S NEW  `createWhatsNew` with this app's own topic, version (deep-zoom/version.ts) and
 *               seen key. The key is NOT GMT's nor the Explorer's: the three apps share an
 *               origin, and with one key each app's "seen" would be "unseen" to the others. The
 *               dot on the "?" button is lit until this version's entry has been opened.
 *   THE INTRO   "Show the intro again" starts the first-dive lesson from its first card
 *               (deep-zoom/tutorial/firstDive.ts). One row, not the engine's Tutorials section:
 *               this app has one lesson.
 *   SUPPORT     Support GMT, as before.
 *
 * The `/` key that opens Help is a shortcut like the app's others: deep-zoom/hotkeys.ts.
 *
 * ORDER: `installMenu()` must have run (main.tsx does it first), and the Feedback panel's entry is
 * applied by setup.ts. `installHelp` is idempotent: this is its one call in the app.
 *
 * PITFALL: nothing here may import ./topics.ts - that file is the lazy chunk. A topic is named by
 * its id from ./ids.ts (strings only).
 *
 * @assumption The menu holds these rows, a topic opens from each, the dot shows once and clears,
 *   and the intro restarts - seen in the app on 2026-10-12 (debug/scratch/help/app-help.mts,
 *   git-ignored). `npm run smoke:chrome` clicks every row of the menu and fails on a page error;
 *   nothing standing reads what a row opened.
 */
import { installHelp } from '../../engine/plugins/Help';
import { menu } from '../../engine/plugins/Menu';
import { createWhatsNew } from '../../engine/plugins/WhatsNew';
import { setHelpTopicsLoader } from '../../data/help/registry';
import { gmtSupportConfig } from '../../engine-gmt/support';
import { feedbackMenuItem, registerFeedbackUI } from '../../engine-gmt/feedback';
import { DZ_APP_NAME, DZ_VERSION } from '../version';
import { startFirstDive } from '../tutorial/firstDive';
import { DZ_TOPIC } from './ids';

/** localStorage: the version whose What's New entry was last opened. This app's own (see the header). */
export const DZ_WHATS_NEW_SEEN_KEY = 'gmt.deepZoom.whatsNew.seenVersion';

export const dzWhatsNew = createWhatsNew({
    topicId: DZ_TOPIC.whatsNew,
    version: DZ_VERSION,
    seenKey: DZ_WHATS_NEW_SEEN_KEY,
    title: `What is new in ${DZ_APP_NAME}`,
});

let installed = false;

export function installDeepZoomHelp(): void {
    if (installed) return;
    installed = true;

    setHelpTopicsLoader(() => import('./topics').then((m) => m.dzHelpTopics()));
    registerFeedbackUI();

    installHelp({
        gettingStartedTopicId: DZ_TOPIC.flying,
        shortcutsTopicId: DZ_TOPIC.shortcuts,
        support: gmtSupportConfig(),
        extraItems: [
            feedbackMenuItem(),
            dzWhatsNew.menuItem(),
            {
                id: 'dz-intro',
                type: 'button',
                label: 'Show the intro again',
                title: 'Start the first-dive guide from its first card',
                onSelect: startFirstDive,
            },
        ],
    });
    // The dot on the "?" button until this version's What's New has been opened.
    menu.setBadge('help', dzWhatsNew.isUnseen);
}
