# ADR-0039: Address-bar collapse via paired `100svh` + `100dvh`

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine/components/MobileScrollIntro.tsx`,
`engine/components/MobileViewportShell.tsx`

> **Update 2026-06-17 (overscroll/off-edge hardening; decision unchanged):**
> The paired `100svh` + `100dvh` collapse mechanism is unchanged. It was
> hardened against a side effect: because the body must stay scrollable
> for the collapse to fire, touches the canvas didn't consume could drag
> the page off the bottom/sides, and the page could rest half-scrolled.
> Fixes (host HTML + the two components):
> - `overflow-x: clip` on `html`/`body` (mobile). **`clip`, not `hidden`** —
>   `hidden` forces `overflow-y` to `auto`, making the body its own scroll
>   container instead of the documentElement, which BREAKS the collapse
>   (iOS ties address-bar retraction to the documentElement scroll). `clip`
>   doesn't create a scroll container, so vertical scroll still propagates.
> - `overscroll-behavior: none` on both axes (was `-y` only) — kills
>   rubber-band bounce off any edge.
> - `scroll-snap-type: y mandatory` on `html` (disabled on desktop where
>   the body is `overflow: hidden`) plus `scroll-snap-align: start` on both
>   the intro splash and the sticky shell. The body's only scroll now has
>   exactly two rest states — splash or fullscreen shell — so it can't rest
>   half-scrolled or drift past the shell.
> An inner (nested) scroller CANNOT drive the collapse on iOS Safari (no
> implicit-root-scroller support; Android Chrome M73+ has it under strict
> criteria). The document-level swipe-past-intro is the only cross-platform
> trigger, which is why the body stays scrollable rather than being locked.

## Context

iOS Safari and Android Chrome retract the URL bar after the user scrolls
past a threshold of the page body. GMT wants:

- The canvas to fill the screen after that retraction.
- No black gap when the mobile keyboard opens/closes.
- No per-app glue code — every sibling app should adopt the same
  mechanism.

Alternatives considered:

- **JavaScript `visualViewport` listener** that resizes the shell on
  every viewport change. Works, but every app must wire it; brittle on
  iOS where `visualViewport.height` lags actual layout.
- **`-webkit-fill-available`** trick. Worked on older Safari, broken on
  modern iOS (returns the LARGE viewport, so the canvas overflows under
  the URL bar at initial load).
- **Pair `100svh` + `100dvh`** (chosen path).

## Decision

Ship two primitives that compose:

- `MobileScrollIntro` (`engine/components/MobileScrollIntro.tsx`) — a
  banner with `height: 100svh` (small viewport — the height WITH the
  address bar visible). Adds pre-shell scroll capacity.
- `MobileViewportShell` (`engine/components/MobileViewportShell.tsx`) —
  the actual canvas wrapper, with `sticky top-0 h-[100dvh]` (dynamic
  viewport — tracks the live viewport size).

Combined height = `100svh + 100dvh`. This always exceeds the visible
viewport by at least the address-bar height, so the body has scroll
capacity. Once the user swipes past the intro, the sticky shell locks.
`dvh` (not `vh`) ensures the shell also re-fits when the keyboard
opens/closes.

## Consequences

- Apps MUST render `MobileScrollIntro` BEFORE `MobileViewportShell` in
  DOM order. Reordering breaks the mechanism (the sticky element has
  nothing to "scroll past").
- Two CSS height keywords (`svh` and `dvh`) — both required by the CSS
  Values 4 viewport-units spec. Mobile browsers from 2022+ support
  both; older browsers fall back imperfectly (use `vh`), but the user
  base is mobile-recent.
- The pair is consumed only on real device-mobile (`isDeviceMobile`,
  not `isMobile` — see ADR-0038). Force Mobile UI on a desktop browser
  does NOT mount the intro/shell pair.
- Adding a third "container" between intro and shell would break the
  contract — scroll-trigger relies on intro being IMMEDIATELY ahead of
  shell.
