/**
 * GMT Gradient Explorer — side-effect feature/component registration.
 *
 * Imported at the very top of main.tsx, BEFORE anything touches the engine store
 * (createFeatureSlice freezes the registries on first store access). registerPaletteUI()
 * registers the shared palette features + custom-UI components; none of them import
 * useEngineStore at module scope, so registering here (pre-freeze) is safe.
 */

import { registerPaletteUI } from '../palette/registerPaletteUI';
import { setFavientSelectMode } from '../palette/core/favientTargets';
import { registerGradientTargets } from './gradientTargets';

registerPaletteUI();

// The "select → reveal → place" drop targets — every gradient destination (Generator
// slots, Stops, Favients, Fullscreen, Export) registered into the engine (c) send-target
// registry. The dropbox topology (finals + derived intermediate tab steps) is computed
// from this set, not hardcoded. Side-effect, pre-store-freeze safe (apply reads getState
// at click/drop time; getRect queries the DOM at paint time).
registerGradientTargets();

// N7: the Favients header "Palettes" (picker) button is host-gated OFF here — leaving
// the browse action unset hides it (the button is gated on `browse &&` in FavientsPanel).
// In the Explorer the Picker is already a top-level mode tab, so the panel shortcut is
// redundant; app-gmt (where Favients floats and the Picker isn't a tab) keeps it by
// registering its own browse action.

// This host owns the select→reveal→place dock (GradientDropLayer), so the Favients panel
// flips a swatch CLICK to SELECT (→ enlarge → dock) and hides its "Destination" dropdown.
// The dock supersedes the legacy "Applying to ▾" gen-a/gen-b targets, so they're dropped
// here (the dock already exposes Generator · A / B as drop destinations).
setFavientSelectMode(true);
