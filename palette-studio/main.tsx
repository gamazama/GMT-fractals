/**
 * Palette Studio — entry point. Mirrors the demo (index.tsx) boot: the simplest
 * engine shell (no fractal engine). Side-effect feature registration first, then
 * registerUI() + the UI plugins, then the panel manifest, then mount.
 */

// Side-effect: register palette features + custom-UI components BEFORE the store
// is constructed (the registries freeze on first store access).
import './registerFeatures';

import React from 'react';
import ReactDOM from 'react-dom/client';
import PaletteStudioApp from './PaletteStudioApp';
import { wirePaletteStudio } from './setup';

import { registerUI } from '../engine/features/ui';
import { installTopBar } from '../engine/plugins/TopBar';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installMenu } from '../engine/plugins/Menu';
import { installHelp } from '../engine/plugins/Help';
import { installHud } from '../engine/plugins/Hud';
import { installModulation } from '../engine/animation/modulationTick';
import { installModulationUI } from '../engine/components/modulation';
import { installPwaUpdate } from '../engine/plugins/PwaUpdate';

// Boots the engine's UI registry (AutoFeaturePanel + built-in widgets).
registerUI();

// UI plugins. installMenu() before installHelp() (Help registers a dropdown into
// the menu host); installTopBar() before plugins that slot into the topbar.
installTopBar();
installShortcuts();
installUndo();
installMenu();
installHelp();
installHud();

// Animation glue — param sliders show the keyframe diamond and key onto the
// timeline (TimelineHost is mounted in PaletteStudioApp). installModulation
// powers slider live-value indicators; the UI registers the LFO widget.
installModulation();
installModulationUI();

installPwaUpdate();

// Panel manifest + dock the Quality-Filters panel (touches the store → freeze).
wirePaletteStudio();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <PaletteStudioApp />
  </React.StrictMode>,
);
