/**
 * deep-zoom/session.ts - the scene kept across a reload: the engine's session plugin, installed
 * for this app.
 *
 * PURPOSE
 *   With Settings > Files > Autosave on, the app opens where it was left: the camera, the formula
 *   (Julia mode and its constant with it), every look value and the route on the timeline. Off -
 *   the default - it keeps nothing and opens on the start view, as before 2026-10-12.
 *
 *   Everything that DOES the keeping is the engine's (`engine/plugins/Session.ts`: the boot
 *   restore, the autosave loop with its flush when the tab is hidden or closed, the versioned
 *   envelope of `store/sessionEnvelope.ts`), installed the way the Gradient Explorer installs it
 *   (`gradient-explorer/v2/session.ts`). This file is only this app's choices:
 *     - `dzAutosaveSettings`: the app's own autosave preferences, under its own keys
 *       (`gmt.deepZoom.autosave-enabled`, `gmt.deepZoom.autosave-interval-sec`). main.tsx hands the
 *       SAME store to `registerCoreSettings({ autosave })`, so the two Files > Autosave rows read
 *       and write these keys and never app-gmt's `gmt-autosave-*`.
 *     - WHAT A SESSION HOLDS IS THE SCENE, AND THE SCENE'S OWN SERIALIZER WRITES IT. `capture` is
 *       the store's `getPreset({ includeScene: true })` - the call File > Save Scene makes - and
 *       `apply` is `loadPreset`, which is how a share link opens at boot (`loadShareFromUrl` in
 *       deep-zoom/share.ts). There is no second list of what a scene is.
 *     - A share link that opens pre-empts the restore. The stored session stays as it was until
 *       something in the linked scene is CHANGED (the engine's loop writes on a change since
 *       boot, and the link is already loaded when the loop starts): a link that was only looked
 *       at does not replace the work kept before it; one that is flown in does, at the next write.
 *
 * WHAT IS NOT IN A SESSION, AND WHY
 *   - THE DOCUMENTS (`includeDocuments`, which Save Scene asks for): My locations and My
 *     Gradients. Each is kept by this device on its own (`gmt.deepZoom.locations`, the palette's
 *     own keys), a restore would only merge the list into itself - with the palette's "added"
 *     toast at every boot - and the thumbnails would fill the storage quota a second time.
 *   - Nothing of the timeline but the sequence, its length and its rate: the playhead is the
 *     engine's and starts at 0, as after a loaded scene. With a route, the camera then stands
 *     where it was left and the Route tab says it is off the route.
 *   - No Settings rows to save or load a session as a FILE (the Explorer has two): here that file
 *     would be a scene file in an envelope, and File > Save Scene / Load Scene are already there.
 *
 * NOTHING ON THIS PATH ROUNDS A NUMBER. The body goes through `JSON.stringify` into localStorage
 * and back through `JSON.parse`: the camera, the Julia constant and a keyframe's payload are
 * STRINGS and come back as they were, and a double survives JSON exactly. The share encoder
 * (`utils/UrlStateEncoder.ts`, which rounds every number to five decimals and is why a link
 * carries no route) is not on it.
 *
 * PITFALLS
 *   - `installDzSession` runs before React, so before any renderer: the restored view is PARKED
 *     (deep-zoom/presetFields.ts) until the renderer is mounted and its shader built, some
 *     seconds later. Until then `getPreset` answers that parked view, not the renderer's start
 *     view - a reload, or a tab closed, in those seconds must not write the start view over the
 *     place that was just restored (the `@invariant` there).
 *   - The loop writes only when the body CHANGED. The view's depth is read afresh at every
 *     capture and settles within a second of the camera standing still, so an idle app writes
 *     once after it settles and then nothing.
 *   - `Home` is the view the renderer first became ready with (deep-zoom/locations.ts,
 *     `rememberHome`): after a restore that is the restored place, as it is the link's place after
 *     a share link.
 *   - A session a newer build cannot read is not migrated: another envelope version, or a body
 *     that fails `validate`, starts clean.
 *
 * @invariant a stored session whose camera is not three whole numbers written as text is refused
 *   whole - proven by: npm run check:deep-zoom-scene-roundtrip ("session: a body whose camera went
 *   through numbers is refused (a clean start, never a wrong place)"). Falsified 2026-10-12: the
 *   view's test taken out of `validate` -> that line red.
 * @assumption In the app, with autosave on: a deep view (the "Certified edge" starter, 6.6e-35)
 *   and a route of three keyframes come back after a reload string for string - the camera, every
 *   keyframe's payload - with the look, with nothing on the undo stack and with no page error;
 *   a reload two seconds into the next boot keeps the place; switched off, a reload opens the
 *   start view and the stored session is gone. Seen 2026-10-12 (debug/scratch/shell-leftovers/
 *   session.mts, git-ignored). The round trip of the scene's own serializer has a standing check
 *   (`npm run check:deep-zoom-scene-roundtrip`); the wiring - main.tsx, the flush when the page
 *   is hidden, the Settings rows - has none in this app (the Explorer's is `smoke:ge-session`).
 *
 * @see engine/plugins/Session.ts
 * @see docs/adr/0121-the-session-restores-itself.md
 */
import { createAutosaveSettingsStore } from '../engine/store/autosaveStore';
import type { AutosaveSettingsText } from '../engine/store/autosaveStore';
import { installSessionAutosave, restoreSessionOnBoot } from '../engine/plugins/Session';
import type { SessionAdapter } from '../engine/plugins/Session';
import type { SessionBootAction } from '../store/sessionEnvelope';
import { useEngineStore } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';
import type { Preset } from '../types';
import { isSavedView } from './presetFields';

/** This app's autosave preferences: its own keys, off until the user turns them on. */
export const dzAutosaveSettings = createAutosaveSettingsStore({
    enabled: 'gmt.deepZoom.autosave-enabled',
    intervalSec: 'gmt.deepZoom.autosave-interval-sec',
});

/** What Files > Autosave says in this app (the engine's default wording is app-gmt's). */
export const DZ_AUTOSAVE_TEXT: AutosaveSettingsText = {
    enabledDescription: 'Keep the scene in this browser - the view, the look and the route - so a reload or a crash brings it back.',
    intervalDescription: 'How often to save it, in seconds. Closing or reloading the tab always saves.',
};

export const DZ_SESSION_STORAGE_KEY = 'gmt.deepZoom.session';
export const DZ_SESSION_FORMAT = 'gmt-deep-zoom-session';

/** A session: the scene, as `getPreset` wrote it. */
export interface DzSession {
    scene: Preset;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export const dzSessionAdapter: SessionAdapter<DzSession> = {
    format: DZ_SESSION_FORMAT,
    version: 1,
    // The scene, by the scene's own serializer, without the documents (see the header). `compact`
    // has nothing to drop: the thumbnails, the one heavy thing, are not in it to begin with.
    capture: () => ({ scene: useEngineStore.getState().getPreset({ includeScene: true }) as unknown as Record<string, unknown> }),
    // A scene has its formula id and its feature slices. A view that is there and is not three
    // whole numbers as text refuses the whole session: a clean start, never a wrong place.
    validate: (body) => {
        const scene = body.scene;
        if (!isRecord(scene) || typeof scene.formula !== 'string' || !isRecord(scene.features)) return null;
        if (scene.dzView !== undefined && !isSavedView(scene.dzView)) return null;
        return { scene: scene as unknown as Preset };
    },
    // As a share link opens: the store first, the view parked until a renderer is ready. `loadPreset`
    // empties the param undo stack. The TIMELINE's own history does not: the sequence is set through
    // `setSequence`, which keeps the one before it as an undo step - after a restore at boot that
    // step would be "the empty timeline", and an undo on the timeline would take the route away.
    // So a boot restore empties that history too: a first Ctrl+Z, wherever, takes nothing back.
    // And the project's NAME is put back as the session held it: `loadPreset` renames a scene called
    // "Untitled" after its formula, and this app's one formula id is not a name anybody chose (the top
    // bar read "mandelbulb-deepzoom" after every reload, seen 2026-10-12).
    apply: (session, mode) => {
        const name = session.scene.name;
        useEngineStore.getState().loadPreset(session.scene);
        if (typeof name === 'string' && name) useEngineStore.setState((s) => ({ projectSettings: { ...s.projectSettings, name } }));
        if (mode === 'boot') useAnimationStore.setState({ undoStack: [], redoStack: [] });
    },
};

let installed: SessionBootAction | null = null;

/**
 * Restore the stored session (when autosave is on and nothing pre-empts it) and start keeping it.
 * Call once from main.tsx, after every registration and after a share link has had its turn, before
 * the first render. Returns what the boot did with the stored session.
 */
export function installDzSession(opts: { preempted: boolean }): SessionBootAction {
    if (installed) return installed;
    const wiring = { storageKey: DZ_SESSION_STORAGE_KEY, settings: dzAutosaveSettings };
    installed = restoreSessionOnBoot(dzSessionAdapter, { ...wiring, preempted: opts.preempted });
    // After the restore: the loop's baseline is the session as restored, so the restore itself is no change.
    installSessionAutosave(dzSessionAdapter, wiring);
    return installed;
}
