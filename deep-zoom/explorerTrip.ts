/**
 * deep-zoom/explorerTrip.ts - the My Gradients panel's Explorer button in this app: open the
 * Gradient Explorer in a new tab ON the gradient the surface wears, and be here to come back to.
 *
 * The trip is the one GMT makes (`app-gmt/explorerTrip.ts`, ADR-0126), through the same two
 * pieces of `palette/core/explorerHandoff.ts`:
 *   - THE GRADIENT GOES WITH YOU: `dzColour.gradient`, handed over through the one-shot key. Not
 *     while the surface is Plain (no gradient is on show) and not one flat colour: the Explorer
 *     then opens as it would on its own, as GMT's rule has it.
 *   - THIS TAB ANSWERS FOR ITS TRIPS, so the Explorer's "Back to Deep Zoom" closes its own tab
 *     and lands here, where nothing has changed.
 * Nothing comes back: a gradient made in the Explorer is in My Gradients already (the shared
 * Recent group), one click from this app's Destination.
 *
 * WHAT GMT'S TRIP HAS AND THIS ONE DOES NOT
 *   - No stashed scene. When this tab is gone by the time "Back to Deep Zoom" is pressed (closed,
 *     reloaded), the Explorer's tab goes to `deep-zoom.html` and the app opens as new. The place
 *     is not lost if it was saved; an unsaved view is.
 *   - The favourite last applied is not shown selected in the Explorer: the gradient arrives as
 *     the working gradient, "From Deep Zoom".
 *
 * @assumption The button is pressed inside a click: everything here is synchronous up to
 *   `window.open`, which a popup blocker allows only there. Tried once on the dev server,
 *   2026-10-09; no guard.
 */
import { useEngineStore } from '../store/engineStore';
import { coerceGradientConfig } from '../palette/core/editorConfig';
import { answerExplorerTrips, isFlatGradient, newTripId, type ExplorerIncoming } from '../palette/core/explorerHandoff';
import { openGradientExplorer } from '../palette/installFavients';

/** Trips this tab made. */
const trips = new Set<string>();
let answering = false;

/** What the Explorer should open on, or null (Plain, one flat colour, nothing readable). */
function gradientForExplorer(): ExplorerIncoming | null {
    const colour = useEngineStore.getState().dzColour;
    if (colour.plain) return null;
    const config = coerceGradientConfig(colour.gradient);
    return config && !isFlatGradient(config) ? { config, name: 'Deep Zoom gradient' } : null;
}

/** The Explorer button (`setFavientStudioAction` in registerFeatures.ts). */
export function openExplorerFromDeepZoom(): void {
    const trip = newTripId();
    trips.add(trip);
    if (!answering) {
        answering = true;
        answerExplorerTrips((t) => trips.has(t));
    }
    openGradientExplorer({ incoming: gradientForExplorer(), trip, from: 'deep-zoom' });
}
