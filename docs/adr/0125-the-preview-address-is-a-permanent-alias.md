# ADR-0125: The preview address is a permanent alias of the Gradient Explorer

- **Status:** Accepted
- **Date:** 2026-09-23
- **Relates to:** ADR-0121 (the session a share link overrides); `plans/ge-v2-parity-checklist.md`
  "(b) Swap risks"; `plans/gx-first-release-gaps.md` §2 item 1 (the recommendation this records).
  Code: `gradient-explorer.html`, `gradient-explorer-next.html`, `gradient-explorer/v2/shareUrl.ts`
  (grep `ALIAS_PAGE`, `shareUrlFor`), `palette/store/globalSetStore.ts` (grep `GX_GLOBAL_SOURCE`),
  `vite.config.ts` (the two `gradient-explorer*` inputs). Guard: `npm run test:gx-share` [4].

## Context

Gradient Explorer v2 went online on 2026-09-09 as a preview at `gradient-explorer-next.html`,
beside the first shell at `gradient-explorer.html`. For two weeks every share link it made
(`?g=…`, the gradient encoded in the URL) named the preview page, and so did GX Global's source
link. Those links are in chats, posts and bookmarks, and nothing records how many.

The entry-point swap (merge `79b88b16`) put v2 on `gradient-explorer.html` — the address GMT and
Fluid Toy open — and retired the first shell. The question was what happens to the preview
address: delete it (every link sent during the preview breaks), redirect it (Cloudflare Pages
`_redirects` — one more moving part, and a redirect must carry the query string exactly), or keep
it serving the same app.

## Decision

**Keep `gradient-explorer-next.html` as a byte-for-byte alias of `gradient-explorer.html`**, apart
from a leading comment that says so. Both are Vite inputs, both load
`/gradient-explorer/v2/main.tsx`, and a `?g=` link opens the same gradient on either.

**New links are written on the canonical page.** `shareUrlFor` rewrites a link made while the page
is the alias onto `gradient-explorer(.html)` in the same directory (so the `/dev` preview deploy
keeps its own links), and `GX_GLOBAL_SOURCE.url` names the canonical page. The alias therefore
only ever receives traffic from links made before the swap.

Chosen over a redirect because an identical page cannot drop a query parameter or loop, costs one
extra HTML entry in the build, and needs no hosting configuration.

## Consequences

- **The two files must not drift.** `npm run test:gx-share` [4] fails when the alias differs from
  the canonical page below its comment, and checks that a link made on the alias names the
  canonical page. Edit `gradient-explorer.html` and copy the change across in the same commit.
- **Retire it only when preview-era links no longer matter** — there is no traffic measurement
  today, so that is a judgement, not a date. Retiring it means deleting the file and its Vite
  input; links made since the swap are unaffected.
- A visitor on the alias sees exactly the app, including its title; nothing tells them the address
  is old. That is intended: the link they were given should simply work.
