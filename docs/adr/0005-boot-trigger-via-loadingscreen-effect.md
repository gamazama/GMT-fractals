# ADR-0005: Boot trigger via LoadingScreen effect, not main.tsx setTimeout

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `app-gmt/main.tsx`, `app-gmt/LoadingScreen.tsx`, `hooks/useAppStartup.ts`

> **Update 2026-05-23 (symbol renames; decision unchanged):** `isHydrated` was renamed to `isStartupReady` across the boot chain (the flag's actual semantics are "useAppStartup's mount effect ran" — not "store hydrated", which happens synchronously in `main.tsx`). The unused `_isSceneReady` parameter on `useAppStartup` was removed. The 30s silent timeout in `GmtRendererTickDriver` mentioned under Consequences was replaced with event-driven `WORKER_BOOTED` / `IS_COMPILING:false` subscriptions and a new `WORKER_BOOT_FAILED` error surface. The decision recorded below — boot trigger lives in `LoadingScreen`'s effect, gated by the mount-ready signal from `useAppStartup` — still stands; only names and the failure path changed.

## Context

Worker boot was originally chained behind a top-level
`setTimeout(..., 100)` in `main.tsx`. Hardware detection and mobile
auto-pick later moved into `useAppStartup`'s mount effect, but the
actual boot still needed to fire AFTER those completed. A timer
race was the symptom; the cure was an effect-driven trigger.

## Decision

Move the boot trigger into `LoadingScreen`'s `[isHydrated]` effect
(`app-gmt/LoadingScreen.tsx:155`). The timeout becomes a 50 ms yield
inside `bootEngine`, not a top-level delay. `isHydrated` (set at
`useAppStartup.ts:160`) is the producer; the effect is the consumer;
`hasBootedRef` is the latch.

## Consequences

- Three near-identically named "ready" flags (`isHydrated`, `isReady`,
  `_isSceneReady`) coexist with subtly different semantics — see
  boot-shell module doc.
- Boot is now double-guarded against double-fire, but the 30 s silent
  timeout in `GmtRendererTickDriver` means a boot failure has no UI
  surface (the splash freezes).
- `app-gmt/README.md`'s "step 7 setTimeout" framing is now wrong and
  is the canonical drift to fix.
