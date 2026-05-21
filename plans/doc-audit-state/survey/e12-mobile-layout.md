---
subsystem_id: e12-mobile-layout
audited_at: 2026-05-19T21:24:13Z
files:
  - path: hooks/useMobileLayout.ts
    blob_sha: 2cfa06777ebaae51c0fa641292c3e4f1b90be8d9
    lines: 1-71
  - path: engine/components/LandscapeGate.tsx
    blob_sha: 8ed91713fa03f1e3154054c30bc9de56b00e9e40
    lines: 1-28
  - path: engine/components/MobileScrollIntro.tsx
    blob_sha: 48f44de18ab5930b1c8f83c9b04bd53b1c82ea73
    lines: 1-56
  - path: engine/components/MobileViewportShell.tsx
    blob_sha: 8d0820bfd9fcdb0529c29817f5eda5218ca187fd
    lines: 1-53
  - path: components/MobileControls.tsx
    blob_sha: adf02709cd5e0260c0505cfd0f3822d542263673
    lines: 1-169
    note: "GMT-side component, found via Mobile* glob; included for completeness because it is one of the principal mobile-only mounts and is referenced by the existing doc."
---

## Public API surface

- `isMobileSnapshot(): boolean` — non-reactive predicate, reads `uiModePreference` + `isDeviceMobile` from store (`hooks/useMobileLayout.ts:45-48`).
- `useMobileLayout(): { isPortrait, isDeviceMobile, isMobile }` — reactive hook subscribing to three store fields (`hooks/useMobileLayout.ts:66-71`).
- `LandscapeGate: React.FC` — named export, no props (`engine/components/LandscapeGate.tsx:15`).
- `MobileScrollIntro: React.FC<{ title?: string; subtitle?: string }>` — named export, defaults `'GMT'` / `'Swipe up to enter'` (`engine/components/MobileScrollIntro.tsx:22-32`).
- `MobileViewportShell: React.FC<{ children, className? }>` — named export (`engine/components/MobileViewportShell.tsx:24-37`).
- `MobileControls: React.FC` — default export, no props (`components/MobileControls.tsx:115`, `:169`).

Module side-effect: importing `hooks/useMobileLayout.ts` installs a global `window.resize` listener (`hooks/useMobileLayout.ts:25-37`).

## Architecture

- Detection lives in one place: `hooks/useMobileLayout.ts:5-7` defines `detectIsMobileDevice` as `matchMedia('(pointer: coarse)').matches || innerWidth < 768`.
- Orientation defined as `innerHeight > innerWidth` (`hooks/useMobileLayout.ts:9-10`) — width-equal-height counts as landscape (strict `>`).
- A single module-level `resize` listener registered at first import writes `{ isDeviceMobile, isPortrait }` into the engine store, guarded by an inequality check that prevents redundant Zustand notifications (`hooks/useMobileLayout.ts:25-37`).
- Listener is intentionally never removed — comment at `hooks/useMobileLayout.ts:35-36` states it is a module-level singleton for the lifetime of the app.
- Initial store values for `isDeviceMobile` / `isPortrait` are seeded synchronously in the slice initializer (`store/slices/uiSlice.ts:180-183`), then kept current by the hook's listener.
- `uiModePreference: 'auto' | 'mobile' | 'desktop'` (`types/store.ts:140-146`, `types/store.ts:26` per Grep) is a tri-state user preference persisted to `localStorage` under key `'gmt.uiModePreference'` (`store/slices/uiSlice.ts:11`, `:177`, `:275`).
- `resolveIsMobile(pref, isDeviceMobile)` returns `true` for `'mobile'`, `false` for `'desktop'`, else the raw device flag (`hooks/useMobileLayout.ts:12-16`).
- Hook returns three flags so consumers can pick the right one: `isMobile` (preference-aware), `isDeviceMobile` (raw), `isPortrait` (orientation). Roles documented inline (`hooks/useMobileLayout.ts:50-65`).
- `LandscapeGate` short-circuits unless BOTH `isDeviceMobile && isPortrait` — i.e. it intentionally ignores `uiModePreference` so desktop browsers in portrait don't get a "rotate device" prompt (`engine/components/LandscapeGate.tsx:18-19`).
- `LandscapeGate` is a `fixed inset-0 z-[9999] bg-black` overlay with bouncing rotate icon (`engine/components/LandscapeGate.tsx:22-26`).
- `MobileScrollIntro` also gates on `isDeviceMobile` (not `isMobile`), per inline comment because desktop has `overflow:hidden` body and would deadlock (`engine/components/MobileScrollIntro.tsx:33-40`).
- `MobileScrollIntro` is `height: 100svh` — the *small* viewport, sized as if the address bar is visible (`engine/components/MobileScrollIntro.tsx:43-45`). It is meant to render before `MobileViewportShell`.
- The combined-height trick: intro is `100svh` + shell is `100dvh`, total exceeds visible viewport by ≥ address-bar height, giving the body scroll capacity to retract the bar (`engine/components/MobileScrollIntro.tsx:12-16`).
- `MobileViewportShell` switches between `sticky top-0 h-[100dvh] overflow-hidden shadow-2xl` (mobile) and `fixed inset-0 w-full h-full` (desktop) (`engine/components/MobileViewportShell.tsx:44-46`).
- Mobile branch applies `env(safe-area-inset-*)` padding on all four sides (`engine/components/MobileViewportShell.tsx:29-34`).
- Shell gates on `isDeviceMobile` (raw device flag), explicitly comments that forcing mobile UI on a desktop browser keeps the desktop `fixed inset-0` layout (`engine/components/MobileViewportShell.tsx:38-42`).
- `MobileControls` gates on `isMobile` (preference-aware, not the raw device flag) — opposite policy to the shell/intro/gate (`components/MobileControls.tsx:117`, `:127`).
- `MobileControls` mounts an absolute, `pointer-events-none` layer over the viewport with a top-left Fly/Orbit mode pill and bottom-row dual joysticks active only in Fly mode (`components/MobileControls.tsx:134-165`).
- Joysticks dispatch `window` `CustomEvent('joyMove' | 'joyLook', { detail: { x, y } })` for camera consumption (`components/MobileControls.tsx:119-125`).
- `Joystick` tracks per-pointer ownership via `pointerIdRef`, ignoring move/up events from other fingers — enables multi-touch dual-stick play (`components/MobileControls.tsx:44-83`).
- Joystick visual: 144px container, 96px well, 40px nub, clamped to a 30px visual radius; haptic via `navigator.vibrate(10)` on grip / `5` on release (`components/MobileControls.tsx:31-37`, `:49`, `:72`).

## Invariants and gotchas

- The asymmetric gating policy is load-bearing: `MobileControls` uses `isMobile` (preference-aware) so Force-Mobile-on-desktop shows joysticks; `LandscapeGate` / `MobileScrollIntro` / `MobileViewportShell` use `isDeviceMobile` (raw) so the same override does not produce rotate prompts, 100svh banners, or sticky layouts on desktop. Mixing these up will either deadlock the desktop browser (intro) or hide expected mobile UI under forced-mobile testing.
- The resize listener is installed by *importing* `hooks/useMobileLayout.ts` — there is no `installMobile()`. If no module ever imports the hook, the store flags stay frozen at their initial seed (`hooks/useMobileLayout.ts:25-37` vs `store/slices/uiSlice.ts:180-183`).
- The listener never unsubscribes (`hooks/useMobileLayout.ts:35-36`). Acceptable for an SPA; would leak under module hot-replace in tests if the module is re-evaluated.
- `isMobileSnapshot()` reads the store directly without subscribing — safe for `when:` predicates, unsafe inside renders (won't trigger re-render on change) (`hooks/useMobileLayout.ts:39-48`).
- The store inequality guard at `hooks/useMobileLayout.ts:30-32` prevents subscriber storms when resize events don't cross the 768px or orientation thresholds.
- `MobileScrollIntro` must render *before* `MobileViewportShell` in DOM order; the sticky-after-scroll mechanism depends on the intro contributing pre-shell scroll height (`engine/components/MobileScrollIntro.tsx:7-16`).
- `MobileViewportShell` uses `100dvh` (dynamic viewport) and `100svh` on the intro — the doc currently says the shell uses `100vh` (see drift table).
- `Joystick.handleStart` calls `e.stopPropagation()` (`components/MobileControls.tsx:42`) so taps on the joystick well don't bubble to outer pointer handlers; `pointermove` is registered `{ passive: false }` to allow `preventDefault` for scroll cancellation (`components/MobileControls.tsx:75`).
- `MobileControls` inverts y for look (`currentValues.current = { x: dx, y: -dy }` at `:37`) — consumers receive y-up.
- `MobileScrollIntro` and `LandscapeGate` are not auto-mounted by any engine plugin; the app shell must place them (see `app-gmt/AppGmt.tsx:201-215`).
- The `'gmt.uiModePreference'` localStorage key is hardcoded to the `gmt.` namespace even though the slice is engine-shared (`store/slices/uiSlice.ts:11`) — sibling apps inherit the same key.

## Drift from existing doc (dev/docs/engine/17_Mobile_Layout.md)

| Doc claim | Reality | Severity |
|---|---|---|
| `useMobileLayout()` returns `{ isMobile, isPortrait }` (`17:19`) | Returns `{ isPortrait, isDeviceMobile, isMobile }` — three flags (`hooks/useMobileLayout.ts:70`) | break |
| Doc never mentions `MobileScrollIntro` (entire file missing from Quick map at `17:7-15` and from primitives section `17:35-56`) | `MobileScrollIntro` is a real engine component, exported from `engine/components/`, and mounted by `app-gmt/AppGmt.tsx:201` immediately before the shell. Provides the address-bar collapse scroll capacity. | break |
| Shell mobile branch is `sticky top-0 h-[100vh] overflow-hidden shadow-2xl` (`17:42`) | Shell uses `h-[100dvh]` (dynamic viewport), not `100vh` (`engine/components/MobileViewportShell.tsx:45`) | break |
| Sticky trick described as "matches the visual viewport on first paint, then sticks once the body scrolls 1px, allowing the browser to retract the address bar. `100vh` then resolves to the larger post-collapse viewport" (`17:44`) | Actual mechanism is the intro/shell pair: intro `100svh` + shell `100dvh` produces > 100vh of content so the body scrolls; `dvh` (not `vh`) tracks the dynamic viewport so the shell re-fits after the bar collapses or keyboard opens (`engine/components/MobileScrollIntro.tsx:12-16`, `engine/components/MobileViewportShell.tsx:6-13`) | break |
| "`useMobileLayout` hook gates [LandscapeGate] internally" — implies preference-aware (`17:56`) | Hook returns multiple flags; `LandscapeGate` consumes `isDeviceMobile` specifically (raw, not preference-aware) so desktop Force-Mobile does NOT trigger it (`engine/components/LandscapeGate.tsx:18-19`) | minor |
| `isMobileSnapshot()` "returns the same boolean without subscribing" (`17:27`) | Correct in spirit; worth noting it also reads `uiModePreference` so live menu predicates do reflect Force-Mobile (`hooks/useMobileLayout.ts:45-48`) | minor |
| Doc does not mention the gating-policy split (when to use `isMobile` vs `isDeviceMobile`) | The hook's own header comment (`hooks/useMobileLayout.ts:50-65`) and the inline rationale comments in `LandscapeGate`, `MobileScrollIntro`, `MobileViewportShell`, `MobileControls` are load-bearing. Doc currently elides this. | minor |
| Adoption checklist step 1: "Wrap the root in `<MobileViewportShell>`" (`17:148`) | Should be "render `<MobileScrollIntro>` before `<MobileViewportShell>` and wrap the root in the shell" — the address-bar trick depends on both. | break |
| Doc's `safe-area-inset` padding claim (`17:46`) | Confirmed accurate (`engine/components/MobileViewportShell.tsx:29-34`). | none |
| Doc claims listener is module-level singleton and store-backed (`17:11`) | Confirmed accurate (`hooks/useMobileLayout.ts:25-37`). | none |
| Doc covers `mobileMenu` façade / `MobileMenuHost` / topbar `when:` predicates (`17:60-85`, `17:127-137`) | Out of scope for this audit (those files were not in the claim list). | n/a |

Recommendation: **minor-edits + add `MobileScrollIntro` section**. Core architecture is correctly described; the `vh` vs `dvh`/`svh` viewport-unit details and the missing `MobileScrollIntro` primitive are the substantive breaks. Three-flag return shape, gating-policy split, and adoption-checklist ordering can land as the same edit pass.

## Open questions

- `mobileMenu` façade, `MobileMenuHost`, `Menu.tsx`, `TopBar.tsx`, `useAppStartup.ts`, `HardwareDetection.ts`, and the topbar `when:` mechanism are referenced by the existing doc but were outside the claim list. They look like they belong to other subsystem audits (e07-plugins-host? a02-panels-layout?) — confirm before any rewrite of `17_Mobile_Layout.md` does not collide.
- `engine-gmt/topbar.tsx:576-588` defines `UiModePreferenceMenuItem` (System-menu tri-state pill). Doc mentions it (`17:31`) but it lives in `engine-gmt/`, not `engine/` — is the engine doc the correct home, or should it move into an app-gmt doc? (Grep result, not read.)
- `mobileActiveMenu: string | null` on the store (`store/slices/uiSlice.ts:184`, `types/store.ts:154-158`) is mentioned in the doc but not part of this file set; coverage presumably comes from the menu/plugins audit.
- The hook installs the resize listener at module-import time without an HMR guard; behaviour under Vite HMR re-evaluation (duplicate listeners) is not verified here.
- `MobileControls` lives at `components/MobileControls.tsx` (GMT-side), not `engine/components/`. The doc treats it as a GMT app concern (`17:123`), which matches; flagging for the e12 vs GMT-app boundary review.
