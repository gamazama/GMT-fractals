# engine-gmt/gallery

Online curated gallery plugin for GMT.
- **Phase 1** (read-only, Supabase + Cloudflare R2) shipped 2026-05-04.
- **Phase 2A** (admin-gated submissions via Edge Function) shipped 2026-05-04.

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
| `loadGalleryScene.ts` | Click-to-load: read GMF from the row's `gmf_data` column (Phase 2 path), or extract `FractalData` from iTXt for legacy Phase 1 rows, parse GMF, register the embedded formula def if needed, hand the preset to `engineStore.loadScene`. |
| `submitGalleryItem.ts` | Phase 2 submission path: capture worker frame as JPEG, serialize preset to GMF, POST multipart to `submit-gallery-item` Edge Function. Reads admin token from `localStorage`. |
| `SubmitGalleryModal.tsx` | Form UI for submissions — title, slug (auto-derived), description, formula, tags, author, featured. ESC / click-outside to close. |
| `index.ts` | Public surface. Exports `installGallery`, `GalleryOverlay`, `SubmitGalleryOverlay`, `useGalleryStore`, token helpers, types. |

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
import { GalleryOverlay, SubmitGalleryOverlay } from '../engine-gmt/gallery';
// ... mounted near <HelpOverlay />:
<GalleryOverlay />
<SubmitGalleryOverlay />
```

## Admin token (Phase 2A)

The "Submit to Gallery" menu entry hides itself unless `localStorage.gmt_submit_token` is set. To enable it, run in DevTools:

```js
localStorage.setItem('gmt_submit_token', '<the SUBMIT_TOKEN secret>')
```

The token must match the `SUBMIT_TOKEN` secret set on the `submit-gallery-item` Edge Function. Phase 2B will replace this with Supabase Auth JWT verification.

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
