/**
 * Gradient Explorer topbar buttons.
 *
 * Three exports — two left-slot affordances unique to the standalone Explorer,
 * plus a replacement for the engine's default right-slot FPS widget:
 *   - BackToGmtButton (slot left) — returns to the main GMT fractal studio
 *     (sibling `app-gmt.html` entry point; relative href works in dev + prod).
 *   - FavientsTopBarButton (slot left) — shows/hides the saved-gradient shelf.
 *     Here the shelf is DOCKED LEFT (not floating like app-gmt), so the toggle
 *     drives the left dock's collapsed state rather than the panel's open flag —
 *     that is what actually hides/reveals the shelf when it's the sole left panel.
 *   - FpsCounterDesktopOnly (slot RIGHT) — main.tsx `topbar.unregister('fps')`s
 *     the engine default and re-registers this in its place. The unregister is
 *     load-bearing: the slot registry keys by id globally, not per slot, so
 *     re-registering the same id would silently replace rather than add. See
 *     `.claude/rules/engine-plugins.md`, which cites this file for that rule.
 */

import React from 'react';
import { FpsCounter } from '../engine/plugins/TopBar';
import { FavientsToggleButton } from '../palette/components/FavientsToggleButton';
import { GmtWordmark } from '../engine-gmt/topbar/GmtWordmark';
import { BackArrowIcon } from '../components/Icons2';

/** FPS readout, desktop-only. The top bar is tight on phones and an FPS number is
 *  noise on a palette tool there, so hide it below the mobile breakpoint (md = 768px,
 *  matching the single-column layout switch). */
export const FpsCounterDesktopOnly: React.FC = () => (
  <div className="hidden md:flex items-center">
    <FpsCounter />
  </div>
);

/** Brand mark + return-to-studio link. The GMT wordmark doubles as the "home"
 *  affordance (clicking a logo to go home is the expected gesture), matching the
 *  logo app-gmt shows in its topbar. An <a> (not a button) so middle-click /
 *  open-in-new-tab work; relative href resolves to the sibling page. */
export const BackToGmtButton: React.FC = () => (
  <a
    href="app-gmt.html"
    title="Back to the GMT fractal studio"
    aria-label="Back to the GMT fractal studio"
    className="group flex items-center gap-1.5 pl-1.5 pr-2 h-7 rounded text-fg-muted hover:bg-line/10 transition-colors no-underline"
  >
    <BackArrowIcon />
    <GmtWordmark className="h-3.5 w-auto opacity-80 group-hover:opacity-100 transition-opacity" />
  </a>
);

/** Toggle the Favients shelf. The shared button is dock-aware (it collapses/expands the
 *  left dock here, where the shelf is docked, via toggleFavientsPanel), so the Explorer
 *  just opts into the desktop-only treatment — on a phone the shelf is a dedicated tab,
 *  making a top-bar toggle redundant. */
export const FavientsTopBarButton: React.FC = () => <FavientsToggleButton desktopOnly />;
