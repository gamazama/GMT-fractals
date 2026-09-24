/**
 * installGxHelp — everything the Gradient Explorer's Help menu is, installed once at boot
 * from v2/main.tsx. Every piece goes through an engine seam another app could use the same
 * way; nothing here forks engine code.
 *
 *   • TOPICS — `setHelpTopicsLoader` swaps GMT's fractal-renderer help for GX's own
 *     (./topics.ts, lazy). Getting Started / Keyboard Shortcuts / What's New open GX topics.
 *   • KEYBOARD SHORTCUTS on a phone — hidden (owner, 2026-09-13): installHelp's
 *     `shortcutsWhen`, reading the engine store's `isDeviceMobile` (the same flag
 *     `useIsPhone` reads) live, and the topic left out of the phone's map.
 *   • SUPPORT — `gmtSupportConfig({ appName })`: "Support Gradient Explorer", same body.
 *   • HINTS — none (`hideHints`): no Show Hints row, no `H` shortcut. See the call below.
 *   • FEEDBACK — the shared Send Feedback item, with `configureFeedback` declaring GX's two
 *     attachment options in place of GMT's .gmf scene — the gradient being worked on (JSON
 *     with a link that opens it) or a screenshot (a JPEG data URL in JSON) — one or none,
 *     and GX's name + version in the report's context. The gradient is `available` only once
 *     there is one (the form opens on Nothing before the first pick), and `signIn: false`
 *     keeps "or sign in" out of the form — GX has no account UI.
 *   • WHAT'S NEW — `createWhatsNew` with GX's own topic, version (../version.ts) and seen
 *     key. The key is NOT GMT's `gmt.whatsNew.seenVersion`: the two apps share an origin,
 *     and with one key each app's "seen" write would be "unseen" to the other, so opening
 *     either changelog would relight the other's dot, every time.
 *   • ABOUT — ./AboutGx.tsx, with its attribution read from the loaded catalogue.
 *
 * Order: installMenu() must have run (main.tsx does it first); the Feedback panel entry is
 * applied there too.
 */

import React from 'react';
import { installHelp } from '../../../engine/plugins/Help';
import { menu } from '../../../engine/plugins/Menu';
import { createWhatsNew } from '../../../engine/plugins/WhatsNew';
import { setHelpTopicsLoader } from '../../../data/help/registry';
import { useEngineStore } from '../../../store/engineStore';
import { gmtSupportConfig } from '../../../engine-gmt/support';
import { configureFeedback, feedbackMenuItem, captureViewportJpeg, type FeedbackFile } from '../../../engine-gmt/feedback';
import { useWorkingStore, deriveWorkingNow, autoWorkingName } from '../../../palette/store/workingStore';
import { shareUrlFor } from '../shareUrl';
import { GX_APP_NAME, GX_VERSION } from '../version';
import { GX_TOPIC } from './ids';
import { AboutGxBody } from './AboutGx';

const isPhoneNow = (): boolean => !!(useEngineStore.getState() as { isDeviceMobile?: boolean }).isDeviceMobile;

export const gxWhatsNew = createWhatsNew({
  topicId: GX_TOPIC.whatsNew,
  version: GX_VERSION,
  seenKey: 'gx.whatsNew.seenVersion',
  title: `What changed in ${GX_APP_NAME}`,
});

/** The gradient being worked on, as the one attachment the feedback endpoint takes. */
const captureWorkingGradient = (): FeedbackFile | null => {
  const d = deriveWorkingNow();
  if (!d?.config) return null;
  const s = useWorkingStore.getState();
  const name = s.name ?? autoWorkingName(s.input, s.bakedFrom);
  return {
    filename: 'gradient.json',
    text: JSON.stringify({ kind: 'gx-gradient', app: GX_APP_NAME, version: GX_VERSION, name, link: shareUrlFor(d.config, name), config: d.config }, null, 2),
    context: { attachment_kind: 'gradient' },
  };
};

/**
 * What the user sees, behind the feedback window, as a JPEG inside `screenshot.json` — the
 * endpoint's one attachment is JSON, so the image is a data URL in it (owner, 2026-09-13: "a
 * jpg screenshot is easily under 200kb and can be included in a json"). The feedback window
 * carries `data-feedback-no-capture` (ShellMenu's FeedbackWindow), so it is left out.
 */
const captureScreenshot = async (): Promise<FeedbackFile> => {
  const shot = await captureViewportJpeg((image, meta) =>
    JSON.stringify({ kind: 'gx-screenshot', app: GX_APP_NAME, version: GX_VERSION, url: window.location.href, ...meta, image }),
  );
  return {
    filename: 'screenshot.json',
    text: shot.text,
    preview: shot.dataUrl,
    context: { attachment_kind: 'screenshot', screenshot: `${shot.width}x${shot.height} q${shot.quality} ${Math.round(shot.bytes / 1024)} KB` },
  };
};

let _installed = false;

export const installGxHelp = (): void => {
  if (_installed) return;
  _installed = true;

  setHelpTopicsLoader(() => import('./topics').then((m) => m.gxHelpTopicsFor(isPhoneNow())));

  configureFeedback({
    // One of them, or nothing — the endpoint takes one file (owner: the screenshot "can
    // replace the gradient when selected"). The gradient is built at send; the screenshot
    // the moment it is chosen, so the thumbnail the form shows is the image that is sent.
    attachments: [
      {
        id: 'gradient',
        label: 'Gradient',
        hint: 'The gradient you are working on, with a link that opens it.',
        capture: captureWorkingGradient,
        // Before the first pick there is no gradient to send (the capture returns null), so the
        // form shows it disabled and opens on Nothing rather than promising an attachment.
        available: () => !!deriveWorkingNow()?.config,
      },
      {
        id: 'screenshot',
        label: 'Screenshot',
        hint: 'A picture of the app as it is behind this window.',
        capture: captureScreenshot,
        captureOnSelect: true,
      },
    ],
    context: () => ({ app: GX_APP_NAME, app_version: GX_VERSION }),
    // GX has no account UI, so the form does not say "or sign in".
    signIn: false,
  });

  installHelp({
    // GX has no hints (owner, 2026-09-13): every AutoFeaturePanel / QualityRangePad it mounts
    // passes `hints="tooltip"`, so `store.showHints` gates nothing on screen — no Show Hints row
    // and no `H` shortcut flipping a state nobody sees.
    hideHints: true,
    gettingStartedTopicId: GX_TOPIC.gettingStarted,
    shortcutsTopicId: GX_TOPIC.shortcuts,
    shortcutsWhen: () => !isPhoneNow(),
    support: gmtSupportConfig({ appName: GX_APP_NAME }),
    extraItems: [feedbackMenuItem(), gxWhatsNew.menuItem()],
    about: {
      label: `About ${GX_APP_NAME}`,
      body: () => <AboutGxBody onWhatsNew={gxWhatsNew.open} />,
    },
  });
  // The dot on the Help button (desktop) / the one menu button (phone) until this version's
  // changelog is opened — ShellMenuButton draws it from the registered menu's badge.
  menu.setBadge('help', gxWhatsNew.isUnseen);
};
