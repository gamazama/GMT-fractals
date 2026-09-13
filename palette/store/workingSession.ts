/**
 * workingSession — what a Gradient Explorer v2 SESSION is, as an adapter for the engine's
 * session plugin (`engine/plugins/Session.ts`): the thing that survives a reload, a crashed
 * tab or a closed one, and what Settings ▸ Files ▸ Session saves to and loads from a file.
 *
 * A session is a STUDIO SNAPSHOT (`captureStudioSnapshot` in ./variantsStore — the same
 * capture a variant uses, so the two cannot drift):
 *
 *   features   paletteGenerator (the Adjust dials, the Mix blends, generatorMode)
 *              paletteImage     (the img2grad dials)
 *   documents  working    — the pipeline INPUT slot, name, fold + live memory, Recent session id
 *              stops      — the editable stops document
 *              generator  — Mix slots A/B, curve tracks + space + curvesOn, detail / smooth / seed
 *              image      — the source image (a JPEG data URL) + trace path + export format
 *
 * What is NOT in it, on purpose, because each already persists on its own as a per-viewer
 * preference and a session file from someone else must not overwrite them:
 *   • the favourites shelf (`gmt.favients`) — shared across apps; the `favients` document is
 *     stripped on capture AND on apply (a loaded file never merges into your shelf);
 *   • `paletteFilters` (the browse filters; layout prefs live in `gmt.paletteFilters`, and the
 *     filter windows are deliberately session-only so a reload never silently hides gradients);
 *   • the palette row's positions / rule / follow (`gmt.ge.working.prefs`), hero prefs, the
 *     curve-fit preference, the theme — all their own keys;
 *   • interface state (which tray face is open, the fold, a selection) — the shell derives
 *     what it needs from the restored input (a live Mix / Image input reopens its face).
 *
 * Apply: `boot` writes straight through (no bracket, so a first Ctrl+Z after a reload has
 * nothing to take away); `file` is ONE `paramEdit` and forgets the file's Recent session id,
 * so a loaded session opens its own My Gradients entry instead of writing into whichever
 * entry of yours happens to share an id.
 *
 * @invariant A session body round-trips: capture → encode → decode → validate → apply
 *   restores the working input, name, stops, generator document and both feature slices;
 *   garbage, another format, another version and a body without a valid `working` document
 *   are all refused; a `boot` apply adds no undo entry and a `file` apply adds exactly one,
 *   which undoes back to the previous session; the favourites document is never applied; and
 *   Mix's slot modifiers land at neutral whatever the body carries.
 *   — proven by: `npm run test:gx-session` ("[4] a boot restore adds NO undo entry",
 *   "[5] a file load is exactly ONE undo entry", "[3] a body without a working document is
 *   refused", "[5] the favients provider is never invoked"). Falsifications are recorded in
 *   the harness header.
 *
 * Known gap (inherited from variants, ADR-0112): the `image` document restores
 * ASYNCHRONOUSLY, so undoing a file load does not put the PREVIOUS image back.
 *
 * @see docs/adr/0121-the-session-restores-itself.md
 * @see engine/plugins/Session.ts · store/sessionEnvelope.ts · gradient-explorer/v2/session.ts
 */

import { paramEdit } from './paramUndoBracket';
import { captureStudioSnapshot, applyStudioSnapshot } from './variantsStore';
import { coerceWorkingSnapshot } from './workingStore';
import { SLOT_MOD_DEFAULTS } from './generatorStore';
import { deepClone, isWellFormedStudioSnapshot, stripFavients, type StudioSnapshot } from '../core/variantsCore';
import type { SessionAdapter, SessionApplyMode } from '../../engine/plugins/Session';
import type { JsonValue } from '../../types';

export const WORKING_SESSION_FORMAT = 'gmt-gx-session';
export const WORKING_SESSION_VERSION = 1;
/** The browser autosave slot. */
export const WORKING_SESSION_STORAGE_KEY = 'gmt.ge.session';
/** The feature slices a session carries — see the header for why `paletteFilters` is not one. */
export const WORKING_SESSION_FEATURES = ['paletteGenerator', 'paletteImage'] as const;

export type WorkingSession = StudioSnapshot;

export const captureWorkingSession = (opts: { compact: boolean } = { compact: false }): WorkingSession => {
  const snap = captureStudioSnapshot(WORKING_SESSION_FEATURES);
  // Compact = without the source image, the one part that can reach megabytes. Omitted rather
  // than nulled: a null `src` would RESET the image store on restore, an absent key leaves it.
  if (opts.compact) delete (snap.documents as Record<string, unknown>).image;
  return snap;
};

/** Validate an untrusted body. Never throws; null = refuse. */
export const validateWorkingSession = (body: unknown): WorkingSession | null => {
  if (!isWellFormedStudioSnapshot(body)) return null;
  // The working document is what makes this a session at all; without a readable one there is
  // nothing to restore, and a half-restore (dials over yesterday's input) would be worse.
  if (!coerceWorkingSnapshot(body.documents.working)) return null;
  const features: Record<string, unknown> = {};
  for (const id of WORKING_SESSION_FEATURES) {
    const f = body.features[id];
    if (f && typeof f === 'object' && !Array.isArray(f)) features[id] = deepClone(f);
  }
  return { features, documents: stripFavients(body.documents) };
};

/**
 * The Mix SLOT MODIFIERS (`aHueRotate` … `bMirror`) always land at neutral. GE v2 has no control
 * for them (owner, 2026-09-13), and its Mix entry resets them — but a restored LIVE Mix never
 * runs that entry, so a hand-edited or older session carrying a value would apply it unseen.
 * The one list is `SLOT_MOD_DEFAULTS` in ./generatorStore, shared with the Mix entry.
 */
const withNeutralSlotMods = (features: Record<string, unknown>): Record<string, unknown> => {
  const pg = features.paletteGenerator;
  const base = pg && typeof pg === 'object' && !Array.isArray(pg) ? (pg as Record<string, unknown>) : {};
  return { ...features, paletteGenerator: { ...base, ...SLOT_MOD_DEFAULTS } };
};

export const applyWorkingSession = (session: WorkingSession, mode: SessionApplyMode): void => {
  const features = withNeutralSlotMods(session.features);
  if (mode === 'boot') {
    applyStudioSnapshot({ features, documents: session.documents }, WORKING_SESSION_FEATURES);
    return;
  }
  const documents = deepClone(session.documents);
  const w = documents.working;
  if (w && typeof w === 'object' && !Array.isArray(w)) {
    documents.working = { ...(w as Record<string, JsonValue>), sessionId: null, sessionPinned: false };
  }
  paramEdit(() => applyStudioSnapshot({ features, documents }, WORKING_SESSION_FEATURES));
};

export const workingSessionAdapter: SessionAdapter<WorkingSession> = {
  format: WORKING_SESSION_FORMAT,
  version: WORKING_SESSION_VERSION,
  capture: (opts) => captureWorkingSession(opts) as unknown as Record<string, unknown>,
  validate: validateWorkingSession,
  apply: applyWorkingSession,
};
