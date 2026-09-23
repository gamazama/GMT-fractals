/**
 * explorerTrip — what app-gmt does when the My Gradients panel's Explorer button opens the
 * Gradient Explorer in a new tab (owner decisions, 2026-09-23). The GMT tab stays open with its
 * scene untouched; this module makes the trip carry the gradient there and makes the way back
 * safe.
 *
 *   1. THE GRADIENT GOES WITH YOU (`resolveGradientForExplorer`), in priority order:
 *      (i)   the favourite last applied from My Gradients in THIS tab, if it is still on the
 *            shelf AND still what the destination it was applied to shows — then the Explorer
 *            also shows it selected (`favId`);
 *      (ii)  otherwise the gradient the panel's Destination (`selectedTargetId`, falling back to
 *            the first host target as the panel itself does) points at;
 *      (iii) otherwise gradient 1 (`coloring.gradient`).
 *      Handed over through the one-shot key in `palette/core/explorerHandoff.ts`.
 *   2. THE SCENE IS STASHED (`stashLiveScene('gx')`, engine-gmt/utils/sceneStash.ts) as the
 *      safety net for a "Back to GMT" that cannot simply close the Explorer's tab. Only this
 *      trip stashes; reloads and crashes stay on the opt-in autosave.
 *   3. THIS TAB ANSWERS FOR ITS TRIPS on the trip channel, so the Explorer closes itself only
 *      when this tab is still alive to land in.
 *
 * WHY THE "LAST APPLIED" RECORD IS PER TAB, IN MEMORY: it is a fact about this tab's live scene.
 * localStorage would leak it into another GMT tab (tab B's Explorer button would send what tab A
 * clicked), and sessionStorage would carry it across a reload into a scene that no longer shows
 * it. Every apply through a host target rewrites it — one without a `favId` clears it — and (i)
 * re-checks the destination's content at press time, so a favourite that was applied and then
 * edited, or replaced from the Palette Picker, is not sent in place of what the layer now shows.
 * The content check is `favientSig` (stops and ramp only), which ignores the colour-space flag the
 * apply seams stamp (`linear` for coloring, `srgb` for the sky).
 *
 * @assumption The favourite apply that (i) records is the panel's `onApply`
 *   (palette/components/FavientsPanel.tsx), which passes `favId` in its payload; the host targets
 *   registered in app-gmt/registerFeatures.ts route every apply through `noteGradientApplied`.
 *   A new host target that skips the call leaves a stale record, which the content check in (i)
 *   then rejects — so the failure mode is (ii), never a wrong gradient. The panel half IS guarded:
 *   `debug/smoke-gmt-gx-handoff.mts` [2] ("Fav A is shown SELECTED") goes red when the panel's
 *   apply drops `favId` (falsified 2026-09-23); the "new target" half is what stays assumed.
 */
import type { GradientConfig, GradientStop } from '../types';
import type { FavientDragPayload } from '../palette/core/favientDnd';
import { useFavientsStore, favientSig } from '../palette/store/favientsStore';
import { coerceGradientConfig } from '../palette/core/editorConfig';
import { answerExplorerTrips, newTripId, type ExplorerIncoming } from '../palette/core/explorerHandoff';
import { openGradientExplorer } from '../palette/installFavients';
import { getSendTargets, type SendTarget } from '../store/sendTargetRegistry';
import { useEngineStore } from '../store/engineStore';
import { stashLiveScene } from '../engine-gmt/utils/stashLiveScene';
import { clearSceneStash } from '../engine-gmt/utils/sceneStash';
import { showToast } from '../engine/store/toastStore';

/** The last favourite applied through a host target in this tab, and where it landed. */
let lastApplied: { favId: string; targetId: string } | null = null;

/** Called by every app-gmt host target's `apply` (registerFeatures.ts). */
export const noteGradientApplied = (targetId: string, p: FavientDragPayload): void => {
  lastApplied = p.favId ? { favId: p.favId, targetId } : null;
};

const hostTargets = (): SendTarget[] => getSendTargets().filter((t) => t.group === 'host');

/** The gradient a host target's param holds now, as a config (a legacy stop array reads the way
 *  the gradient editor reads it: sRGB, OKLab blend). Null when missing or malformed.
 *
 *  ONE stop is a solid colour to the renderer, but the shared gate (`coerceGradientConfig`) wants
 *  two — and a fresh Mandelbulb's gradient 1 is exactly that, a single white stop (measured
 *  2026-09-23), so without this the Explorer button on a first boot sent nothing. It goes as the
 *  same colour at both ends, which renders identically. */
const gradientAt = (ep: SendTarget['editsParam']): GradientConfig | null => {
  if (!ep) return null;
  const feature = (useEngineStore.getState() as unknown as Record<string, Record<string, unknown> | undefined>)[ep.featureId];
  const v = feature?.[ep.paramKey];
  let config = Array.isArray(v)
    ? ({ stops: v as GradientStop[], colorSpace: 'srgb', blendSpace: 'oklab' } as GradientConfig)
    : (v as GradientConfig | undefined);
  if (config && Array.isArray(config.stops) && config.stops.length === 1) {
    const only = config.stops[0];
    config = { ...config, stops: [{ ...only, id: `${only.id ?? 's'}-0`, position: 0 }, { ...only, id: `${only.id ?? 's'}-1`, position: 1 }] };
  }
  return config && coerceGradientConfig(config) ? config : null;
};

const sceneName = (): string => {
  const n = (useEngineStore.getState() as unknown as { projectSettings?: { name?: string } }).projectSettings?.name;
  return typeof n === 'string' && n.trim() ? n.trim() : 'GMT';
};

/** What the Explorer should open on — see the file header for the order. Null only when no
 *  host gradient can be read at all. */
export const resolveGradientForExplorer = (): ExplorerIncoming | null => {
  const targets = hostTargets();
  const byId = (id: string | null | undefined) => (id ? targets.find((t) => t.id === id) : undefined);

  // (i) the favourite last applied here, still on the shelf and still what its destination shows.
  if (lastApplied) {
    const fav = useFavientsStore.getState().favients.find((f) => f.id === lastApplied!.favId);
    const shown = gradientAt(byId(lastApplied.targetId)?.editsParam);
    if (fav && shown && favientSig(shown) === favientSig(fav.config)) {
      return { config: fav.config, name: fav.name, favId: fav.id };
    }
  }
  // (ii) the Destination's gradient — the panel falls back to its first host target the same way.
  const dest = byId(useFavientsStore.getState().selectedTargetId) ?? targets[0];
  const destConfig = gradientAt(dest?.editsParam);
  if (dest && destConfig) return { config: destConfig, name: `${sceneName()} · ${dest.label}` };
  // (iii) gradient 1, read straight from its param.
  const g1 = gradientAt({ featureId: 'coloring', paramKey: 'gradient' });
  return g1 ? { config: g1, name: `${sceneName()} · Gradient 1` } : null;
};

/** Trips this tab made. The newest is the one whose scene sits in the stash. */
const trips = new Set<string>();
let newestTrip: string | null = null;
let answering = false;

const answerForThisTab = (): void => {
  if (answering) return;
  answering = true;
  answerExplorerTrips(
    (trip) => trips.has(trip),
    // The Explorer closed itself and the user is back in this tab: the safety net is not
    // needed, so give its bytes back to the shared budget. Only for the NEWEST trip — an older
    // Explorer tab returning must not take the net out from under a newer one.
    (trip) => { if (trip === newestTrip) clearSceneStash('gx'); },
  );
};

/** The Explorer button (setFavientStudioAction in registerFeatures.ts). Synchronous all the way
 *  to `window.open`, which a popup blocker allows only inside the click. */
export const openExplorerFromGmt = (): void => {
  const stashed = stashLiveScene('gx');
  if (!stashed) {
    // Storage full or blocked. The trip still happens and this tab keeps the scene; only the
    // fallback restore (a "Back to GMT" that cannot close the Explorer's tab) has nothing to use.
    showToast('Could not keep a backup of the scene for the trip — this tab still has it.', 'info', 5000);
  }
  const trip = newTripId();
  trips.add(trip);
  newestTrip = trip;
  answerForThisTab();
  let incoming: ExplorerIncoming | null = null;
  try {
    incoming = resolveGradientForExplorer();
  } catch (err) {
    console.warn('[app-gmt] could not read a gradient for the Explorer', err);
  }
  openGradientExplorer({ incoming, trip });
};
