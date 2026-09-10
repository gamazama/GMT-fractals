/**
 * useIsPhone — the ONE phone predicate for the v2 shell (Phase F, 2026-09-10).
 *
 * WHY THIS FLAG AND NOT A MEDIA QUERY. `isDeviceMobile` lives in the engine store
 * (`store/slices/uiSlice.ts` seeds it from `(pointer: coarse)` OR `innerWidth < 768`, and
 * `hooks/useMobileLayout.ts` installs a module-level resize listener that keeps it live).
 * Three reasons it is the seam rather than a `matchMedia` of our own:
 *
 *   • it is what the OLD shell used (`gradient-explorer/GradientExplorerApp.tsx`), so the
 *     two shells answer "is this a phone" the same way and Phase G's entry swap cannot
 *     change the answer;
 *   • it flips LIVE on resize, so a rotate or a desktop window drag re-renders the branch
 *     instead of stranding the layout the page happened to boot with;
 *   • `pointer: coarse` catches a touch device that is wider than 768 — a media query on
 *     width alone would hand it the desktop tray and the desktop tool column.
 *
 * It is `isDeviceMobile`, NOT `isMobile`: the latter folds in the user's `uiModePreference`
 * override, and forcing "Mobile UI" in a desktop browser must not mount the dvh shell or
 * the phone's touch-sized hit boxes (`MobileViewportShell` makes the same call, and for the
 * same reason — see its comment).
 *
 * USE IT FOR STRUCTURE ONLY — what is mounted, and where. Pure CSS differences go through
 * Tailwind's `md:` / `max-md:` variants, which are the same 768 px number
 * (`engine/HardwareDetection.ts`, `isMobileViewport`). Two mechanisms for one breakpoint is
 * the price of the store flag not being readable from CSS; keeping structure on one side
 * and paint on the other is what stops them drifting into a third answer.
 *
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import { useMobileLayout } from '../../hooks/useMobileLayout';

export const useIsPhone = (): boolean => useMobileLayout().isDeviceMobile;

export default useIsPhone;
