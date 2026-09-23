/**
 * explorerHandoff — the two things that pass between the GMT studio and a Gradient Explorer
 * tab opened from its My Gradients panel (owner, 2026-09-23). Palette-level because BOTH ends
 * import it — app-gmt writes (`app-gmt/explorerTrip.ts`), the Explorer reads
 * (`gradient-explorer/v2/fromGmt.ts`) — and `palette/` may import neither app.
 *
 * 1. THE INCOMING GRADIENT — a one-shot localStorage key. The studio writes the gradient it
 *    wants the Explorer to open on (`{ config, name, favId? }`) just before `window.open`;
 *    the Explorer reads and clears it once, at boot, and makes it the working gradient in
 *    place of its restored session — exactly as a share link does. `favId` is set when the
 *    gradient IS a My Gradients favourite, so the Explorer can show that favourite selected.
 *    The config goes as-is (colour-space flag included; the Explorer reads display sRGB).
 *    Lifetime 2 minutes: a new tab boots in seconds, and a key the Explorer never read
 *    (a blocked popup — `noopener` makes `window.open` return null, so the studio cannot
 *    tell) must not surface on some later, unrelated Explorer boot.
 *
 * 2. THE TRIP CHANNEL — how the Explorer's "Back to GMT" learns whether the tab it came from
 *    is still alive. The studio names each trip (`?trip=<id>` on the Explorer's URL) and
 *    answers a ping for a trip it made; the Explorer pings before closing itself. No answer
 *    within `TRIP_PING_MS` (the studio tab was closed, reloaded, discarded by a phone, or
 *    frozen) → the Explorer does NOT close, it navigates to `app-gmt.html?from=gx`, which
 *    restores the scene the studio stashed (engine-gmt/utils/sceneStash.ts). Closing on a
 *    tab that is gone would lose both the scene and the Explorer. No BroadcastChannel → no
 *    answer → the same safe fallback.
 *
 * The GMT → GX direction only. The owner cancelled a gradient hand-BACK to GMT on 2026-09-07
 * (plans/ge-v2-unified-shell-plan.md, Phase B): the Explorer's working gradient already reaches
 * GMT's My Gradients through the shared Recent group.
 *
 * @invariant the incoming gradient is read at most once, only within its 2-minute lifetime, comes
 *   back exactly as written, and anything that does not validate is null — the key cleared in
 *   every case — proven by: `npx tsx debug/test-scene-stash.mts` [6] ("one-shot: the key is gone
 *   after the take", "not at 2:01 …", "round trip: the config exactly as written …", "garbage
 *   (a config with no stops) → null, key cleared"). Falsified 2026-09-23 (F8–F10 in its header).
 * @assumption The trip channel's answer means "that tab is alive NOW"; nothing proves the close
 *   that follows lands the user in it (the browser picks the tab to activate). Exercised, not
 *   proven, by `debug/smoke-gmt-gx-handoff.mts` (the GX tab closes while the GMT tab answers).
 * @see engine-gmt/utils/sceneStash.ts (the scene half of the trip)
 */
import type { GradientConfig } from '../../types';
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '../../store/safeLocalStorage';
import { coerceGradientConfig } from './editorConfig';

/** localStorage key of the one-shot incoming gradient. */
export const EXPLORER_INCOMING_KEY = 'gmt.gx.incoming';
/** How long after the studio wrote it the Explorer may still take it. */
export const EXPLORER_INCOMING_TTL_MS = 2 * 60 * 1000;

export interface ExplorerIncoming {
  config: GradientConfig;
  name: string;
  /** The My Gradients favourite this gradient is, when it is one. */
  favId?: string;
}

/** Write the incoming gradient (replacing any earlier one). Returns whether it landed. */
export const writeExplorerIncoming = (g: ExplorerIncoming, now: number = Date.now()): boolean =>
  safeLocalSet(
    EXPLORER_INCOMING_KEY,
    JSON.stringify({ v: 1, at: now, config: g.config, name: g.name, ...(g.favId ? { favId: g.favId } : {}) }),
  );

/**
 * Read AND clear the incoming gradient. Null when there is none, it is older than
 * `EXPLORER_INCOMING_TTL_MS`, or it does not parse / validate (the key is cleared either way).
 * The config is validated through the shared gate but handed back as the studio wrote it.
 */
export const takeExplorerIncoming = (now: number = Date.now()): ExplorerIncoming | null => {
  const raw = safeLocalGet(EXPLORER_INCOMING_KEY);
  safeLocalRemove(EXPLORER_INCOMING_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== 'object' || o.v !== 1) return null;
    const at = typeof o.at === 'number' ? o.at : NaN;
    if (!Number.isFinite(at) || now - at > EXPLORER_INCOMING_TTL_MS || at - now > EXPLORER_INCOMING_TTL_MS) return null;
    if (!coerceGradientConfig(o.config)) return null;
    const name = typeof o.name === 'string' && o.name.trim() ? o.name : 'From GMT';
    const favId = typeof o.favId === 'string' && o.favId ? o.favId : undefined;
    return { config: o.config as GradientConfig, name, ...(favId ? { favId } : {}) };
  } catch {
    return null;
  }
};

// ── the trip channel ────────────────────────────────────────────────────────────────────

/** The Explorer URL's trip parameter (`gradient-explorer.html?from=gmt&trip=<id>`). */
export const EXPLORER_TRIP_PARAM = 'trip';
const CHANNEL = 'gmt.gx.trip';
/** How long "Back to GMT" waits for the studio tab to answer. Cross-tab BroadcastChannel
 *  delivery is a few ms; a studio tab too busy to answer in this long gets the fallback,
 *  which loses nothing (it restores the stashed scene in the Explorer's tab). */
export const TRIP_PING_MS = 300;

type TripMsg = { type: 'ping' | 'pong' | 'returned'; trip: string };

const openChannel = (): BroadcastChannel | null => {
  try {
    return typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null;
  } catch {
    return null;
  }
};

/** A fresh trip id. Not a secret — it only has to tell one tab's trips from another's. */
export const newTripId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * STUDIO side: answer pings for the trips `isMine` recognises, and hear when the Explorer of one
 * of them has closed itself (`onReturned`). Returns an unsubscribe. No BroadcastChannel → a no-op.
 */
export const answerExplorerTrips = (isMine: (trip: string) => boolean, onReturned?: (trip: string) => void): (() => void) => {
  const ch = openChannel();
  if (!ch) return () => {};
  ch.onmessage = (e: MessageEvent) => {
    const m = e.data as Partial<TripMsg> | null;
    if (!m || typeof m.trip !== 'string' || !isMine(m.trip)) return;
    if (m.type === 'ping') ch.postMessage({ type: 'pong', trip: m.trip } satisfies TripMsg);
    else if (m.type === 'returned') onReturned?.(m.trip);
  };
  return () => ch.close();
};

/** EXPLORER side: is the studio tab that made `trip` alive and answering? */
export const pingExplorerTrip = (trip: string, timeoutMs: number = TRIP_PING_MS): Promise<boolean> =>
  new Promise((resolve) => {
    const ch = openChannel();
    if (!ch) return resolve(false);
    let done = false;
    const finish = (alive: boolean): void => {
      if (done) return;
      done = true;
      ch.close();
      resolve(alive);
    };
    ch.onmessage = (e: MessageEvent) => {
      const m = e.data as Partial<TripMsg> | null;
      if (m?.type === 'pong' && m.trip === trip) finish(true);
    };
    setTimeout(() => finish(false), timeoutMs);
    ch.postMessage({ type: 'ping', trip } satisfies TripMsg);
  });

/** EXPLORER side, after its close was accepted: tell the studio its safety net is not needed. */
export const announceExplorerReturn = (trip: string): void => {
  const ch = openChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: 'returned', trip } satisfies TripMsg);
  } finally {
    ch.close();
  }
};
