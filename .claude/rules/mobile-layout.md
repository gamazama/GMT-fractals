---
paths:
  - "hooks/useMobileLayout.ts"
  - "engine/components/**"
---

# Mobile layout

Read first: JSDoc on `hooks/useMobileLayout.ts` and
`engine/components/{Landscape,Mobile}*` — address-bar collapse and the layout
primitives.

Decisions: ADRs 0038-0039.

## Watch out

- `MobileViewportShell` has a fixed-position stacking trap — a fixed ancestor
  creates a containing block that in-flow z-index can't escape. See the layers rule.
- Mobile float-format support differs from desktop. The `?diag` query param is the
  workflow for diagnosing device-specific render failures.

## Guards

```
npm run smoke:viewport
npm run smoke:viewport-fixed
```