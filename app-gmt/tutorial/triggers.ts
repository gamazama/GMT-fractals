/**
 * GMT-specific trigger kinds. The engine ships generic kinds (value, bool,
 * delta, compound, or, keypress, keypress_all, delay, action, manual);
 * `tab` and `mode` are UI-coupled to GMT's right-dock + cameraMode.
 *
 * Call `registerGmtTriggers()` once at boot, before lessons start.
 */

import { tutorTriggers } from '../../engine/plugins/Tutorial';

interface TabSpec { kind: 'tab'; tabId: string; }
interface ModeSpec { kind: 'mode'; param: 'cameraMode'; value: string; }

export function registerGmtTriggers(): void {
    tutorTriggers.register<TabSpec>({
        kind: 'tab',
        setup: (spec, ctx) => ({
            evaluate: (s) => s.activeRightTab === spec.tabId,
        }),
    });

    tutorTriggers.register<ModeSpec>({
        kind: 'mode',
        setup: (spec, ctx) => ({
            evaluate: (s) => s[spec.param] === spec.value,
        }),
    });
}
