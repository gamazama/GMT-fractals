# ADR-0038: Asymmetric mobile-detection gating policy

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `hooks/useMobileLayout.ts`, `engine/components/LandscapeGate.tsx`,
`engine/components/MobileScrollIntro.tsx`, `engine/components/MobileViewportShell.tsx`

## Context

Three categories of mobile-aware UI exist in GMT:

1. **Layout shells** that handle iOS/Android viewport quirks — sticky
   shell, address-bar collapse, safe-area-inset padding.
2. **Rotate-prompt overlays** that ask the user to rotate to landscape.
3. **Preference-aware mobile UI** — joysticks, mobile menu host, hidden
   desktop chrome.

GMT exposes a user preference `uiModePreference: 'auto' | 'mobile' |
'desktop'` so a user on a desktop browser can force "Mobile UI" mode.
This produces conflicting requirements:

- Forcing the layout shells onto a desktop browser DEADLOCKS — the
  desktop body has `overflow: hidden`, so a `100svh` banner has no
  scroll past it.
- Showing "rotate your device" to a desktop window in portrait is
  nonsensical.
- But the joystick controls / mobile menu / hidden chrome SHOULD honour
  the preference — that's why the user toggled it.

## Decision

`useMobileLayout()` returns BOTH a raw `isDeviceMobile` flag AND a
preference-aware `isMobile` flag (computed by `resolveIsMobile`):

- `isMobile`        — preference-aware, for joysticks, mobile menu host,
  hidden desktop chrome.
- `isDeviceMobile`  — raw device flag, for `LandscapeGate`,
  `MobileScrollIntro`, `MobileViewportShell`.
- `isPortrait`      — actual orientation; `LandscapeGate` uses it
  directly.

The header comment at `hooks/useMobileLayout.ts:50-65` is the contract.

## Consequences

- Two flag names with subtly different semantics in the public API;
  consumers must pick correctly per use case.
- Tested under followups q-008 and q-083.
- Future refactors that collapse the two flags would silently break
  Force-Mobile-on-desktop — joysticks would render on desktop while
  shells would deadlock.
- The asymmetry must be preserved across all three layout primitives
  (Gate / Intro / Shell); a regression in any one of them re-introduces
  the deadlock/silliness above.
