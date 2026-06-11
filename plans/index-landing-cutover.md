# Index / Landing arrangement + dev→prod cutover prep

> Status: **DRAFT — for review.** No structural changes made yet. The urgent
> service-worker bug is already fixed separately (commit `f006d27`); this
> plan is about arranging the entry pages so the bug *class* is gone and the
> cutover to `app.gmt-fractals.com` is clean.
> Author: pairing session, 2026-06-01.

---

## 1. The problem this solves

Two unrelated things both get called "the landing page":

- **(A) the dev *launcher*** — `dev/index.html`, the "GMT — dev preview" menu
  listing the 6 apps. This is what the service worker was wrongly serving for
  `app-gmt.html?gallery=<slug>`.
- **(B) the *marketing* site** — the Astro repo (`landing/`) served at
  `gmt-fractals.com` via Cloudflare. Separate host, separate repo, **not**
  involved in the bug. Leave it alone except for the one APP_URL swap (§5).

Two root causes, both pointing at the same place:

1. **The SW `navigateFallback` target is a launcher, not the app.** Any
   navigation the precache can't match (query-string deep-link, typo, cold
   cache) falls back to `index.html` = the launcher menu. Commit `f006d27`
   stopped the *query-string* case (`ignoreURLParametersMatching` + a fixed
   denylist), but the fallback still *points at a launcher*, so the class of
   "unknown URL → launcher menu" remains latent.
2. **dev and stable disagree about what lives at the root**, and the cutover
   would ship dev's answer:

   | | root `index.html` is… | SW `navigateFallbackDenylist` |
   |---|---|---|
   | **stable** (today's prod) | the **app** (React entry) | *missing* |
   | **dev** (about to overwrite it) | the **launcher menu** | now fixed (`f006d27`) |

   Promote dev as-is and `app.gmt-fractals.com/` flips from "the app" to "a
   menu" — a surprising regression for production users, and it keeps the SW
   fallback pointed at a menu.

**Goal:** make the GMT app the canonical root in the app build, demote the
launcher to its own page, and point the SW fallback at the app. Then the
launcher can never be served in place of the app, and the cutover is a
no-surprise (prod root stays "the app", matching stable today).

---

## 2. Current topology (from the deploy/host map)

| URL | Serves today | Repo / branch | Host |
|---|---|---|---|
| `gmt-fractals.com` (apex) | Astro marketing site | `landing` / main | Cloudflare Pages |
| `app.gmt-fractals.com` | *(planned)* the app | `GMT-fractals` / main (stable) | GH Pages (custom domain) — **confirm; INPUT_NEEDED.md treats it as a Cloudflare project** |
| `gamazama.github.io/GMT-fractals` | prod app (`index.html` = app) | main (stable build) | GH Pages root |
| `gamazama.github.io/GMT-fractals/dev` | dev launcher + 6 apps | dev branch | GH Pages `/dev/` |

`dev` and `stable` are two working copies of the **same** `gamazama/GMT-fractals`
repo on different branches. `dev/.github/workflows/deploy.yml` already handles
**both** `main`→root and `dev`→`/dev` from one build (`base: './'`).

---

## 3. Recommended arrangement

**`index.html` = the GMT app. Launcher → `launcher.html` (dev-preview only).**
SW `navigateFallback` then resolves to the app, not a menu.

### Concrete changes (app repo, all on the `dev` branch)

1. **Rename** `index.html` → `launcher.html` (the 6-app menu, unchanged content).
2. **New `index.html`** = a copy of `app-gmt.html` (same `<div id="root">` +
   `<script type="module" src="/app-gmt/main.tsx">`). Now `/` loads the app.
3. **Keep `app-gmt.html` as-is** so existing share/gallery links that carry
   `app-gmt.html` in their path keep working — both `/` and `/app-gmt.html`
   serve the same GMT app.
4. **`vite.config.ts` → `rollupOptions.input`**: `main` now points at the app
   `index.html`; add a `launcher: launcher.html` entry; keep `app-gmt`. (Refs:
   [`vite.config.ts:120`](../vite.config.ts#L120).)
5. **SW** ([`vite.config.ts:78`](../vite.config.ts#L78)): `navigateFallback:
   'index.html'` now targets the app — keep it. Keep the `f006d27` hardening
   (`ignoreURLParametersMatching`, widened denylist). Net effect: every
   navigation resolves to the app, which reads its own `?gallery=`/`#s=`.
6. **Launcher discoverability in dev**: the dev app shows nothing pointing at
   the toys anymore. Options: a tiny "dev builds ▸" link in the app shell shown
   only on the `/dev/` path, or just rely on `/dev/launcher.html`. Low stakes.

No change needed to the deep-link *builder* — `Lightbox`/`copyShareLink` use
`window.location.pathname`, so links stay valid whether the user is on `/` or
`/app-gmt.html`.

### Why not the alternatives
- *Keep index = launcher, redirect `/` → app-gmt.html*: redirect + SW interplay
  is exactly the fragile combination we're trying to leave behind.
- *Hash-only deep links*: already mitigated by `f006d27`; doesn't fix the
  root=launcher problem the cutover introduces.
- *Build-time branching of `index.html` per deploy target*: more machinery than
  "app at root everywhere," which is simpler and matches stable.

---

## 4. Migration landmines (independent of §3, fix before/at cutover)

- **Stable's stale `/dev` deploy step.** `stable`'s `deploy.yml` has a second
  step that also publishes to `/dev`, which would clobber the dev-preview
  subfolder on a `main` push. **Resolved automatically if the dev→main merge
  takes dev's `deploy.yml`** (dev's has no such step) — verify the merge does
  not keep stable's version.
- **Stable's missing `navigateFallbackDenylist`.** Moot once dev's
  `vite.config.ts` becomes the prod config via the merge. Flagged so it isn't
  re-introduced.
- **Landing APP_URL still points at dev.** `landing/src/pages/index.astro`
  (~line 286, `TODO(dev→prod promotion)`) points "Launch App"/gallery tiles at
  the dev URL until the `?gallery=` handler is in prod. **Swap to
  `app.gmt-fractals.com` only *after* dev is promoted** (ordering dep below).
- **CORS is already fine** — `backend/.../_shared/cors.ts` already allows
  `app.gmt-fractals.com`.
- **Gradient packs are split across the build + R2.** The picker's `core.*`
  packs ship in the build (tracked; loader path is now base-relative via
  `import.meta.env.BASE_URL`, so it resolves at root *or* subpath). The licensed
  `softology.*` / `cptcity.*` are **gitignored**, so CI never bundles them — they
  live only on R2 at `cdn.gmt-fractals.com/palette/` (**uploaded 2026-06-03**;
  the bucket's live CORS already allows `app.gmt-fractals.com` *and* the
  `gamazama.github.io` Pages origin). **Nothing to do at cutover** unless the
  packs get re-baked — then re-run `backend/upload-palette-r2.mjs` (reads `R2_*`
  from `backend/.env`). Caveat: that scoped S3 token can PUT objects but
  **cannot** edit bucket CORS (`GetBucketCors`/`PutBucketCors` → AccessDenied) —
  any CORS change is a Cloudflare-dashboard / R2-admin-token job.

---

## 4b. Cloudflare security posture (dashboard scan, 2026-06-08)

Cloudflare's automated Security Insights flagged the items below (none are
active breaches — all are hardening suggestions). They're dashboard-only ops, so
they belong with the §5 domain swap (owner-action). Triaged by priority:

**Do at/before cutover:**
- **Enable MFA on the Cloudflare account** (`gighzack@gmail.com`, flagged
  "Users without MFA"). This account controls DNS, R2, and Pages deploys — it's
  the single most valuable credential in the stack. My Profile → Authentication
  → 2FA (TOTP + save recovery codes). *Highest priority, ~2 min.*
- **Fix DMARC on `send.gmt-fractals.com`** (flagged "DMARC Record Error"). This
  is the gallery backend's mail-sending subdomain; a broken record hurts
  deliverability and invites spoofing. Verify SPF + DKIM exist first, then a
  sane `_dmarc.send.gmt-fractals.com` TXT:
  `v=DMARC1; p=quarantine; rua=mailto:gighzack@gmail.com; adkim=s; aspf=s`
- **`cdn.gmt-fractals.com` TLS** — three flags ("Missing TLS Encryption" /
  "Always Use HTTPS" / "HSTS") share one root cause. SSL/TLS → Overview: set
  encryption mode to **Full (Strict)**; Edge Certificates: enable **Always Use
  HTTPS** + **HSTS** (short max-age, no preload to start). This is the R2 CDN
  host already in §4's palette note — verify nothing fetches it over plain
  `http://` before enabling HSTS.

**Worth doing (ties to the open threat-model gaps):**
- **Enable Turnstile** on the gallery submission + feedback forms. Maps directly
  to the known account-farming / `feedback_submissions` spam gaps. Not a cutover
  blocker, but the one "optional" Cloudflare suggestion that addresses a real gap.

**Low priority / optional:**
- **security.txt** — add a static `public/.well-known/security.txt` (contact
  email). Cheap, low impact.
- **Block AI bots / AI Labyrinth** — purely optional and arguably against the
  open-source-friendly stance. Skip unless crawler bandwidth becomes a cost.

---

## 5. Cutover sequence (proposed order)

1. **(this plan, §3)** Land the index=app / launcher restructure on `dev`;
   verify on `gamazama.github.io/GMT-fractals/dev` (§7).
2. Merge `dev` → `main` (brings the app, the `?gallery=` handler, the good
   `deploy.yml`, the SW fix). Confirm the merge keeps **dev's** `deploy.yml`
   and `vite.config.ts`.
3. Push `main` → GH Pages root rebuilds; `gamazama.github.io/GMT-fractals/`
   now serves the new app at root.
4. **Cloudflare domain swap** (INPUT_NEEDED.md steps 2–6): point
   `app.gmt-fractals.com` at the app, attach `gmt-fractals.com` + `www` to the
   Astro landing project. *(Dashboard ops — needs owner.)* While in the
   dashboard, also clear the §4b security-posture items (MFA, DMARC, cdn TLS).
5. **Only now** swap the landing's APP_URL → `https://app.gmt-fractals.com`
   and redeploy the landing. (If done before step 3, gallery tiles 404.)
6. Verify: app at `app.gmt-fractals.com/` and `/?gallery=<slug>`; landing at
   `gmt-fractals.com`; a gallery share link round-trips end to end.

---

## 6. Open decisions (need your call)

1. **Launcher in prod?** Ship `launcher.html` to prod (harmless, unlinked) or
   exclude it from the prod build? Recommend: ship it, leave it unlinked.
2. **Which toys are "prod" vs "dev-only"?** stable ships only app + mesh-export
   (+ toy-fluid). Keep fractal-toy/fluid-toy/demo dev-only?
3. **Host of `app.gmt-fractals.com`** — GH Pages custom domain (needs a `CNAME`
   file in the build) or the Cloudflare `gmt-fractals` project? The map was
   ambiguous; this decides whether we add a `CNAME` to the repo.
4. **Dev launcher discoverability** — add a `/dev`-only "other builds" link, or
   leave `launcher.html` as a known URL?

---

## 7. Verification (the SW only runs in the built app)

The service worker is disabled in `npm run dev` (`devOptions.enabled:false`),
so this can't be tested against the dev server — that's why the share-link /
gallery smokes didn't catch the launcher bug. To verify the restructure:

```
npm run build
npx vite preview --port 4173      # serves dist/ WITH the service worker
```
Then in a browser: load `/`, `/?gallery=<slug>`, `/app-gmt.html?gallery=<slug>`
— all should land in the app (approve the SW update prompt / hard-reload, since
`registerType: 'prompt'`). A first visit installs the SW; the *second* load is
SW-controlled — test both. Optionally add a `preview`-mode smoke later that
drives this, to lock the SW behavior into CI.
```
