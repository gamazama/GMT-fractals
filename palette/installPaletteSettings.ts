/**
 * installPaletteSettings — the palette suite's user preferences, registered into the shared
 * `settingsRegistry` so the generic Settings panel can render them.
 *
 * ONE module, mounted by every host that shows the palette suite (both Gradient Explorer
 * shells today), rather than a copy per entry point — the same reason
 * `registerPaletteUI` exists. Idempotent, so a host that calls it twice is harmless.
 *
 * @assumption Engine-core-shaped: imports `store/` and `palette/`, never an app.
 */

import { registerSetting } from '../store/settingsRegistry';
import {
  getCurveFitPref,
  setCurveFitPref,
  subscribeCurveFitPref,
  type CurveFitPref,
} from './store/curveFitPref';

// Names only (the option list is not the place to explain Auto — the description says it).
const CURVE_FIT_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'Always' },
  { value: 'off', label: 'Off' },
] as const;

let registered = false;

export const registerPaletteSettings = (): void => {
  if (registered) return;
  registered = true;

  registerSetting({
    id: 'palette-curve-fit-placement',
    tab: 'Interface',
    section: 'Gradients',
    label: 'Precise curve fitting',
    // The numbers are the measured ones (58% fewer keyframes on the palette library at equal
    // tolerance; ~1 ms per fit vs 0.1). Auto is off on phones because the Curves face re-fits
    // twice per slider frame there.
    description: 'Curves places 58% fewer keyframes for the same accuracy, at about 1 ms per fit instead of 0.1. Auto turns it off on phones.',
    control: { kind: 'enum', options: CURVE_FIT_OPTIONS },
    get: () => getCurveFitPref(),
    set: (v) => setCurveFitPref((v as CurveFitPref) ?? 'auto'),
    subscribe: subscribeCurveFitPref,
    order: 0,
  });
};

export default registerPaletteSettings;
