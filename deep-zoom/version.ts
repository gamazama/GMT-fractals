/**
 * deep-zoom/version.ts - this app's OWN version and name. Not the repository's `package.json`
 * version, which is the engine build and is GMT's number.
 *
 * What reads it: the What's New row of the "?" menu (deep-zoom/help/installDeepZoomHelp.tsx),
 * whose dot is lit while the version stored under `gmt.deepZoom.whatsNew.seenVersion` is not this
 * one. So a CHANGE OF THIS STRING relights the dot for everyone: change it together with a new
 * entry at the top of the What's New topic in deep-zoom/help/topics.ts, and for no other reason.
 *
 * The number is a place to start counting from (the app is not released), nothing more.
 */
export const DZ_VERSION = '0.1.0';

/** The name the app goes by on screen (the page's title and its loading line say the same). */
export const DZ_APP_NAME = 'Deep Zoom';
