/**
 * GX help topic ids — string constants only, so main-bundle code (the Help install, the
 * What's New item, About's link) can name a topic without importing ./topics.ts, which is
 * the lazy chunk (data/help/registry.ts explains why that matters).
 */
export const GX_TOPIC = {
  gettingStarted: 'gx.getting-started',
  wall: 'gx.wall',
  editing: 'gx.editing',
  using: 'gx.using',
  shortcuts: 'gx.shortcuts',
  whatsNew: 'gx.whats-new',
} as const;
