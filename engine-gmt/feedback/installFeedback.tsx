import React from 'react';
import type { MenuItem } from '../../engine/plugins/Menu';
import type { PanelDefinition } from '../../engine/PanelManifest';
import { componentRegistry } from '../../components/registry/ComponentRegistry';
import { useEngineStore } from '../../store/engineStore';
import { FeedbackPanel } from './FeedbackPanel';
import { MailIcon } from '../../components/Icons2';

// Feedback is a dockable panel ('Feedback' in the panel manifest), opened on
// demand from the Help menu. No singleton/overlay — the panel renders through
// the dock/float system like any other panel.

/** Open the Feedback panel, seeding a sensible floating size/position the first
 *  time (the panel manifest can't carry float geometry). Subsequent opens keep
 *  whatever size/position the user left it at. */
export const openFeedback = () => {
    const s = useEngineStore.getState();
    const panel = s.panels['Feedback'];
    if (panel) {
        if (!panel.floatPos) {
            s.setFloatPosition(
                'Feedback',
                Math.max(20, Math.round(window.innerWidth / 2 - 220)),
                Math.max(20, Math.round(window.innerHeight / 2 - 290)),
            );
        }
        if (!panel.floatSize) s.setFloatSize('Feedback', 440, 580);
    }
    s.togglePanel('Feedback', true);
};

export const closeFeedback = () => useEngineStore.getState().togglePanel('Feedback', false);

// ── Menu icon + item ──────────────────────────────────────────────────

/**
 * MenuItem suitable for `installHelp({ extraItems: [feedbackMenuItem()] })`.
 *
 * The id is fixed so re-registering replaces the prior entry rather than
 * duplicating it. Customize via the small option bag if you want to drop
 * it into a non-Help menu under a different id.
 */
export const feedbackMenuItem = (opts: { id?: string; label?: string } = {}): MenuItem => ({
    id: opts.id ?? 'feedback',
    type: 'button',
    label: opts.label ?? 'Send Feedback',
    icon: <MailIcon />,
    title: 'Report a bug, request a feature, or ask for help',
    onSelect: () => openFeedback(),
});

// ── Cross-app wiring helpers ───────────────────────────────────────────
//
// app-gmt registers 'panel-feedback' as part of its full registerGmtUi()
// pass. Lighter apps (fluid-toy, gradient-explorer) don't want the whole GMT
// panel set, so they call registerFeedbackUI() to register just the Feedback
// panel component, and spread feedbackPanelEntry() into their panel manifest.

/** Manifest entry for the floating Feedback panel — spread into the app's
 *  applyPanelManifest([...]) call. Mirrors the entry baked into GmtPanels. */
export const feedbackPanelEntry = (): PanelDefinition => ({
    id: 'Feedback',
    dock: 'float',
    order: 100,
    component: 'panel-feedback',
    isCore: false,
});

let _feedbackUiRegistered = false;

/** Register the 'panel-feedback' component so feedbackPanelEntry() resolves.
 *  Idempotent — safe to call alongside an app that already registers it via
 *  registerGmtUi(). Call once at app boot (componentRegistry registrations may
 *  run after store construction, so placement among the install*() calls is
 *  flexible). */
export const registerFeedbackUI = () => {
    if (_feedbackUiRegistered) return;
    _feedbackUiRegistered = true;
    componentRegistry.register('panel-feedback', FeedbackPanel);
};
