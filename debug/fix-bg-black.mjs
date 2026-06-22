/**
 * One-off: theme the solid `bg-black` (no alpha) chrome that earlier passes
 * missed — popovers/dropdowns/sections/tracks that stayed pure black in Light.
 * Functional pure-black (viewport/canvas backdrops, splashes, spectrum) is
 * intentionally NOT listed, so it stays black. Matches `bg-black` only when not
 * followed by `/` (alpha backdrops are left untouched).
 *   node debug/fix-bg-black.mjs        (dry run)
 *   node debug/fix-bg-black.mjs --apply
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();

// file → target surface token for its solid bg-black
const MAP = {
    'components/layout/Dock.tsx': 'bg-surface-dock',
    'components/graph/GraphSidebar.tsx': 'bg-surface',
    'components/graph/GraphToolbar.tsx': 'bg-surface-raised',
    'engine/plugins/viewport/FixedResolutionControls.tsx': 'bg-surface',
    'components/panels/engine/EngineFeatureRow.tsx': 'bg-surface-raised',
    'components/StateLibraryPanel.tsx': 'bg-surface',
    'components/timeline/TimelineToolbar.tsx': 'bg-surface',
    'components/timeline/TimeNavigator.tsx': 'bg-surface-sunken',
    'components/SmallColorPicker.tsx': 'bg-surface',
    'engine/plugins/topbar/BucketRenderPanel.tsx': 'bg-surface-sunken',
    'engine/components/MobileScrollIntro.tsx': 'bg-surface',
    'engine/components/LandscapeGate.tsx': 'bg-surface',
    'engine/features/audioMod/AudioPanel.tsx': 'bg-surface-sunken',
};

const RE = /\bbg-black\b(?!\/)/g;
for (const [rel, token] of Object.entries(MAP)) {
    const file = join(ROOT, rel);
    const src = readFileSync(file, 'utf8');
    let n = 0;
    const out = src.replace(RE, () => { n++; return token; });
    console.log(`${n === 0 ? 'MISS' : 'ok  '} ${rel.padEnd(52)} ${n} × bg-black → ${token}`);
    if (APPLY && out !== src) writeFileSync(file, out, 'utf8');
}
