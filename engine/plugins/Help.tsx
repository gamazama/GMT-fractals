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

import React, { Suspense, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../../store/engineStore';
import { menu, MenuItem } from './Menu';
import { shortcuts } from './Shortcuts';
import { hud, type HudSlot } from './Hud';
import { listLessons, subscribeLessons, type TutorialLesson } from './Tutorial';

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

const HeartIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const SmileyIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
);

// ── Support / About item bodies ────────────────────────────────────────

const renderBody = (body: React.ReactNode | React.FC): React.ReactNode => {
    if (typeof body === 'function') {
        const Body = body as React.FC;
        return <Body />;
    }
    return body;
};

const ACCENT_TEXT: Record<'pink' | 'cyan' | 'purple', string> = {
    pink: 'text-pink-300',
    cyan: 'text-cyan-300',
    purple: 'text-purple-300',
};
const ACCENT_HOVER: Record<'pink' | 'cyan' | 'purple', string> = {
    pink: 'hover:bg-pink-500/10 text-pink-300/80 group-hover:text-pink-200',
    cyan: 'hover:bg-cyan-500/10 text-cyan-300/80 group-hover:text-cyan-200',
    purple: 'hover:bg-purple-500/10 text-purple-300/80 group-hover:text-purple-200',
};

// ── Support modal — module singleton ───────────────────────────────────
//
// The modal can't live inside the menu popover: the popover unmounts as
// soon as a menu item is clicked, which also unmounts the item's React
// state. So we lift the modal state to a module singleton and render it
// from <HelpOverlay /> (mounted at the app root) where lifecycle is
// independent of the menu.

interface SupportModalState {
    modalTitle: string;
    intro?: string;
    body: React.ReactNode | React.FC;
    accent: 'pink' | 'cyan' | 'purple';
}

let _supportModal: SupportModalState | null = null;
const _supportSubs = new Set<() => void>();
const _supportSnapshot = () => _supportModal;
const _supportSubscribe = (fn: () => void) => { _supportSubs.add(fn); return () => { _supportSubs.delete(fn); }; };
const _setSupportModal = (m: SupportModalState | null) => { _supportModal = m; _supportSubs.forEach((fn) => fn()); };

interface SupportItemProps {
    label: string;
    modalTitle: string;
    intro?: string;
    body: React.ReactNode | React.FC;
    accent: 'pink' | 'cyan' | 'purple';
    onAfterOpen: () => void;
}

const SupportItem: React.FC<SupportItemProps> = ({ label, modalTitle, intro, body, accent, onAfterOpen }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            _setSupportModal({ modalTitle, intro, body, accent });
            onAfterOpen();
        }}
        className={`group w-full flex items-center justify-between p-2 rounded transition-colors ${ACCENT_HOVER[accent]}`}
    >
        <span className="text-xs font-bold">{label}</span>
        <HeartIcon />
    </button>
);

const SupportModalHost: React.FC = () => {
    const m = React.useSyncExternalStore(_supportSubscribe, _supportSnapshot, _supportSnapshot);
    if (!m) return null;
    const close = () => _setSupportModal(null);
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={close}>
            <div className="bg-gray-900 border border-white/10 rounded-lg p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <div className={`text-xs font-bold ${ACCENT_TEXT[m.accent]}`}>{m.modalTitle}</div>
                    <button onClick={close} className="text-gray-500 hover:text-white transition-colors text-sm leading-none">&times;</button>
                </div>
                {m.intro && (
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-4">{m.intro}</p>
                )}
                {renderBody(m.body)}
            </div>
        </div>,
        document.body,
    );
};

interface AboutItemProps {
    label: string;
    body: React.ReactNode | React.FC;
}

const AboutItem: React.FC<AboutItemProps> = ({ label, body }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                className={`w-full flex items-center justify-between p-2 rounded transition-colors ${open ? 'bg-white/10 text-cyan-400' : 'hover:bg-white/5 text-gray-300'}`}
            >
                <span className="text-xs font-bold">{label}</span>
                <SmileyIcon />
            </button>
            {open && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 mt-1">
                    {renderBody(body)}
                </div>
            )}
        </>
    );
};

// ── Tutorials list ─────────────────────────────────────────────────────

const CheckIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const TutorialsList: React.FC<{ close: () => void; lessonIds?: number[] }> = ({ close, lessonIds }) => {
    // Re-render when lessons change.
    useSyncExternalStore(subscribeLessons, () => listLessons().length, () => 0);
    const completed = useEngineStore((s: any) => s.tutorialCompleted) as number[] | undefined;
    const startTutorial = useEngineStore((s: any) => s.startTutorial);

    const all = listLessons();
    const filtered: TutorialLesson[] = lessonIds
        ? lessonIds.map((id) => all.find((l) => l.id === id)).filter(Boolean) as TutorialLesson[]
        : all;

    if (filtered.length === 0) {
        return <div className="px-2 py-1 text-[10px] text-gray-600 italic">(no tutorials registered)</div>;
    }

    return (
        <>
            {filtered.map((lesson) => {
                const done = (completed ?? []).includes(lesson.id);
                return (
                    <button
                        key={lesson.id}
                        onClick={(e) => { e.stopPropagation(); startTutorial(lesson.id); close(); }}
                        className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group"
                    >
                        <span className="text-xs font-bold group-hover:text-cyan-400">
                            Lesson {lesson.id}: {lesson.title}
                        </span>
                        {done && <CheckIcon />}
                    </button>
                );
            })}
        </>
    );
};

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
    /** Adds a Tutorials section with one button per registered lesson and
     *  a live completion checkmark from `tutorialCompleted` in the store.
     *  Lessons must be registered separately via `registerLessons(...)` from
     *  the Tutorial plugin — this option only controls menu surfacing. */
    tutorials?: TutorialsConfig;
    /** Adds a "Support" entry that opens a modal with app-supplied body
     *  (e.g. donate buttons). The plugin owns the menu item, heart icon,
     *  and modal scaffold; the app owns the body content. */
    support?: SupportConfig;
    /** Adds an "About" entry that expands inline within the menu popover
     *  to show app-supplied content (version, credits, links, …). */
    about?: AboutConfig;
}

export interface TutorialsConfig {
    /** Section header label. Default 'Tutorials'. */
    label?: string;
    /** Optionally restrict to a subset / specific order. Defaults to all
     *  registered lessons sorted by id. */
    lessonIds?: number[];
}

export interface SupportConfig {
    /** Menu item label. Default 'Support'. */
    label?: string;
    /** Modal header title. Default mirrors `label`. */
    modalTitle?: string;
    /** Optional intro paragraph rendered above the body. */
    intro?: string;
    /** Body content — typically donate buttons. FC or node. */
    body: React.ReactNode | React.FC;
    /** Accent color for label + modal title. Default 'pink'. */
    accent?: 'pink' | 'cyan' | 'purple';
}

export interface AboutConfig {
    /** Menu item label. Default 'About'. */
    label?: string;
    /** Body content — version, credits, links, tech stack, etc.
     *  Rendered inline (collapsible) inside the menu popover. */
    body: React.ReactNode | React.FC;
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

    if (options.tutorials) {
        const cfg = options.tutorials;
        const sectionLabel = cfg.label ?? 'Tutorials';

        // Register a single 'custom' item that renders the live lesson list.
        // Using one custom slot avoids re-registering N items every time
        // lessons mutate or completion state changes.
        menu.registerItem('help', { id: 'sep-tutorials', type: 'separator' });
        menu.registerItem('help', { id: 'tutorials-section', type: 'section', label: sectionLabel });
        menu.registerItem('help', {
            id: 'tutorials-list',
            type: 'custom',
            component: ({ close }) => <TutorialsList close={close} lessonIds={cfg.lessonIds} />,
        });
    }

    if (options.support || options.about) {
        menu.registerItem('help', { id: 'sep-app', type: 'separator' });
    }

    if (options.support) {
        const cfg = options.support;
        const accent = cfg.accent ?? 'pink';
        menu.registerItem('help', {
            id: 'support',
            type: 'custom',
            component: ({ close }) => (
                <SupportItem
                    label={cfg.label ?? 'Support'}
                    modalTitle={cfg.modalTitle ?? cfg.label ?? 'Support'}
                    intro={cfg.intro}
                    body={cfg.body}
                    accent={accent}
                    onAfterOpen={close}
                />
            ),
        });
    }

    if (options.about) {
        const cfg = options.about;
        menu.registerItem('help', {
            id: 'about',
            type: 'custom',
            component: () => <AboutItem label={cfg.label ?? 'About'} body={cfg.body} />,
        });
    }

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
 * Renders the HelpBrowser when `helpWindow.visible` is true, plus the
 * Support modal host (lifecycle-independent of the menu popover so the
 * modal survives the menu closing on item-click). Mount this once near
 * the root of the app — typical spot is next to GlobalContextMenu.
 */
export const HelpOverlay: React.FC = () => {
    const visible       = useEngineStore((s: any) => s.helpWindow?.visible);
    const activeTopicId = useEngineStore((s: any) => s.helpWindow?.activeTopicId);
    const openHelp      = useEngineStore((s: any) => s.openHelp);
    const closeHelp     = useEngineStore((s: any) => s.closeHelp);

    return (
        <>
            {visible && (
                <Suspense fallback={null}>
                    <HelpBrowser
                        activeTopicId={activeTopicId ?? null}
                        onClose={closeHelp}
                        onNavigate={openHelp}
                    />
                </Suspense>
            )}
            <SupportModalHost />
        </>
    );
};
