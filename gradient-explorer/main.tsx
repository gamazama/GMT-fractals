/**
 * GMT Gradient Explorer — entry point. Mirrors the demo (index.tsx) boot: the simplest
 * engine shell (no fractal engine). Side-effect feature registration first, then
 * registerUI() + the UI plugins, then the panel manifest, then mount.
 */

// Side-effect: register palette features + custom-UI components BEFORE the store
// is constructed (the registries freeze on first store access).
import './registerFeatures';

import React from 'react';
import ReactDOM from 'react-dom/client';
import GradientExplorerApp from './GradientExplorerApp';
import { wireGradientExplorer } from './setup';

import { registerUI } from '../engine/features/ui';
import { installTopBar, topbar } from '../engine/plugins/TopBar';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installMenu } from '../engine/plugins/Menu';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { installHelp } from '../engine/plugins/Help';
import { installHud } from '../engine/plugins/Hud';
import { installModulation } from '../engine/animation/modulationTick';
import { installModulationUI } from '../engine/components/modulation';
import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
import { BackToGmtButton, FavientsTopBarButton } from './TopBarButtons';

// Boots the engine's UI registry (AutoFeaturePanel + built-in widgets).
registerUI();

// UI plugins. installMenu() before installHelp()/installSceneIO() (both register
// dropdowns into the menu host); installTopBar() before plugins that slot into the
// topbar.
installTopBar();
installShortcuts();
installUndo();
installMenu();
// File menu: Save / Load the palette config. The generator/picker dials live in
// DDFS feature slices, so the engine-standard getPreset()/loadScene() round-trips
// them — no canvas (no fractal viewport here) means JSON download, no PNG export.
installSceneIO({ fileExtension: 'json' });
installHelp();
installHud();

// Left-slot topbar affordances: back to the GMT studio + a Favients shelf toggle.
// order 0 is the default ProjectName; place Back leftmost, Favients just after.
topbar.register({ id: 'back-to-gmt', slot: 'left', order: -10, component: BackToGmtButton });
topbar.register({ id: 'gx-favients', slot: 'left', order: 21, component: FavientsTopBarButton });

// Animation glue — param sliders show the keyframe diamond and key onto the
// timeline (TimelineHost is mounted in GradientExplorerApp). installModulation
// powers slider live-value indicators; the UI registers the LFO widget.
installModulation();
installModulationUI();

installPwaUpdate();

// Panel manifest + dock the Quality-Filters panel (touches the store → freeze).
wireGradientExplorer();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GradientExplorerApp />
  </React.StrictMode>,
);
