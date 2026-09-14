/**
 * The Gradient Explorer v2 session, wired: restore on boot, autosave, and Save / Load in
 * Settings ▸ Files ▸ Session. The owner's calls (2026-09-13): the working session survives a
 * reload / crash / close WHEN AUTOSAVE IS ON, autosave is opt-in and this app's own (its keys
 * never touch app-gmt's); saving to a file is an advanced case, so it lives in Settings, not
 * the top bar, and works whether autosave is on or off.
 *
 * What a session IS lives in `palette/store/workingSession.ts`; the three loops live in
 * `engine/plugins/Session.ts`. This file is only the app's choices:
 *   • `gxAutosaveSettings` — the Explorer's autosave preferences under its own keys
 *     (`gmt.ge.autosave-enabled` / `gmt.ge.autosave-interval-sec`), off until the user turns
 *     them on. main.tsx hands the SAME store to `registerCoreSettings({ autosave })`, so the
 *     Files ▸ Autosave rows read and write these keys and not app-gmt's `gmt-autosave-*`;
 *   • a share link that opens pre-empts the restore (`shareOpensFrom`) — it is the gradient the
 *     user asked for on this load, and the autosave (if on) then keeps it as the session;
 *   • the file is `<working name>.gxsession.json` — `.json` so any picker and editor accepts it,
 *     the inner `.gxsession` so it is not mistaken for a gradient or a Favients collection
 *     (both of which are also `.json` in this app).
 *
 * Call `installGxSession()` from main.tsx AFTER the feature/component registrations and BEFORE
 * the first render, so the hero's first paint is the restored gradient.
 *
 * @see engine/plugins/Session.ts (its @assumption about calling before any undo bracket)
 * @see docs/adr/0121-the-session-restores-itself.md
 */

import { createAutosaveSettingsStore, type AutosaveSettingsText } from '../../engine/store/autosaveStore';
import {
  restoreSessionOnBoot,
  installSessionAutosave,
  registerSessionFileSettings,
  applySessionText,
} from '../../engine/plugins/Session';
import type { SessionBootAction } from '../../store/sessionEnvelope';
import { workingSessionAdapter, WORKING_SESSION_STORAGE_KEY } from '../../palette/store/workingSession';
import { useWorkingStore, autoWorkingName } from '../../palette/store/workingStore';
import { shareOpensFrom } from './shareUrl';
import { slugName } from './exportActions';

export const GX_SESSION_SUFFIX = '.gxsession.json';

/** The Explorer's autosave preferences — its own keys, off by default. */
export const gxAutosaveSettings = createAutosaveSettingsStore({
  enabled: 'gmt.ge.autosave-enabled',
  intervalSec: 'gmt.ge.autosave-interval-sec',
});

/** What Files ▸ Autosave says in the Explorer (app-gmt's wording talks about a scene). */
export const GX_AUTOSAVE_TEXT: AutosaveSettingsText = {
  enabledDescription: 'Keep the working gradient in this browser, so a reload or a crash brings it back.',
  intervalDescription: 'How often to save it, in seconds. Closing or reloading the tab always saves.',
};

/**
 * Open a session file's TEXT as the working session — the apply Settings ▸ Session ▸ Load runs
 * (`applySessionText`: validate, one undo step, a toast either way). The gradient loader hands a
 * `.gxsession.json` that arrived by a drop or a gradient-file picker here (ADR-0123 Decision 3).
 */
export const loadGxSessionText = (text: string): boolean => applySessionText(workingSessionAdapter, text);

let installed: SessionBootAction | null = null;

/** Idempotent. Returns what the boot did with the stored session. */
export const installGxSession = (): SessionBootAction => {
  if (installed) return installed;
  const storageKey = WORKING_SESSION_STORAGE_KEY;
  const settings = gxAutosaveSettings;
  installed = restoreSessionOnBoot(workingSessionAdapter, {
    storageKey,
    settings,
    preempted: typeof location !== 'undefined' && shareOpensFrom(location.search),
  });
  installSessionAutosave(workingSessionAdapter, { storageKey, settings });
  registerSessionFileSettings(workingSessionAdapter, {
    idPrefix: 'gx-session',
    accept: '.json,application/json',
    fileName: () => {
      const s = useWorkingStore.getState();
      return `${slugName(s.name ?? autoWorkingName(s.input, s.bakedFrom))}${GX_SESSION_SUFFIX}`;
    },
    save: {
      label: 'Save session to a file',
      description:
        'The working gradient and what is behind it — its stops, the Mix slots, Curves and Adjust, the source image — as one .gxsession.json file. My Gradients is not included.',
    },
    load: {
      label: 'Load session from a file',
      description: 'Opens a .gxsession.json file in place of the working gradient. One undo puts yours back.',
    },
  });
  return installed;
};
