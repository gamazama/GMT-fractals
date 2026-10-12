/**
 * deep-zoom/help/ids.ts - the help topic ids, as string constants and nothing else.
 *
 * Main-bundle code (the Help install, the `/` key in deep-zoom/hotkeys.ts, the What's New row)
 * names a topic through here WITHOUT importing ./topics.ts, which is the lazy chunk: an import of
 * that file from the main bundle would pull every topic's text into it (data/help/registry.ts
 * says why that matters). Keep this file free of any other import.
 *
 * `npm run check:deep-zoom-help` holds every id here against the topics that are loaded.
 */
export const DZ_TOPIC = {
    flying: 'dz.flying',
    depth: 'dz.depth',
    places: 'dz.places',
    routes: 'dz.routes',
    rendering: 'dz.rendering',
    formulas: 'dz.formulas',
    look: 'dz.look',
    shortcuts: 'dz.shortcuts',
    whatsNew: 'dz.whats-new',
} as const;
