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

const CURVE_FIT_OPTIONS = [
  { value: 'auto', label: 'Auto (off on phones)' },
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
    description:
      'Place curve keyframes by asking whether one curve can cover a span, instead of measuring against a straight line. ' +
      'Fewer keyframes for the same accuracy — 58% fewer on the palette library at equal tolerance — and it holds that ' +
      'tolerance on the curve it stores rather than on a straight line. Costs about 1 ms per fit instead of 0.1. ' +
      'Off on phones by default, where the Curves face re-fits twice per slider frame.',
    control: { kind: 'enum', options: CURVE_FIT_OPTIONS },
    get: () => getCurveFitPref(),
    set: (v) => setCurveFitPref((v as CurveFitPref) ?? 'auto'),
    subscribe: subscribeCurveFitPref,
    order: 0,
  });
};

export default registerPaletteSettings;
