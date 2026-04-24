/**
 * @engine/help — the generic Help menu + hint toggle + browser overlay.
 *
 * Ports GMT's HelpMenu dropdown onto the engine's @engine/menu plugin
 * so any app gets:
 *   • Topbar "?" button with dropdown of help-related items
 *   • "Show Hints" toggle (flips store.showHints — consumed by
 *     AutoFeaturePanel to render config.description inline)
 *   • Global "H" keyboard shortcut with the same toggle behaviour
 *   • <HelpOverlay /> mounts the lazy-loaded HelpBrowser when
 *     store.helpWindow.visible
 *
 * Apps opt in by calling installHelp() once at boot and mounting
 * <HelpOverlay /> somewhere in their tree (typically the root component
 * that already has the rest of the UI overlays).
 *
 * Apps can extend the menu with extraItems — e.g. fluid-toy adds a
 * "Toy Overview" entry; a music-app port could add "MIDI primer".
 * Items are regular MenuItem objects, so extensions can contribute
 * buttons, toggles, and full custom components.
 */

import React, { Suspense } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { menu, MenuItem } from './Menu';
import { shortcuts } from './Shortcuts';
import { hud, type HudSlot } from './Hud';

// Lazy-load the HelpBrowser so the ~3400-line topic bundle doesn't land
// in the main chunk. Matches App.tsx's existing pattern.
const HelpBrowser = React.lazy(() => import('../../components/HelpBrowser'));

// ── Icons (local to this plugin; no cross-coupling to the app icon set) ─

const QuestionIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const BookIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const KeyIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12" />
    </svg>
);

// ── Install ────────────────────────────────────────────────────────────

export interface InstallHelpOptions {
    /** Topbar slot for the "?" anchor. Defaults to 'right'. */
    slot?: 'left' | 'center' | 'right';
    /** Order within the slot. Defaults to 40 (right of save/load at 19-21). */
    order?: number;
    /** Extra menu items to merge in (app-specific help entries). */
    extraItems?: MenuItem[];
    /** If true, skip registering the Getting Started / Shortcuts items —
     *  useful for apps without a help-topics bundle. */
    hideTopicLinks?: boolean;
    /** Override the topic ID opened by "Keyboard Shortcuts". */
    shortcutsTopicId?: string;
    /** Override the topic ID opened by "Getting Started". */
    gettingStartedTopicId?: string | null;
}

let _installed = false;

export const installHelp = (options: InstallHelpOptions = {}) => {
    if (_installed) return;
    _installed = true;

    menu.register({
        id: 'help',
        slot: options.slot || 'right',
        order: options.order ?? 40,
        icon: QuestionIcon,
        title: 'Help & tips',
        align: 'end',
        width: 'w-60',
    });

    if (!options.hideTopicLinks) {
        menu.registerItem('help', {
            id: 'getting-started',
            type: 'button',
            label: 'Getting Started',
            icon: <BookIcon />,
            onSelect: () => {
                const s = useEngineStore.getState() as any;
                if (options.gettingStartedTopicId === null) s.openHelp?.();
                else s.openHelp?.(options.gettingStartedTopicId ?? undefined);
            },
        });
        menu.registerItem('help', {
            id: 'shortcuts',
            type: 'button',
            label: 'Keyboard Shortcuts',
            icon: <KeyIcon />,
            onSelect: () => {
                const s = useEngineStore.getState() as any;
                s.openHelp?.(options.shortcutsTopicId ?? 'general.shortcuts');
            },
        });
        menu.registerItem('help', { id: 'sep-topics', type: 'separator' });
    }

    menu.registerItem('help', {
        id: 'show-hints',
        type: 'toggle',
        label: 'Show Hints',
        shortcut: 'H',
        title: 'Show inline descriptions under every control',
        color: 'green',
        isActive: () => !!(useEngineStore.getState() as any).showHints,
        onToggle: () => {
            const s = useEngineStore.getState() as any;
            s.setShowHints?.(!s.showHints);
        },
    });

    (options.extraItems || []).forEach((item) => menu.registerItem('help', item));

    shortcuts.register({
        id: 'help.toggle-hints',
        key: 'H',
        description: 'Show / hide control hints',
        category: 'UI',
        handler: () => {
            const s = useEngineStore.getState() as any;
            s.setShowHints?.(!s.showHints);
        },
    });
};

export const uninstallHelp = () => {
    menu.unregister('help');
    shortcuts.unregister('help.toggle-hints');
    _installed = false;
};

// ── HUD hint registration ─────────────────────────────────────────────
//
// Apps can push a one-line shortcut / tip onto @engine/hud via the help
// plugin. The hint renders only while `showHints` is true, so the same
// H hotkey + "Show Hints" menu item that toggles inline param
// descriptions also toggles the HUD hint. This keeps "Hints" as one
// user-facing concept with one switch.
//
// Typical call from an app setup:
//
//   help.registerHudHint({
//     id: 'fluid-toy-controls',
//     slot: 'bottom-center',
//     keys: [
//       { key: 'Space', label: 'Pause' },
//       { key: 'R',     label: 'Reset' },
//       { key: 'H',     label: 'Hints' },
//     ],
//   });
//
// Or, for a custom layout, pass `component` instead of `keys`.

export interface HudHintKey {
    /** Key label shown in the pill. */
    key: string;
    /** Description shown after the pill. */
    label: string;
}

export interface HudHintConfig {
    id: string;
    /** HUD slot. Default 'bottom-center' — matches GMT's convention. */
    slot?: HudSlot;
    /** Ordering within the slot. Default 1000 so it sits below app widgets. */
    order?: number;
    /** Either an array of keys to render as pills, or a custom component. */
    keys?: HudHintKey[];
    component?: React.FC;
    /** Small lead-in badge, e.g. "[Fluid]". Defaults to none. */
    badge?: string;
}

const DefaultHudHint: React.FC<{ keys: HudHintKey[]; badge?: string }> = ({ keys, badge }) => {
    return (
        <div
            className="text-[10px] font-medium text-white/60 whitespace-nowrap pointer-events-none"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
            {badge && <span className="text-cyan-400/70 font-bold mr-2">{badge}</span>}
            {keys.map((k, i) => (
                <span key={`${k.key}-${i}`}>
                    {i > 0 && <span className="text-white/25 mx-1.5">·</span>}
                    <span className="inline-block px-1 py-px mr-1 border border-white/15 rounded bg-white/5 text-white/80 text-[9px] font-mono">{k.key}</span>
                    <span className="text-white/60">{k.label}</span>
                </span>
            ))}
        </div>
    );
};

const help = {
    /**
     * Register a HUD hint. Visibility is gated on `showHints` so the
     * same toggle that controls inline descriptions controls the HUD
     * line. Re-registering with the same id replaces the prior entry.
     */
    registerHudHint(config: HudHintConfig) {
        const { id, slot = 'bottom-center', order = 1000, keys, component, badge } = config;
        let Component: React.FC;
        if (component) {
            Component = component;
        } else if (keys && keys.length > 0) {
            Component = () => <DefaultHudHint keys={keys} badge={badge} />;
        } else {
            console.warn(`[@engine/help] registerHudHint(${id}) — supply either keys[] or component`);
            return;
        }
        hud.register({
            id: `help-hint:${id}`,
            slot,
            order,
            when: () => !!(useEngineStore.getState() as any).showHints,
            component: Component,
        });
    },
    unregisterHudHint(id: string) {
        hud.unregister(`help-hint:${id}`);
    },
};

export { help };

// ── Overlay ────────────────────────────────────────────────────────────

/**
 * Renders the HelpBrowser when `helpWindow.visible` is true. Mount this
 * once near the root of the app — typical spot is next to GlobalContextMenu.
 * Returns null when closed; the lazy chunk is only fetched on first open.
 */
export const HelpOverlay: React.FC = () => {
    const visible       = useEngineStore((s: any) => s.helpWindow?.visible);
    const activeTopicId = useEngineStore((s: any) => s.helpWindow?.activeTopicId);
    const openHelp      = useEngineStore((s: any) => s.openHelp);
    const closeHelp     = useEngineStore((s: any) => s.closeHelp);

    if (!visible) return null;
    return (
        <Suspense fallback={null}>
            <HelpBrowser
                activeTopicId={activeTopicId ?? null}
                onClose={closeHelp}
                onNavigate={openHelp}
            />
        </Suspense>
    );
};
