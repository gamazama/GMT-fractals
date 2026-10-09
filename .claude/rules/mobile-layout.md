---
paths:
  - "hooks/useMobileLayout.ts"
  - "engine/components/LandscapeGate.tsx"
  - "engine/components/MobileScrollIntro.tsx"
  - "engine/components/MobileViewportShell.tsx"
  - "engine/HardwareDetection.ts"
  - "palette/store/favientsPanelPersist.ts"
---

# Mobile layout

Read first: JSDoc on `hooks/useMobileLayout.ts` and
`engine/components/{Landscape,Mobile}*` — address-bar collapse and the layout
primitives. `engine/HardwareDetection.ts` owns the detection primitive itself.

Decisions: ADRs 0038-0039.

## Watch out

- **The 768px / `(pointer: coarse)` breakpoint is NOT single-sourced yet.**
  `isMobileViewport()` in `engine/HardwareDetection.ts` is the intended home; eight inline
  re-implementations survive (listed in its JSDoc). The one that bites hardest is the
  **uiSlice slice initializer**, which seeds `isDeviceMobile` at store construction:
  changing the threshold in `HardwareDetection.ts` alone leaves the boot value on the old
  threshold until the first resize event.
- **Asymmetric gating is load-bearing (ADR-0038).** `LandscapeGate`,
  `MobileScrollIntro` and `MobileViewportShell` consume raw `isDeviceMobile`;
  joysticks / mobile menu / hidden chrome consume preference-aware `isMobile`.
  Collapsing the two silently breaks Force-Mobile-on-desktop (a `100svh` banner
  deadlocks a desktop body that is `overflow: hidden`).
- `detectHardwareProfile(gl)` is NOT cached and not once-per-session: three call sites, one
  of them a user-clicked "reset to detected" button in `HardwarePreferences`. The
  FBO-allocating path only runs when a GL context is passed, and no in-tree caller passes one.
- `MobileViewportShell` has a fixed-position stacking trap — a fixed ancestor
  creates a containing block that in-flow z-index can't escape. See the layers rule.
- Mobile float-format support differs from desktop. The `?diag` query param is the
  workflow for diagnosing device-specific render failures.

## Guards

`smoke:viewport` and `smoke:viewport-fixed` boot at a desktop size and assert nothing
about mobile detection. What does:

```
npm run smoke:mobile-layout   # gradient-explorer.html in a Pixel 5 context and a desktop one:
                              # boot seed of isDeviceMobile/isPortrait, the sticky-vs-fixed shell
                              # branch, and the resize listener across 768px / orientation
npm run smoke:ge-floor        # the Gradient Explorer in a Pixel 5 context on the PHONE FLOOR: roundRect deleted,
                              # the wall must still paint, and MobileViewportShell must carry BOTH heights
                              # (h-screen class + inline 100dvh)
npm run typecheck
npm run smoke:boot
```

Beyond those, coverage is manual: a device, or a mobile-emulated Playwright context.
