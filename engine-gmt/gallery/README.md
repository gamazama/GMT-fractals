# engine-gmt/gallery

Online gallery plugin for GMT. **Phase 2A shipped end-to-end (2026-05-04)**: read-only browse, admin submission, moderation queue, HDR-fidelity round-trip.

Plans: `stable/debug/scratch/40_Online_Gallery_Plan.md` (ADR), `41_Gallery_Implementation_Plan.md` (build spec), `43_Gallery_Implementation_Notes.md` (Phase 1+2A actuals, Phase 2B+ roadmap).

## Files

| File | Role |
|---|---|
| `installGallery.tsx` | Plugin entry. `installGallery()` registers File-menu items: **Browse Online Gallery** (always visible), **Submit to Gallery** + **Gallery Admin** (visible only when `localStorage.gmt_submit_token` is set). Exports `<GalleryOverlay />`, `<SubmitGalleryOverlay />`, `<AdminQueueOverlay />` for app-level mounting. |
| `GalleryPage.tsx` | Full-screen browse overlay (portal to `document.body`, z-index 2000). Featured strip + grid, click-to-load, ESC-to-close. |
| `GalleryTile.tsx` | Single thumbnail card with lazy-loaded JPEG. |
| `GalleryClient.ts` | Supabase anon client + types + `listGallery()` / `getGalleryItem()`. List excludes `gmf_data` column to keep browse responses light; `getGalleryItem` includes everything for click-to-load. |
| `galleryStore.ts` | Standalone Zustand store. Tracks `isOpen` / `isSubmitOpen` / `isAdminOpen`, plus the engine pause snapshot used by `openGallery()`. |
| `useGalleryItems.ts` | Paginated query hook. |
| `loadGalleryScene.ts` | Click-to-load: read GMF from the row's `gmf_data` column, inject `sky_url` into `preset.materials.envMapData` if present, parse + apply via `engineStore.loadScene`. PNG-iTXt fallback for legacy Phase 1 rows. |
| `submitGalleryItem.ts` | Phase 2A submission path: capture worker frame as JPEG, capture env via GPU readback (JPEG for LDR, Radiance .hdr for HDR), strip env from preset, post multipart to `submit-gallery-item`. Reads admin token from `localStorage`. |
| `SubmitGalleryModal.tsx` | Submission form UI — title, slug (auto-derived), description, formula, tags, author, featured. Modal stays open on backdrop clicks; only X / Cancel / Esc close it. |
| `moderateGalleryItem.ts` | Admin client wrapper for the `moderate-gallery-item` Edge Function (list / approve / reject / set-featured / delete). |
| `AdminQueue.tsx` | Full-screen admin overlay. Each row: thumbnail (clicks open full image), status pill, formula + author + tags, inline Approve / Reject / Feature / Delete buttons. Delete prompts for confirmation. |
| `index.ts` | Public surface. Re-exports overlays, store, types, token helpers. |

## Wiring

In `app-gmt/main.tsx`:
```ts
import { installGallery } from '../engine-gmt/gallery';
// after installSceneIO + share-link menu item:
installGallery();
```

In `app-gmt/AppGmt.tsx`:
```tsx
import { GalleryOverlay, SubmitGalleryOverlay, AdminQueueOverlay } from '../engine-gmt/gallery';
// near <HelpOverlay />:
<GalleryOverlay />
<SubmitGalleryOverlay />
<AdminQueueOverlay />
```

## Backend topology

Three Edge Functions in `backend/supabase/functions/`:
- **`submit-gallery-item`** — receives multipart (jpg + optional sky + gmf + metadata), validates heuristically (GMF must contain `<Metadata>` + `<Scene>` blocks, ≤100 KB), uploads images to R2, inserts `pending` row.
- **`moderate-gallery-item`** — list / approve / reject / set-featured / delete. Delete also wipes the corresponding R2 keys.
- The unused `submit-gallery-item` of the toy-fluid era was retired with Fly.io.

R2 layout:
```
gmt-gallery/
  scenes/{slug}.jpg     ← full-resolution display image (≤2K, JPEG q=0.85)
  thumbs/{slug}.jpg     ← same file as scene/ for now (CDN-cached); resize lands in Phase 2C
  skies/{slug}.jpg      ← LDR env map, ≤1024px, JPEG q=0.85
  skies/{slug}.hdr      ← HDR env map, ≤512px, RGBE-encoded Radiance
```

## Admin token (Phase 2A gate)

The Submit + Admin menu entries hide themselves unless `localStorage.gmt_submit_token` is set. To enable on a curator's machine, paste the SUBMIT_TOKEN value (kept locally at `backend/.submit-token`, gitignored) into:

```js
localStorage.setItem('gmt_submit_token', '<43 char token>')
```

Reload. The token must match the `SUBMIT_TOKEN` secret set on the Edge Functions. Phase 2B replaces this with Supabase Auth + JWT verification.

## Build env

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

Both client-safe — Row-Level Security gates anon to `status='approved'` rows. Without these, the overlay mounts but shows "isn't configured."

## Engine pause + capture flow

Browse overlay open → engine paused (so a path-traced render isn't accumulating behind a fully-occluded canvas).
Submit:
1. `captureSnapshot()` (existing engine method) → PNG → re-encode to JPEG @ 0.85, ≤2K
2. `captureEnvMap()` (new) → branches on env texture type:
   - LDR (regular `Texture`): renders to SRGB-target via tonemap shader, JPEG output
   - HDR (`HalfFloatType` / `FloatType` `DataTexture`): renders to FloatType target with no tonemap, RGBE encoder produces Radiance .hdr blob
3. `saveGMFScene(presetWithoutEnv)` → ≤100 KB
4. POST multipart to `submit-gallery-item`

Loader:
1. Fetch row including `gmf_data` + `sky_url`
2. Inject `sky_url` into `preset.materials.envMapData`
3. Apply preset via `engineStore.loadScene` — `WorkerProxy.updateTexture` auto-detects HDR (`.hdr` URL or RGBE magic bytes) and routes to `RGBELoader` server-side; everything else goes to `TextureLoader`

## Known limitations / future work

- HDR sky size: current cap is 512px max-edge raw RGBE = up to ~1 MB. RLE compression would halve it; a Phase 2C task.
- Thumbnails are the same JPEG as the full scene (no server-side resize). Browse pages cache via CDN so it's fast, but storage isn't optimal.
- Submission upserts by slug. Two scenes with the same title produce the same slug and overwrite each other. Phase 2B namespaces by user_id.
- `localStorage` admin token is a coarse gate — fine for solo curation, replaces with Supabase Auth + admin allowlist in Phase 2B.

See plan 43 for the full Phase 2B/2C roadmap.
