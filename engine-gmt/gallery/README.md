# engine-gmt/gallery

Online curated gallery plugin for GMT. Phase 1 (read-only, Supabase + Cloudflare R2) shipped 2026-05-04.

Plans: `stable/debug/scratch/40_Online_Gallery_Plan.md` (ADR), `41_Gallery_Implementation_Plan.md` (build spec), `43_Gallery_Implementation_Notes.md` (Phase 1 actuals + Phase 2 plan).

## Files

| File | Role |
|---|---|
| `installGallery.tsx` | Plugin entry. `installGallery()` registers a "Browse Online Gallery" item in the File menu (engine/plugins/SceneIO's menu). Exports `<GalleryOverlay />` for app-level mounting. |
| `GalleryPage.tsx` | The full-screen overlay (rendered via portal to `document.body`, z-index 2000). Featured strip + grid, click-to-load, ESC-to-close. |
| `GalleryTile.tsx` | Single thumbnail card with lazy-loaded JPEG. |
| `GalleryClient.ts` | Supabase client + types + `listGallery()` / `getGalleryItem()`. Lazy-creates the client; safe to import in builds without env vars (`galleryEnabled` exports false). |
| `galleryStore.ts` | Standalone Zustand store: `isOpen`, `filter`, `prevPaused`. `openGallery()` snapshots `engineStore.isPaused` and sets it true; `closeGallery()` restores it. |
| `useGalleryItems.ts` | Paginated query hook with stable JSON-stringified deps. |
| `loadGalleryScene.ts` | Click-to-load: fetch the canonical PNG, extract `FractalData` from iTXt, parse GMF, register the embedded formula def if needed, hand the preset to `engineStore.loadScene`. |
| `index.ts` | Public surface. Exports `installGallery`, `GalleryOverlay`, `useGalleryStore`, types. |

## Wiring

Two lines in `app-gmt/`:

```ts
// main.tsx
import { installGallery } from '../engine-gmt/gallery';
// ... after installSceneIO and the share-link menu item:
installGallery();
```

```tsx
// AppGmt.tsx
import { GalleryOverlay } from '../engine-gmt/gallery';
// ... mounted near <HelpOverlay />:
<GalleryOverlay />
```

## Environment

Two Vite vars at build time:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

Both are public-safe — Row-Level Security in Supabase enforces that anon callers can only `select` rows where `status = 'approved'`. Without these vars set, the overlay still mounts but shows "Gallery isn't configured for this build."

## State machine

```
                openGallery()              closeGallery() / Esc
       ┌──────────────────────┐      ┌─────────────────────────────┐
       │                      ▼      ▼                             │
[engine running]         [overlay open, engine paused]    [engine resumes if it was running before]
       ▲                              │
       │                              │ click tile
       │                              ▼
       │                       [load scene → close overlay]
       │                              │
       └──────────────────────────────┘
```

Engine pause is intentional: a typical path-traced GMT render burns serious GPU at 0.5–5 fps. No reason to keep accumulating samples behind the overlay.

## Phase 2 evolution

Plan 43 captures the next round: switch image storage from full PNG to JPG, store GMF text separately (inline DB column), validate non-GMT submissions server-side, add an `Author` field to the GMF format, and add a "Submit to Gallery" client flow that becomes the authoring path for ALL gallery entries (including admin-curated). The seeder script becomes a one-step-removed admin tool.

Phase 1 is a working read-only viewer for whatever the seeder writes. Phase 2 is where users start contributing.
