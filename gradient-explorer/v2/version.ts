/**
 * The Gradient Explorer's OWN version — not the monorepo's `package.json` version, which is
 * the engine build (`__APP_VERSION__`, shown beside this in About as the build it came from).
 *
 * GX is a standalone app (owner, 2026-09-12, plans/pre-release-ui-pass.md §1b), so its About
 * box and its What's New dot key off this. Bumping it relights the What's New dot for every
 * GX user (grep `gx.whatsNew.seenVersion`) — bump it together with a new entry at the top of
 * the changelog topic in ./help/topics.ts.
 *
 * PLACEHOLDER (2026-09-13): the owner has not chosen GX's numbering. "2.0.0-preview" says
 * "v2, not released yet" and nothing more — replace it before the entry-point swap.
 */
export const GX_VERSION = '2.0.0-preview.2';

/** Display name, used by About, Support and the feedback context. */
export const GX_APP_NAME = 'Gradient Explorer';
