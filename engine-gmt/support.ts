/**
 * @engine-gmt/support — shared "Support GMT" config for the Help menu.
 *
 * Every engine app (app-gmt, fluid-toy, gradient-explorer) surfaces the same
 * Support entry by spreading this into installHelp:
 *
 *   import { gmtSupportConfig } from '../engine-gmt/support';
 *   installHelp({ support: gmtSupportConfig(), ... });
 *
 * Keeping the label/intro/body in one place means support looks identical
 * across apps — change it here and every app follows. The body (donate links
 * + hover photo) lives in components/DonateButton.tsx.
 */
import type { SupportConfig } from '../engine/plugins/Help';
import { DonateButton, SupportReveal } from './components/DonateButton';

export const gmtSupportConfig = (): SupportConfig => ({
    label: 'Support GMT',
    modalTitle: 'Support GMT',
    intro: 'GMT is free & open source. With your support I could spend more time developing it!',
    body: DonateButton,
    // Photo slides up when the "Support GMT" menu item is hovered; the modal
    // body is just the Ko-fi / PayPal buttons.
    hoverReveal: SupportReveal,
    accent: 'pink',
});
