/**
 * app-gmt/registerFeatures — side-effect registration.
 *
 * Imported FIRST in `main.tsx`. Runs feature + formula registration at
 * module-load time so the shared `featureRegistry` is fully populated
 * BEFORE any subsequent import transitively loads `engineStore`
 * (which freezes the registry via `createFeatureSlice`).
 *
 * Mirrors `fluid-toy/registerFeatures.ts` — same pattern, different
 * feature set.
 */

// 26 GMT DDFS features.
import { registerFeatures as registerGmtFeatures } from '../engine-gmt/features/index';
registerGmtFeatures();

// GMT Compile profiles (the "Viewport Quality" switch subsystems + presets) into
// the engine-core Compile system. MUST run before createEngineStore so the
// scalability slice seeds its initial state from the registered default.
// @see docs/adr/0079-compile-system-profile-seam.md
import { registerGmtShaderCompilerProfiles } from '../engine-gmt/types/viewport';
registerGmtShaderCompilerProfiles();

// Palette tools (picker/generator/image) — features + custom-UI components. The
// Picker's "apply" seam (palette/core/gradientSeam) sets the coloring gradient.
import { registerPaletteUI } from '../palette/registerPaletteUI';
registerPaletteUI();

// Favients (the cross-app gradient-favourites shelf) apply targets for app-gmt: a
// favourite click/drop lands on a fractal COLORING layer via the gradient seam. These are
// HOST-group send targets in the shared registry (the panel's "Destination" dropdown lists
// the host group); the apply payload carries the favourite's GradientConfig.
import { setFavientBrowseAction, setFavientStudioAction } from '../palette/core/favientTargets';
import { openGradientExplorer } from '../palette/installFavients';
import { registerSendTarget } from '../store/sendTargetRegistry';
import type { FavientDragPayload } from '../palette/core/favientDnd';
import { applyGradientConfig, applyEnvGradient } from '../palette/core/gradientSeam';
import { usePaletteOverlayStore } from './paletteOverlayStore';
import { useEngineStore } from '../store/engineStore';
import { requestAccordionOpen } from '../components/accordionReveal';

// Reveal a destination's editor: activate its panel tab, then (next frame, once the
// tab's content has mounted) open its accordion section. `section` omitted → the editor
// sits in a flat panel (env gradient in the Shader tab), so the tab switch is enough.
const revealGradientSection = (panel: string, section?: string): void => {
  const setActiveTab = (useEngineStore.getState() as { setActiveTab?: (id: string) => void }).setActiveTab;
  setActiveTab?.(panel);
  if (section) requestAnimationFrame(() => requestAccordionOpen(section));
};

registerSendTarget<FavientDragPayload>({
  id: 'coloring-1', label: 'Coloring · Layer 1', group: 'host',
  apply: (p) => applyGradientConfig(p.config, 1),
  editsParam: { featureId: 'coloring', paramKey: 'gradient' },
  reveal: () => revealGradientSection('Gradient', 'layer1'),
});
registerSendTarget<FavientDragPayload>({
  id: 'coloring-2', label: 'Coloring · Layer 2', group: 'host',
  apply: (p) => applyGradientConfig(p.config, 2),
  editsParam: { featureId: 'coloring', paramKey: 'gradient2' },
  reveal: () => revealGradientSection('Gradient', 'layer2'),
});
registerSendTarget<FavientDragPayload>({
  id: 'env-gradient', label: 'Environment · Sky', group: 'host',
  apply: (p) => applyEnvGradient(p.config),
  editsParam: { featureId: 'materials', paramKey: 'envGradientStops' },
  reveal: () => revealGradientSection('Shader'),
});

// Favients header "Palettes" button → TOGGLE the full-width Palette Picker overlay.
setFavientBrowseAction(() => {
  const s = usePaletteOverlayStore.getState();
  s.setOpen(!s.open);
});

// Favients header studio button → open the standalone GMT Gradient Explorer app (new tab).
setFavientStudioAction(openGradientExplorer);

// One-time import of the legacy saved-gradient library into Favients (no data loss).
import { migrateSavedGradientsToFavients } from './favientsMigration';
migrateSavedGradientsToFavients();

// 42 fractal formulas — self-register into FractalRegistry on module
// load via their `index.ts` barrel.
import '../engine-gmt/formulas/index';

// Type-only: declaration-merges GMT DDFS slices into the root store
// type so verbatim-ported GMT code (Navigation.tsx, etc.) compiles.
import '../engine-gmt/storeTypes';
